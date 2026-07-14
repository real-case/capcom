import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AnalyticsEvent } from "@/entities/event";

import messages from "../../../../messages/en.json";

// Mock the data layer only — the REAL hooks run, so the test exercises the query wiring
// (queryKey + fetcher call + nuqs round-trip), not a stub of it. `importOriginal` keeps
// the entity types the widget/url-state depend on (ADR 0017). The report-actions
// feature is a "use server" module (its Supabase server client imports `server-only`),
// so it is replaced wholesale under jsdom — the same posture as the dashboards tests.
const {
  fetchEvents,
  fetchEventsFacets,
  fetchEventsSummary,
  fetchProfile,
  fetchReports,
  createReport,
} = vi.hoisted(() => ({
  fetchEvents: vi.fn(),
  fetchEventsFacets: vi.fn(),
  fetchEventsSummary: vi.fn(),
  fetchProfile: vi.fn(),
  fetchReports: vi.fn(),
  createReport: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/event")>()),
  fetchEvents,
  fetchEventsFacets,
  fetchEventsSummary,
}));
vi.mock("@/entities/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/profile")>()),
  fetchProfile,
}));
vi.mock("@/entities/report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/report")>()),
  fetchReports,
}));
vi.mock("@/features/report-actions", () => ({ createReport }));

import { EventsExplorer } from "./EventsExplorer";

const ROW: AnalyticsEvent = {
  id: "e1",
  project_id: "p1",
  event_name: "purchase",
  distinct_id: "aurora-web_u0130",
  properties: { plan: "pro", country: "US", device: "desktop", amount: 149 },
  ts: "2026-07-07T14:32:00.000Z",
  created_at: "2026-07-07T14:32:00.000Z",
};

function renderExplorer(
  onUrlUpdate: (e: UrlUpdateEvent) => void,
  searchParams?: Record<string, string>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} searchParams={searchParams}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <EventsExplorer projectId="p1" />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </NuqsTestingAdapter>,
  );
}

describe("EventsExplorer", () => {
  beforeEach(() => {
    fetchEvents.mockReset().mockResolvedValue([ROW]);
    fetchEventsSummary.mockReset().mockResolvedValue({
      total_events: 3942,
      distinct_users: 1842,
      value_sum: 41980,
    });
    fetchProfile.mockReset().mockResolvedValue(null);
    fetchEventsFacets.mockReset().mockResolvedValue([
      { value: "pro", count: 5 },
      { value: "free", count: 3 },
    ]);
    fetchReports.mockReset().mockResolvedValue([]);
    createReport.mockReset();
  });

  it("pages events and reduces the summary in the database (footer), not in JS", async () => {
    renderExplorer(vi.fn());

    // The page fetcher runs with the default window + the empty filter + the default sort;
    // the summary RPC gets the bare project bag (empty filter → no predicate args).
    await waitFor(() =>
      expect(fetchEvents).toHaveBeenCalledWith(expect.anything(), "p1", {
        offset: 0,
        limit: 10,
        filter: {
          search: "",
          events: [],
          plans: [],
          countries: [],
          devices: [],
        },
        sort: [{ column: "ts", desc: true }],
      }),
    );
    expect(fetchEventsSummary).toHaveBeenCalledWith(expect.anything(), {
      p_project_id: "p1",
    });

    // The row and the DB-reduced footer render (never a client-side reduce, ADR 0084).
    expect(await screen.findByText("purchase")).toBeInTheDocument();
    expect(
      await screen.findByText("Σ 3,942 events · 1,842 distinct users"),
    ).toBeInTheDocument();
  });

  it("expands a row → writes ?expanded to the URL and fetches that user's detail (RLS reads)", async () => {
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate);
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    const toggles = await screen.findAllByRole("button", {
      name: "Toggle event detail",
    });
    await userEvent.click(toggles[0]!);

    // URL state round-trips (ADR 0027) — a shareable, deep-linkable open row.
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("expanded")).toBe("e1");

    // The detail fetch is scoped to the expanded row's user (a separate RLS read).
    await waitFor(() =>
      expect(fetchProfile).toHaveBeenCalledWith(
        expect.anything(),
        "p1",
        "aurora-web_u0130",
      ),
    );
    await waitFor(() =>
      expect(fetchEvents).toHaveBeenCalledWith(expect.anything(), "p1", {
        distinctId: "aurora-web_u0130",
        limit: 6,
      }),
    );
  });

  it("hydrates a filtered/sorted shared link into the fetch + summary args (ADR 0027)", async () => {
    renderExplorer(vi.fn(), {
      filter: JSON.stringify({ plans: ["pro"], search: "buy" }),
      sort: JSON.stringify([{ id: "event", desc: false }]),
    });

    // The URL's closed filter maps to parameterized fetch args; the sort maps to the DB column.
    await waitFor(() =>
      expect(fetchEvents).toHaveBeenCalledWith(expect.anything(), "p1", {
        offset: 0,
        limit: 10,
        filter: {
          search: "buy",
          events: [],
          plans: ["pro"],
          countries: [],
          devices: [],
        },
        sort: [{ column: "event_name", desc: false }],
      }),
    );
    // The footer summary is reduced in the DB over the SAME filter (ADR 0084), not in JS.
    expect(fetchEventsSummary).toHaveBeenCalledWith(expect.anything(), {
      p_project_id: "p1",
      p_search: "buy",
      p_plans: ["pro"],
    });
  });

  it("selects rows locally (never the URL, ADR 0026) and view-user opens ?expanded", async () => {
    // Typed mock so the recorded calls carry UrlUpdateEvent — no cast needed below.
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    renderExplorer(onUrlUpdate);
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    await userEvent.click(
      await screen.findByRole("checkbox", { name: "Select purchase" }),
    );

    // The bulk bar reflects the selection; the selection wrote NOTHING to the URL —
    // it is ephemeral local view-state, not a shareable view (ADR 0026/0027).
    expect(await screen.findByText("1 selected")).toBeInTheDocument();
    expect(onUrlUpdate).not.toHaveBeenCalled();

    // Read-only bulk actions only: deep-links + export, never a mutation (ADR 0083).
    expect(
      screen.getByRole("link", { name: "Add to segment" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();

    // View user resolves to the events surface's own user-detail URL-state.
    await userEvent.click(screen.getByRole("button", { name: "View user" }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0];
    expect(last.searchParams.get("expanded")).toBe("e1");

    // Clearing the selection dismisses the bar.
    await userEvent.click(
      screen.getByRole("button", { name: "Clear selection" }),
    );
    await waitFor(() => expect(screen.queryByText("1 selected")).toBeNull());
  });

  it("advances the page through the URL (shareable pagination)", async () => {
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate);
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("page")).toBe("2");
  });

  it("opens a saved view: hydrates its config through the grammar and stamps ?view (ADR 0098)", async () => {
    fetchReports.mockResolvedValue([
      {
        id: "r1",
        project_id: "p1",
        owner_id: null,
        name: "Pro purchases",
        kind: "events",
        config: {
          filter: {
            ...{ search: "", events: [], countries: [], devices: [] },
            plans: ["pro"],
          },
          sort: [{ id: "event", desc: false }],
          pageSize: 25,
          density: "dense",
          groupBy: "none",
          hidden: ["properties"],
        },
        created_at: "2026-07-09T00:00:00.000Z",
        updated_at: "2026-07-09T00:00:00.000Z",
      },
      // A non-events report never becomes a tab.
      {
        id: "r2",
        project_id: "p1",
        owner_id: null,
        name: "Signups trend",
        kind: "trends",
        config: {},
        created_at: "2026-07-09T00:00:00.000Z",
        updated_at: "2026-07-09T00:00:00.000Z",
      },
    ]);
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate);

    const tab = await screen.findByRole("button", { name: "Pro purchases" });
    expect(screen.queryByRole("button", { name: "Signups trend" })).toBeNull();
    await userEvent.click(tab);

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("view")).toBe("r1");
    expect(JSON.parse(last.searchParams.get("filter")!)).toMatchObject({
      plans: ["pro"],
    });
    expect(last.searchParams.get("pageSize")).toBe("25");
    expect(last.searchParams.get("density")).toBe("dense");
    expect(JSON.parse(last.searchParams.get("hidden")!)).toEqual([
      "properties",
    ]);
  });

  it("saves the current view as an events report and activates it (ADR 0098/0090)", async () => {
    createReport.mockResolvedValue({
      ok: true,
      report: {
        id: "r9",
        project_id: "p1",
        owner_id: "u1",
        name: "My view",
        kind: "events",
        config: {},
        created_at: "2026-07-10T00:00:00.000Z",
        updated_at: "2026-07-10T00:00:00.000Z",
      },
    });
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate);
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Save view" }));
    await userEvent.type(
      await screen.findByRole("textbox", { name: "View name" }),
      "My view",
    );
    await userEvent.click(screen.getByRole("button", { name: "Save" }));

    // The Server Action gets the PERSISTABLE slice only (no page/expanded/view).
    await waitFor(() =>
      expect(createReport).toHaveBeenCalledWith({
        projectId: "p1",
        name: "My view",
        kind: "events",
        config: {
          filter: {
            search: "",
            events: [],
            plans: [],
            countries: [],
            devices: [],
          },
          sort: [{ id: "time", desc: true }],
          pageSize: 10,
          density: "comfortable",
          groupBy: "none",
          hidden: [],
        },
      }),
    );
    // The saved view becomes the active tab via ?view (server truth id).
    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
      expect(last.searchParams.get("view")).toBe("r9");
    });
  });

  it("group-by swaps in the in-database roll-up; picking a value filters and returns (ADR 0098/0084)", async () => {
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate, { groupBy: "plan" });

    // The roll-up rows come from fn_events_facets — never a client-side tally.
    await waitFor(() =>
      expect(fetchEventsFacets).toHaveBeenCalledWith(expect.anything(), {
        p_project_id: "p1",
        p_dimension: "plan",
      }),
    );
    expect(await screen.findByText("pro")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    // The raw-row grid is swapped out while grouped.
    expect(screen.queryByRole("table")).toBeNull();

    await userEvent.click(
      screen.getByRole("button", { name: "Filter by pro" }),
    );
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(JSON.parse(last.searchParams.get("filter")!)).toMatchObject({
      plans: ["pro"],
    });
    // Returning to the row grid = groupBy back to its default (absent from the URL).
    expect(last.searchParams.get("groupBy")).toBeNull();
  });

  it("the group-by and columns menus write their URL-state (ADR 0098/0027)", async () => {
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate);
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    // Group by → Plan.
    await userEvent.click(screen.getByRole("button", { name: "Group by" }));
    await userEvent.click(
      await screen.findByRole("menuitemradio", { name: "Plan" }),
    );
    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
      expect(last.searchParams.get("groupBy")).toBe("plan");
    });

    // Columns → hide Plan (the menu shows the hideable set as checked items).
    await userEvent.click(screen.getByRole("button", { name: /Columns/ }));
    await userEvent.click(
      await screen.findByRole("menuitemcheckbox", { name: "Plan" }),
    );
    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
      expect(JSON.parse(last.searchParams.get("hidden")!)).toEqual(["plan"]);
    });
  });

  it("preserves density and page-reset behaviour after the re-skin", async () => {
    // The mission-control re-skin (ADR 0099) is presentational only — the 0097/0098
    // contract is untouched: dense density is still the [data-density] attribute on the
    // widget root (ADR 0082/0098), and a filter change still resets to page 1.
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const { container } = renderExplorer(onUrlUpdate, {
      density: "dense",
      page: "3",
      filter: JSON.stringify({ plans: ["pro"] }),
    });
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    // Density is applied as the ADR 0082 dimension attribute, not per-component padding.
    expect(container.querySelector('[data-density="dense"]')).not.toBeNull();

    // Clearing the active filter resets the pager from page 3 back to its default (page 1,
    // which nuqs omits from the URL) — while the unrelated density stays dense.
    await userEvent.click(screen.getByRole("button", { name: "Clear all" }));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("page")).toBeNull();
    expect(last.searchParams.get("density")).toBe("dense");
  });
});

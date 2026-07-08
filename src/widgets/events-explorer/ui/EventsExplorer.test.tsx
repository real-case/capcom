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
// the entity types the widget/url-state depend on (ADR 0017).
const { fetchEvents, fetchEventsSummary, fetchProfile } = vi.hoisted(() => ({
  fetchEvents: vi.fn(),
  fetchEventsSummary: vi.fn(),
  fetchProfile: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/event")>()),
  fetchEvents,
  fetchEventsSummary,
}));
vi.mock("@/entities/profile", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/profile")>()),
  fetchProfile,
}));

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
  });

  it("pages events and reduces the summary in the database (footer), not in JS", async () => {
    renderExplorer(vi.fn());

    // The page fetcher runs with the default window, the summary RPC with the project bag.
    await waitFor(() =>
      expect(fetchEvents).toHaveBeenCalledWith(expect.anything(), "p1", {
        offset: 0,
        limit: 10,
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

  it("advances the page through the URL (shareable pagination)", async () => {
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate);
    await waitFor(() => expect(fetchEvents).toHaveBeenCalled());

    await userEvent.click(screen.getByRole("button", { name: "Next page" }));

    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("page")).toBe("2");
  });
});

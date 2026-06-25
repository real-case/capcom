import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

// Mock the data layer only — the REAL useEventTrends/useTopEvents hooks run, so the
// test exercises the query wiring (queryKey + fetcher call), not a stub of it.
const { fetchEventTrends, fetchTopEvents } = vi.hoisted(() => ({
  fetchEventTrends: vi.fn(),
  fetchTopEvents: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", () => ({ fetchEventTrends, fetchTopEvents }));

import { TrendsExplorer } from "./TrendsExplorer";

function renderExplorer(onUrlUpdate: (e: UrlUpdateEvent) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <TrendsExplorer projectId="p1" />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </NuqsTestingAdapter>,
  );
}

describe("TrendsExplorer", () => {
  beforeEach(() => {
    fetchEventTrends
      .mockReset()
      .mockResolvedValue([
        { bucket: "2026-06-01T00:00:00Z", series: "page_view", count: 12 },
      ]);
    fetchTopEvents.mockReset().mockResolvedValue([
      { event_name: "page_view", count: 42 },
      { event_name: "purchase", count: 9 },
    ]);
  });

  it("queries with the default URL state and renders the sections", async () => {
    renderExplorer(vi.fn());

    await waitFor(() => expect(fetchEventTrends).toHaveBeenCalled());
    // Default state (ADR 0027 defaults): page_view, day interval, no breakdown.
    const [, args] = fetchEventTrends.mock.calls[0]!;
    expect(args).toMatchObject({
      p_project_id: "p1",
      p_event_name: "page_view",
      p_interval: "day",
    });
    expect("p_breakdown_key" in args).toBe(false);

    // Top events populate the event picker.
    expect(
      await screen.findByRole("option", { name: "purchase" }),
    ).toBeInTheDocument();
  });

  it("writes the changed control to the URL and re-drives the query (AC5)", async () => {
    const onUrlUpdate = vi.fn();
    renderExplorer(onUrlUpdate);
    await waitFor(() => expect(fetchEventTrends).toHaveBeenCalled());
    fetchEventTrends.mockClear();

    await userEvent.selectOptions(screen.getByLabelText("Interval"), "week");

    // URL state round-trips (shareable link, ADR 0027) ...
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("interval")).toBe("week");

    // ... and the query re-runs with the new interval.
    await waitFor(() =>
      expect(fetchEventTrends).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ p_interval: "week" }),
      ),
    );
  });

  it("passes a breakdown key through when the breakdown control changes", async () => {
    renderExplorer(vi.fn());
    await waitFor(() => expect(fetchEventTrends).toHaveBeenCalled());
    fetchEventTrends.mockClear();

    await userEvent.selectOptions(screen.getByLabelText("Breakdown"), "device");

    await waitFor(() =>
      expect(fetchEventTrends).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ p_breakdown_key: "device" }),
      ),
    );
  });
});

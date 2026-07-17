import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type {
  EventTrendBucket,
  FunnelStep,
  OverviewKpis,
  OverviewSignalBucket,
} from "@/entities/event";
import type { SegmentScatterPoint } from "@/entities/segment";

import messages from "../../../../messages/en.json";

// Mock the data layer only — the REAL hooks + deriveKpis run, so the test exercises the query
// wiring (derived args + keys) and the presentation math, not a stub of it.
const {
  fetchOverviewKpis,
  fetchOverviewSignal,
  fetchEventTrends,
  fetchFunnel,
  fetchSegmentScatter,
} = vi.hoisted(() => ({
  fetchOverviewKpis: vi.fn(),
  fetchOverviewSignal: vi.fn(),
  fetchEventTrends: vi.fn(),
  fetchFunnel: vi.fn(),
  fetchSegmentScatter: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/event")>()),
  fetchOverviewKpis,
  fetchOverviewSignal,
  fetchEventTrends,
  fetchFunnel,
}));
vi.mock("@/entities/segment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/segment")>()),
  fetchSegmentScatter,
}));

import { OverviewDashboard } from "./OverviewDashboard";

const KPIS: OverviewKpis = {
  active_users: 108,
  active_users_prev: 56,
  new_signups: 45,
  new_signups_prev: 30,
  purchasers: 19,
  purchasers_prev: 11,
  value_sum: 1812,
  value_sum_prev: 916,
};
const DAY = Date.UTC(2026, 5, 1);
const TREND: EventTrendBucket[] = ["free", "pro"].flatMap((series) =>
  Array.from({ length: 6 }, (_, i) => ({
    bucket: new Date(DAY + i * 86_400_000).toISOString(),
    series,
    count: 20 + i,
  })),
);
const SIGNAL: OverviewSignalBucket[] = Array.from({ length: 6 }, (_, i) => ({
  bucket: new Date(DAY + i * 86_400_000).toISOString(),
  active_users: 40 + i,
  new_signups: 8 + i,
  value_sum: 120 + i,
  purchasers: 3 + i,
}));
const FUNNEL: FunnelStep[] = [
  { step_index: 0, step_event: "page_view", users: 1000 },
  { step_index: 1, step_event: "sign_up", users: 400 },
  { step_index: 2, step_event: "feature_used", users: 180 },
];
const SCATTER: SegmentScatterPoint[] = [
  { distinct_id: "u1", frequency: 12, ltv: 199, plan: "pro" },
];
const DAY_MS = 86_400_000;

function renderDashboard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NuqsTestingAdapter>
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <OverviewDashboard projectId="p1" />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </NuqsTestingAdapter>,
  );
}

describe("OverviewDashboard (bento)", () => {
  beforeEach(() => {
    fetchOverviewKpis.mockReset().mockResolvedValue(KPIS);
    fetchOverviewSignal.mockReset().mockResolvedValue(SIGNAL);
    fetchEventTrends.mockReset().mockResolvedValue(TREND);
    fetchFunnel.mockReset().mockResolvedValue(FUNNEL);
    fetchSegmentScatter.mockReset().mockResolvedValue(SCATTER);
  });

  it("drives every bento cell from the shared range with the derived arg bags", async () => {
    renderDashboard();
    await waitFor(() => expect(fetchEventTrends).toHaveBeenCalledTimes(2));

    // All bags share the one 30-day window, scoped to the project.
    const [, kpiArgs] = fetchOverviewKpis.mock.calls[0]!;
    expect(kpiArgs.p_project_id).toBe("p1");
    expect(
      new Date(kpiArgs.p_to).getTime() - new Date(kpiArgs.p_from).getTime(),
    ).toBe(30 * DAY_MS);

    // fn_event_trends drives BOTH the hero (page_view, daily) and the bars (sign_up, weekly),
    // each broken down by plan — no new SQL.
    const trendCalls = fetchEventTrends.mock.calls.map(([, a]) => a);
    const hero = trendCalls.find((a) => a.p_event_name === "page_view")!;
    const bars = trendCalls.find((a) => a.p_event_name === "sign_up")!;
    expect(hero.p_breakdown_key).toBe("plan");
    expect(hero.p_interval).toBe("day");
    expect(bars.p_breakdown_key).toBe("plan");
    expect(bars.p_interval).toBe("week");

    // The funnel carries the activation steps; the scatter shares the window.
    const [, funnelArgs] = fetchFunnel.mock.calls[0]!;
    expect(funnelArgs.p_steps).toEqual([
      "page_view",
      "sign_up",
      "feature_used",
    ]);
    const [, scatterArgs] = fetchSegmentScatter.mock.calls[0]!;
    expect(scatterArgs.p_from).toBe(kpiArgs.p_from);
  });

  it("renders the six reference bento cells and no standalone signal row", async () => {
    renderDashboard();
    // Hero headline (108) + the three mini labels + the goal / bars / funnel / scatter cells.
    expect(await screen.findByText("108")).toBeInTheDocument(); // hero value
    expect(await screen.findByText("New sign-ups")).toBeInTheDocument();
    expect(await screen.findByText("Conversion")).toBeInTheDocument();
    // "ARPU" appears twice — the mini label and the goal kv row.
    expect((await screen.findAllByText("ARPU")).length).toBeGreaterThanOrEqual(
      1,
    );
    expect(await screen.findByText("Goal pacing")).toBeInTheDocument();
    expect(await screen.findByText("Sign-ups by plan")).toBeInTheDocument();
    expect(await screen.findByText("Activation funnel")).toBeInTheDocument();
    expect(
      await screen.findByText("Segments · freq × LTV"),
    ).toBeInTheDocument();

    // The Phase-D standalone Signals section is gone (the sparklines moved into the minis).
    expect(screen.queryByText("Signals")).not.toBeInTheDocument();
  });

  it("renders the goal cell's target-free rows and never claims a target", async () => {
    renderDashboard();
    // The four target-free kv rows, from already-reduced scalars.
    expect(await screen.findByText("Revenue")).toBeInTheDocument();
    expect(await screen.findByText("Pace")).toBeInTheDocument();
    expect(await screen.findByText("Purchasers")).toBeInTheDocument();
    // No goals table exists, so nothing claims a "target".
    expect(screen.queryByText(/target/i)).not.toBeInTheDocument();
  });

  it("threads loading and error states through", async () => {
    renderDashboard();
    expect(screen.getAllByText("Loading…").length).toBeGreaterThan(0);

    fetchOverviewKpis.mockReset().mockRejectedValue(new Error("boom"));
    renderDashboard();
    await waitFor(() =>
      expect(
        screen.getAllByText("Couldn’t load this metric.").length,
      ).toBeGreaterThan(0),
    );
  });
});

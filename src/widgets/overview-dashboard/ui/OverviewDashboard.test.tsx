import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OverviewKpis } from "@/entities/event";

import messages from "../../../../messages/en.json";

// Mock the data layer only — the REAL hooks + deriveKpis run, so the test exercises the
// query wiring (derived args + keys) and the presentation math, not a stub of it
// (importOriginal keeps the entity types the widget depends on, ADR 0017).
const { fetchOverviewKpis, fetchOverviewSignal } = vi.hoisted(() => ({
  fetchOverviewKpis: vi.fn(),
  fetchOverviewSignal: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/event")>()),
  fetchOverviewKpis,
  fetchOverviewSignal,
}));

import { OverviewDashboard } from "./OverviewDashboard";

// A reduced KPIs row with across-the-board growth (matches the seeded Aurora window).
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

describe("OverviewDashboard", () => {
  beforeEach(() => {
    fetchOverviewKpis.mockReset().mockResolvedValue(KPIS);
    fetchOverviewSignal.mockReset().mockResolvedValue([]);
  });

  it("queries the KPI and signal RPCs with the derived window args", async () => {
    renderDashboard();

    await waitFor(() => expect(fetchOverviewKpis).toHaveBeenCalled());
    // The default range is 30d: the current window spans exactly 30 days, scoped to the
    // project — the window is derived, not hardcoded, so assert the span, not the dates.
    const [, kpiArgs] = fetchOverviewKpis.mock.calls[0]!;
    expect(kpiArgs.p_project_id).toBe("p1");
    expect(
      new Date(kpiArgs.p_to).getTime() - new Date(kpiArgs.p_from).getTime(),
    ).toBe(30 * DAY_MS);
    const [, signalArgs] = fetchOverviewSignal.mock.calls[0]!;
    expect(signalArgs.p_project_id).toBe("p1");
    expect(signalArgs.p_interval).toBe("day");
  });

  it("renders KPI values derived from the reduced row (no client re-aggregation)", async () => {
    renderDashboard();

    // Counts pass through; conversion = 19/108 = 17.6%; ARPU = 1812/108 ≈ $17;
    // pacing = 1812/916 ≈ 198% — all computed by deriveKpis from the RPC scalars.
    expect(await screen.findByText("108")).toBeInTheDocument();
    expect(await screen.findByText("45")).toBeInTheDocument();
    expect(await screen.findByText("17.6%")).toBeInTheDocument();
    expect(await screen.findByText("$17")).toBeInTheDocument();
    expect(await screen.findByText("198%")).toBeInTheDocument();
    // The favorable deltas render as signed percents (e.g. active users +93%).
    expect(await screen.findByText("+93%")).toBeInTheDocument();
  });

  it("threads the loading state to the cards before data resolves", () => {
    renderDashboard();
    // On first render the queries are pending → every card shows the loading copy.
    expect(screen.getAllByText("Loading…").length).toBeGreaterThan(0);
  });

  it("threads the error state to the cards when the KPI RPC fails", async () => {
    fetchOverviewKpis.mockReset().mockRejectedValue(new Error("boom"));
    renderDashboard();
    // The error copy surfaces as an alert in the cards (no crash, no swallow).
    expect(
      (await screen.findAllByText("Couldn’t load this metric.")).length,
    ).toBeGreaterThan(0);
  });

  it("threads the empty state (em dash) when the reductions are all zero", async () => {
    fetchOverviewKpis.mockReset().mockResolvedValue({
      active_users: 0,
      active_users_prev: 0,
      new_signups: 0,
      new_signups_prev: 0,
      purchasers: 0,
      purchasers_prev: 0,
      value_sum: 0,
      value_sum_prev: 0,
    } satisfies OverviewKpis);
    renderDashboard();
    // Zero denominators → conversion / ARPU / pacing render as em dashes.
    await waitFor(() =>
      expect(screen.getAllByText("—").length).toBeGreaterThan(0),
    );
  });
});

import { describe, expect, it } from "vitest";

import type { OverviewKpis } from "@/entities/event";

import {
  deriveGoalRows,
  deriveKpis,
  formatDelta,
  formatKpiValue,
  formatPacing,
  GOAL_ROWS,
  HERO_KPI,
  KPI_DESCRIPTORS,
  STACK_KPIS,
} from "./kpis";

// A realistic reduced row (matches the seeded Aurora window used in the e2e smoke test):
// growth across the board so every delta is positive.
const GROWTH: OverviewKpis = {
  active_users: 108,
  active_users_prev: 56,
  new_signups: 45,
  new_signups_prev: 30,
  purchasers: 19,
  purchasers_prev: 11,
  value_sum: 1812,
  value_sum_prev: 916,
};

describe("deriveKpis", () => {
  it("derives conversion, ARPU, deltas, and pacing and guards divide-by-zero", () => {
    const d = deriveKpis(GROWTH);

    // Counts pass through with a period-over-period delta.
    expect(d.activeUsers.value).toBe(108);
    expect(d.activeUsers.deltaRatio).toBeCloseTo((108 - 56) / 56);
    expect(d.newSignups.value).toBe(45);
    expect(d.newSignups.deltaRatio).toBeCloseTo((45 - 30) / 30);

    // Conversion = purchasers / active_users; its delta is the ratio-of-ratios vs _prev.
    expect(d.conversion.value).toBeCloseTo(19 / 108);
    const convPrev = 11 / 56;
    expect(d.conversion.deltaRatio).toBeCloseTo(
      (19 / 108 - convPrev) / convPrev,
    );

    // ARPU = value_sum / active_users; delta is likewise the ratio-of-ratios.
    expect(d.arpu.value).toBeCloseTo(1812 / 108);
    const arpuPrev = 916 / 56;
    expect(d.arpu.deltaRatio).toBeCloseTo((1812 / 108 - arpuPrev) / arpuPrev);

    // Pacing = current revenue / previous equal-span revenue.
    expect(d.pacing.ratio).toBeCloseTo(1812 / 916);
  });

  it("returns null (never NaN/Infinity) when a denominator is zero", () => {
    const empty: OverviewKpis = {
      active_users: 0,
      active_users_prev: 0,
      new_signups: 0,
      new_signups_prev: 0,
      purchasers: 0,
      purchasers_prev: 0,
      value_sum: 0,
      value_sum_prev: 0,
    };
    const d = deriveKpis(empty);
    expect(d.conversion.value).toBeNull(); // active_users == 0
    expect(d.arpu.value).toBeNull();
    expect(d.pacing.ratio).toBeNull(); // value_sum_prev == 0
    // A zero previous period makes every delta undefined, not Infinity.
    expect(d.activeUsers.deltaRatio).toBeNull();
    expect(d.conversion.deltaRatio).toBeNull();
    for (const v of Object.values(d)) {
      for (const n of Object.values(v)) {
        expect(Number.isFinite(n) || n === null).toBe(true);
      }
    }
  });

  it("produces a negative delta on decline", () => {
    const decline: OverviewKpis = {
      ...GROWTH,
      active_users: 40,
      active_users_prev: 80,
    };
    expect(deriveKpis(decline).activeUsers.deltaRatio).toBeLessThan(0);
  });
});

describe("formatters", () => {
  it("formats counts, percent, and currency, with an em dash for null", () => {
    expect(formatKpiValue(1234, "count", "en-US")).toBe("1,234");
    expect(formatKpiValue(0.176, "percent", "en-US")).toBe("17.6%");
    expect(formatKpiValue(16, "currency", "en-US")).toBe("$16");
    expect(formatKpiValue(null, "count", "en-US")).toBe("—");
  });

  it("formats a signed delta and pacing, with an em dash for null", () => {
    expect(formatDelta(0.12, "en-US")).toBe("+12%");
    expect(formatDelta(-0.08, "en-US")).toBe("-8%");
    expect(formatDelta(null, "en-US")).toBe("—");
    expect(formatPacing(1.06, "en-US")).toBe("106%");
    expect(formatPacing(null, "en-US")).toBe("—");
  });
});

describe("HERO_KPI / STACK_KPIS partition", () => {
  it("partitions the KpiId set with no overlap or omission", () => {
    const partition = [HERO_KPI.id, ...STACK_KPIS.map((d) => d.id)].sort();
    const all = KPI_DESCRIPTORS.map((d) => d.id).sort();
    expect(partition).toEqual(all);
    // No id appears in both HERO_KPI and STACK_KPIS.
    expect(STACK_KPIS.some((d) => d.id === HERO_KPI.id)).toBe(false);
  });

  it("maps each mini to a signal measure (new_signups column; conversion/arpu derived)", () => {
    expect(STACK_KPIS.map((d) => [d.id, d.signalMeasure])).toEqual([
      ["newSignups", "new_signups"],
      ["conversion", "conversion"],
      ["arpu", "arpu"],
    ]);
  });
});

describe("deriveGoalRows", () => {
  it("derives the four target-free rows from already-reduced scalars", () => {
    const g = deriveGoalRows(GROWTH);
    expect(g.revenue).toBe(1812);
    expect(g.pace).toBeCloseTo(1812 / 916);
    expect(g.purchasers).toBe(19);
    expect(g.arpu).toBeCloseTo(1812 / 108);
    expect(GOAL_ROWS.map((r) => r.id)).toEqual([
      "revenue",
      "pace",
      "purchasers",
      "arpu",
    ]);
  });

  it("guards a zero denominator to null (no NaN/Infinity)", () => {
    const zero = { ...GROWTH, active_users: 0, value_sum_prev: 0 };
    const g = deriveGoalRows(zero);
    expect(g.pace).toBeNull();
    expect(g.arpu).toBeNull();
  });
});

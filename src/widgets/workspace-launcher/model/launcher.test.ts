import { describe, expect, it } from "vitest";

import type { OverviewKpis, OverviewSignalBucket } from "@/entities/event";

import {
  deriveLauncherMetric,
  formatDelta,
  formatMetricValue,
  lastActiveDaysAgo,
} from "./launcher";

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

/** A daily series builder — one bucket per day from a UTC start, with the given actives. */
function series(
  startUtcDay: number,
  actives: number[],
): OverviewSignalBucket[] {
  return actives.map((active_users, i) => ({
    bucket: new Date(startUtcDay + i * 86_400_000).toISOString(),
    active_users,
    new_signups: 0,
    value_sum: 0,
    purchasers: 0,
  }));
}

const JUN_1 = Date.UTC(2026, 5, 1);
const JUN_11_NOON = new Date(Date.UTC(2026, 5, 11, 12));

describe("deriveLauncherMetric + lastActiveDaysAgo", () => {
  it("derives the headline metric, a null-guarded delta, and days since the last active bucket", () => {
    const metric = deriveLauncherMetric(KPIS);
    expect(metric.value).toBe(108);
    expect(metric.deltaRatio).toBeCloseTo((108 - 56) / 56);

    // 10 daily buckets Jun 1–10; active only through Jun 7, then three trailing ZERO days.
    // The answer must be measured from the last ACTIVE bucket (Jun 7), not the last ROW
    // (Jun 10). now = Jun 11 → Jun 7 is 4 whole UTC days ago.
    const signal = series(JUN_1, [5, 6, 7, 8, 9, 10, 11, 0, 0, 0]);
    expect(lastActiveDaysAgo(signal, JUN_11_NOON)).toBe(4);
  });

  it("guards a zero previous window to null (never NaN or Infinity)", () => {
    const metric = deriveLauncherMetric({ ...KPIS, active_users_prev: 0 });
    expect(metric.deltaRatio).toBeNull();
    expect(metric.value).toBe(KPIS.active_users);
  });

  it("returns a negative delta when the metric fell", () => {
    const metric = deriveLauncherMetric({
      ...KPIS,
      active_users: 40,
      active_users_prev: 50,
    });
    expect(metric.deltaRatio).toBeCloseTo((40 - 50) / 50);
    expect(metric.deltaRatio).toBeLessThan(0);
  });

  it("reads the last active bucket regardless of array order", () => {
    // Jun 5 is the latest active bucket but appears first in the array.
    const unordered: OverviewSignalBucket[] = [
      ...series(Date.UTC(2026, 5, 5), [3]),
      ...series(JUN_1, [4, 0, 0]),
    ];
    expect(lastActiveDaysAgo(unordered, JUN_11_NOON)).toBe(6);
  });

  it("counts an active bucket dated today as 0 days ago", () => {
    const signal = series(Date.UTC(2026, 5, 11), [9]);
    expect(lastActiveDaysAgo(signal, JUN_11_NOON)).toBe(0);
  });

  it("returns null for an empty or all-zero series (no activity in the window)", () => {
    expect(lastActiveDaysAgo([], JUN_11_NOON)).toBeNull();
    expect(
      lastActiveDaysAgo(series(JUN_1, [0, 0, 0, 0]), JUN_11_NOON),
    ).toBeNull();
  });
});

describe("formatting", () => {
  it("formats the count and a signed-percent delta, with an em dash for a null delta", () => {
    expect(formatMetricValue(1234, "en-US")).toBe("1,234");
    expect(formatDelta((108 - 56) / 56, "en-US")).toBe("+93%");
    expect(formatDelta(-0.1, "en-US")).toBe("-10%");
    expect(formatDelta(null, "en-US")).toBe("—");
  });
});

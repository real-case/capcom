import { describe, expect, it } from "vitest";

import {
  DEFAULT_RANGE,
  overviewRangeSchema,
  resolveWindow,
  signalInterval,
  toKpisArgs,
  toSignalArgs,
} from "./window";

const DAY_MS = 86_400_000;
// A fixed clock so the window resolution is deterministic (mid-day, to prove `to` floors up).
const NOW = new Date("2026-07-14T15:30:00.000Z");

describe("resolveWindow", () => {
  it("floors `to` to the next UTC midnight and spans exactly the range length", () => {
    for (const [range, days] of [
      ["7d", 7],
      ["30d", 30],
      ["90d", 90],
    ] as const) {
      const { from, to } = resolveWindow(range, NOW);
      // `to` is the next UTC midnight after NOW → 2026-07-15T00:00:00Z, stable within the day.
      expect(to).toBe("2026-07-15T00:00:00.000Z");
      // The current window spans exactly the range length (so the SQL `_prev` window is the
      // equal-length adjacent span).
      expect(new Date(to).getTime() - new Date(from).getTime()).toBe(
        days * DAY_MS,
      );
    }
  });
});

describe("signalInterval", () => {
  it("buckets short ranges by day and 90d by week", () => {
    expect(signalInterval("7d")).toBe("day");
    expect(signalInterval("30d")).toBe("day");
    expect(signalInterval("90d")).toBe("week");
  });
});

describe("toKpisArgs / toSignalArgs", () => {
  it("emit the exact typed KPI argument bag (project + window)", () => {
    expect(toKpisArgs("30d", "proj-42", NOW)).toEqual({
      p_project_id: "proj-42",
      p_from: "2026-06-15T00:00:00.000Z",
      p_to: "2026-07-15T00:00:00.000Z",
    });
  });

  it("emit the exact typed signal argument bag (window + interval)", () => {
    expect(toSignalArgs("90d", "proj-42", NOW)).toEqual({
      p_project_id: "proj-42",
      p_from: "2026-04-16T00:00:00.000Z",
      p_to: "2026-07-15T00:00:00.000Z",
      p_interval: "week",
    });
  });
});

describe("overviewRangeSchema", () => {
  it("accepts a valid range and falls back to the default for a bad URL value", () => {
    expect(overviewRangeSchema.parse("7d")).toBe("7d");
    expect(overviewRangeSchema.parse("90d")).toBe("90d");
    expect(overviewRangeSchema.parse("nonsense")).toBe(DEFAULT_RANGE);
    expect(overviewRangeSchema.parse(undefined)).toBe(DEFAULT_RANGE);
  });
});

import { describe, expect, it } from "vitest";

import {
  DEFAULT_RETENTION_QUERY,
  resolveWindow,
  retentionQuerySchema,
  toRetentionArgs,
  type RetentionQuery,
} from "./url-state";

// A fixed clock so window resolution is deterministic (no live Date in assertions).
const NOW = new Date("2026-06-25T09:30:00.000Z");

describe("retentionQuerySchema", () => {
  it("accepts the defaults", () => {
    expect(retentionQuerySchema.parse(DEFAULT_RETENTION_QUERY)).toEqual(
      DEFAULT_RETENTION_QUERY,
    );
  });

  it("rejects an unknown range and an unknown period", () => {
    expect(() =>
      retentionQuerySchema.parse({ ...DEFAULT_RETENTION_QUERY, range: "7d" }),
    ).toThrow();
    expect(() =>
      retentionQuerySchema.parse({ ...DEFAULT_RETENTION_QUERY, period: "day" }),
    ).toThrow();
  });
});

describe("resolveWindow", () => {
  it("floors `to` to the next UTC midnight so the window is stable within a day", () => {
    const a = resolveWindow("90d", new Date("2026-06-25T09:30:00.000Z"));
    const b = resolveWindow("90d", new Date("2026-06-25T22:15:00.000Z"));
    expect(a).toEqual(b); // same calendar day → identical window → stable query key
    expect(a.to).toBe("2026-06-26T00:00:00.000Z");
  });

  it("spans exactly the requested number of days", () => {
    expect(resolveWindow("30d", NOW).from).toBe("2026-05-27T00:00:00.000Z");
    expect(resolveWindow("90d", NOW).from).toBe("2026-03-28T00:00:00.000Z");
    expect(resolveWindow("180d", NOW).from).toBe("2025-12-28T00:00:00.000Z");
  });
});

describe("toRetentionArgs", () => {
  it("round-trips the range and period into the RPC argument bag", () => {
    const query: RetentionQuery = { range: "30d", period: "month" };
    const args = toRetentionArgs(query, "proj-1", NOW);
    expect(args).toEqual({
      p_project_id: "proj-1",
      p_from: "2026-05-27T00:00:00.000Z",
      p_to: "2026-06-26T00:00:00.000Z",
      p_period: "month",
    });
  });

  it("passes the period through verbatim (the SQL date_trunc unit)", () => {
    const periodFor = (period: RetentionQuery["period"]) =>
      toRetentionArgs({ ...DEFAULT_RETENTION_QUERY, period }, "proj-1", NOW)
        .p_period;
    expect(periodFor("week")).toBe("week");
    expect(periodFor("month")).toBe("month");
  });
});

import { describe, expect, it } from "vitest";

import {
  DEFAULT_RULE,
  DEFAULT_SEGMENT_QUERY,
  resolveWindow,
  segmentQuerySchema,
  toSegmentDistributionArgs,
  toSegmentSizeArgs,
  type SegmentQuery,
} from "./url-state";

// A fixed clock so window resolution is deterministic (no live Date in assertions).
const NOW = new Date("2026-06-25T09:30:00.000Z");

describe("segmentQuerySchema", () => {
  it("accepts the defaults", () => {
    expect(segmentQuerySchema.parse(DEFAULT_SEGMENT_QUERY)).toEqual(
      DEFAULT_SEGMENT_QUERY,
    );
  });

  it("rejects an unknown range and an unknown dimension", () => {
    expect(() =>
      segmentQuerySchema.parse({ ...DEFAULT_SEGMENT_QUERY, range: "7d" }),
    ).toThrow();
    expect(() =>
      segmentQuerySchema.parse({ ...DEFAULT_SEGMENT_QUERY, dimension: "city" }),
    ).toThrow();
  });

  it("validates the embedded rule (a malformed predicate is rejected)", () => {
    expect(() =>
      segmentQuerySchema.parse({
        ...DEFAULT_SEGMENT_QUERY,
        rule: { attributes: [{ key: "plan", op: "between", value: "pro" }] },
      }),
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

describe("toSegmentSizeArgs", () => {
  it("round-trips the rule and range into the fn_segment_size argument bag", () => {
    const args = toSegmentSizeArgs(DEFAULT_SEGMENT_QUERY, "proj-1", NOW);
    expect(args).toEqual({
      p_project_id: "proj-1",
      p_rule: DEFAULT_RULE,
      p_from: "2026-03-28T00:00:00.000Z",
      p_to: "2026-06-26T00:00:00.000Z",
    });
  });
});

describe("toSegmentDistributionArgs", () => {
  it("adds the dimension to the fn_segment_distribution argument bag", () => {
    const query: SegmentQuery = {
      ...DEFAULT_SEGMENT_QUERY,
      dimension: "device",
      range: "30d",
    };
    const args = toSegmentDistributionArgs(query, "proj-1", NOW);
    expect(args).toEqual({
      p_project_id: "proj-1",
      p_rule: DEFAULT_RULE,
      p_dimension: "device",
      p_from: "2026-05-27T00:00:00.000Z",
      p_to: "2026-06-26T00:00:00.000Z",
    });
  });
});

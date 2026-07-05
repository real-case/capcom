import { describe, expect, it } from "vitest";

import { boundsToRange } from "./brush";

// The brush is presentational (ADR 0093): its only logic is converting visx x-bounds to
// an ISO window before the feature routes it through nuqs. Unit-tested here so the
// conversion is proven without simulating a drag.
describe("boundsToRange", () => {
  const A = Date.UTC(2026, 4, 8); // 2026-05-08
  const B = Date.UTC(2026, 4, 20); // 2026-05-20

  it("returns null for a cleared brush", () => {
    expect(boundsToRange(null)).toBeNull();
  });

  it("maps ordered bounds to an ISO window", () => {
    expect(boundsToRange({ x0: A, x1: B })).toEqual({
      from: new Date(A).toISOString(),
      to: new Date(B).toISOString(),
    });
  });

  it("normalises reversed bounds (from <= to)", () => {
    expect(boundsToRange({ x0: B, x1: A })).toEqual({
      from: new Date(A).toISOString(),
      to: new Date(B).toISOString(),
    });
  });

  it("treats a zero-width brush (a click) as a clear", () => {
    expect(boundsToRange({ x0: A, x1: A })).toBeNull();
  });
});

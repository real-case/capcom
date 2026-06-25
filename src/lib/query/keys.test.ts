import { describe, expect, it } from "vitest";

import { queryKeys } from "./keys";

// The key factory is the ADR 0025 convention anchor: keys are hierarchical so a
// broad invalidate (trends.all) cascades to every nested entry.
describe("queryKeys", () => {
  it("roots trends keys at ['trends']", () => {
    expect(queryKeys.trends.all).toEqual(["trends"]);
  });

  it("nests series and top under the trends root (broad invalidate cascades)", () => {
    const args = { p_project_id: "p1", p_event_name: "page_view" };
    expect(queryKeys.trends.series(args)).toEqual(["trends", "series", args]);
    expect(queryKeys.trends.top(args)).toEqual(["trends", "top", args]);
    // Both start with the root, so invalidateQueries({ queryKey: trends.all }) clears them.
    expect(queryKeys.trends.series(args)[0]).toBe(queryKeys.trends.all[0]);
  });

  it("keys distinctly by argument bag so different controls don't collide", () => {
    const a = queryKeys.trends.series({ p_interval: "day" });
    const b = queryKeys.trends.series({ p_interval: "week" });
    expect(a).not.toEqual(b);
  });
});

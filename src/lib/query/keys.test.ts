import { describe, expect, it } from "vitest";

import { queryKeys } from "./keys";

// The key factory is the ADR 0025 convention anchor. As you flesh out the
// `notes` factory (lists/list/details/detail), extend these to pin the
// hierarchy — e.g. that `detail(id)` starts with `notes.all` so a broad
// invalidate cascades.
describe("queryKeys", () => {
  it("roots notes keys at ['notes']", () => {
    expect(queryKeys.notes.all).toEqual(["notes"]);
  });
});

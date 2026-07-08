import { describe, expect, it } from "vitest";

import {
  DEFAULT_EVENTS_QUERY,
  eventsQuerySchema,
  toPageWindow,
  toSummaryArgs,
} from "./url-state";

describe("eventsQuerySchema", () => {
  it("passes a valid query through unchanged", () => {
    const valid = {
      page: 3,
      pageSize: 25 as const,
      density: "dense" as const,
      expanded: "evt_1",
    };
    expect(eventsQuerySchema.parse(valid)).toEqual(valid);
  });

  it("falls back to defaults for out-of-grammar values (a malformed shared link)", () => {
    const parsed = eventsQuerySchema.parse({
      page: 0,
      pageSize: 7,
      density: "cozy",
      expanded: "",
    });
    expect(parsed).toEqual({
      page: 1,
      pageSize: 10,
      density: "comfortable",
      expanded: null,
    });
  });

  it("keeps a null expansion and the documented default query", () => {
    expect(DEFAULT_EVENTS_QUERY).toEqual({
      page: 1,
      pageSize: 10,
      density: "comfortable",
      expanded: null,
    });
  });
});

describe("toPageWindow", () => {
  it("derives the half-open offset/limit from page + pageSize", () => {
    expect(toPageWindow(DEFAULT_EVENTS_QUERY)).toEqual({
      offset: 0,
      limit: 10,
    });
    expect(
      toPageWindow({ ...DEFAULT_EVENTS_QUERY, page: 3, pageSize: 25 }),
    ).toEqual({ offset: 50, limit: 25 });
  });
});

describe("toSummaryArgs", () => {
  it("builds the fn_events_summary argument bag for a project", () => {
    expect(toSummaryArgs("proj-42")).toEqual({ p_project_id: "proj-42" });
  });
});

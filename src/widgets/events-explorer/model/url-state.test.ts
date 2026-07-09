import { describe, expect, it } from "vitest";

import { DEFAULT_FILTER, DEFAULT_SORT, type EventsFilter } from "./filter";
import {
  DEFAULT_EVENTS_QUERY,
  eventsQuerySchema,
  toFacetsArgs,
  toFetchArgs,
  toPageWindow,
  toSortSpec,
  toSummaryArgs,
} from "./url-state";

describe("eventsQuerySchema", () => {
  it("passes a valid query through unchanged", () => {
    const valid = {
      page: 3,
      pageSize: 25 as const,
      density: "dense" as const,
      filter: {
        search: "buy",
        events: ["purchase" as const],
        plans: ["pro" as const],
        countries: [],
        devices: [],
      },
      sort: [{ id: "event" as const, desc: false }],
      expanded: "evt_1",
    };
    expect(eventsQuerySchema.parse(valid)).toEqual(valid);
  });

  it("falls back to defaults for out-of-grammar values (a malformed shared link)", () => {
    const parsed = eventsQuerySchema.parse({
      page: 0,
      pageSize: 7,
      density: "cozy",
      // An out-of-vocabulary facet value drops that facet to empty (rejected, not coerced).
      filter: { search: 42, plans: ["hacker"], devices: ["mobile"] },
      // An out-of-grammar sort column collapses the whole sort to empty.
      sort: [{ id: "ssn", desc: true }],
      expanded: "",
    });
    expect(parsed).toEqual({
      page: 1,
      pageSize: 10,
      density: "comfortable",
      filter: { ...DEFAULT_FILTER, devices: ["mobile"] },
      sort: [],
      expanded: null,
    });
  });

  it("keeps a null expansion and the documented default query", () => {
    expect(DEFAULT_EVENTS_QUERY).toEqual({
      page: 1,
      pageSize: 10,
      density: "comfortable",
      filter: DEFAULT_FILTER,
      sort: DEFAULT_SORT,
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

describe("toSortSpec", () => {
  it("maps widget column ids to the events DB columns, preserving order", () => {
    expect(
      toSortSpec([
        { id: "event", desc: false },
        { id: "user", desc: true },
        { id: "time", desc: true },
      ]),
    ).toEqual([
      { column: "event_name", desc: false },
      { column: "distinct_id", desc: true },
      { column: "ts", desc: true },
    ]);
  });
});

describe("toSummaryArgs", () => {
  it("builds a bare argument bag when the filter is empty", () => {
    expect(toSummaryArgs("proj-42", DEFAULT_FILTER)).toEqual({
      p_project_id: "proj-42",
    });
  });

  it("maps active predicates to RPC args and omits empty selections", () => {
    const filter: EventsFilter = {
      search: "  buy  ",
      events: ["purchase"],
      plans: ["pro", "enterprise"],
      countries: [],
      devices: ["mobile"],
    };
    expect(toSummaryArgs("proj-42", filter)).toEqual({
      p_project_id: "proj-42",
      p_search: "buy", // trimmed
      p_events: ["purchase"],
      p_plans: ["pro", "enterprise"],
      p_devices: ["mobile"],
      // p_countries omitted (empty selection → undefined → SQL default null)
    });
  });
});

describe("toFacetsArgs", () => {
  it("carries the dimension plus the whole filter (the RPC self-skips its own dimension)", () => {
    const filter: EventsFilter = {
      ...DEFAULT_FILTER,
      plans: ["pro"],
      devices: ["mobile"],
    };
    expect(toFacetsArgs("proj-42", filter, "plan")).toEqual({
      p_project_id: "proj-42",
      p_dimension: "plan",
      p_plans: ["pro"],
      p_devices: ["mobile"],
    });
  });
});

describe("toFetchArgs", () => {
  it("bundles the page window, entity filter, and DB-column sort", () => {
    const args = toFetchArgs({
      page: 2,
      pageSize: 25,
      density: "comfortable",
      filter: { ...DEFAULT_FILTER, events: ["sign_up"] },
      sort: [{ id: "time", desc: true }],
      expanded: null,
    });
    expect(args).toEqual({
      offset: 25,
      limit: 25,
      filter: {
        search: "",
        events: ["sign_up"],
        plans: [],
        countries: [],
        devices: [],
      },
      sort: [{ column: "ts", desc: true }],
    });
  });
});

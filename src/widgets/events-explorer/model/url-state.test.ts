import { describe, expect, it } from "vitest";

import { reportConfigToSearchParams } from "@/entities/report";

import { DEFAULT_FILTER, DEFAULT_SORT, type EventsFilter } from "./filter";
import {
  DEFAULT_EVENTS_QUERY,
  eventsQuerySchema,
  fromViewConfig,
  toColumnVisibility,
  toFacetsArgs,
  toFetchArgs,
  toPageWindow,
  toSortSpec,
  toSummaryArgs,
  toViewConfig,
  type EventsQuery,
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
      groupBy: "plan" as const,
      hidden: ["properties" as const],
      view: "report-1",
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
      groupBy: "none",
      hidden: [],
      view: null,
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
      groupBy: "none",
      hidden: [],
      view: null,
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
      groupBy: "none",
      hidden: [],
      view: null,
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

describe("saved-view config (ADR 0098)", () => {
  const QUERY: EventsQuery = {
    page: 3,
    pageSize: 25,
    density: "dense",
    filter: { ...DEFAULT_FILTER, plans: ["pro"], search: "buy" },
    sort: [{ id: "event", desc: false }],
    groupBy: "plan",
    hidden: ["properties"],
    view: "some-report-id",
    expanded: "e1",
  };

  it("toViewConfig captures the persistable slice and drops navigation state", () => {
    expect(toViewConfig(QUERY)).toEqual({
      filter: QUERY.filter,
      sort: QUERY.sort,
      pageSize: 25,
      density: "dense",
      groupBy: "plan",
      hidden: ["properties"],
    });
  });

  it("round-trips through the report serializer back into the grammar (reopen path)", () => {
    const qs = new URLSearchParams(
      reportConfigToSearchParams("events", toViewConfig(QUERY)),
    );
    // Reopen = parse each param exactly the way the nuqs parsers do.
    const reopened = fromViewConfig({
      filter: JSON.parse(qs.get("filter")!),
      sort: JSON.parse(qs.get("sort")!),
      hidden: JSON.parse(qs.get("hidden")!),
      pageSize: Number(qs.get("pageSize")),
      density: qs.get("density") ?? undefined,
      groupBy: qs.get("groupBy") ?? undefined,
    });
    expect(reopened).toEqual(toViewConfig(QUERY));
    // Navigation state never rides in a config.
    expect(qs.get("page")).toBeNull();
    expect(qs.get("expanded")).toBeNull();
    expect(qs.get("view")).toBeNull();
  });

  it("fromViewConfig hydrates an empty config to the display defaults (All events)", () => {
    expect(fromViewConfig({})).toEqual({
      filter: DEFAULT_FILTER,
      sort: DEFAULT_SORT,
      pageSize: DEFAULT_EVENTS_QUERY.pageSize,
      density: DEFAULT_EVENTS_QUERY.density,
      groupBy: "none",
      hidden: [],
    });
  });

  it("fromViewConfig degrades malformed fields to their defaults, never errors", () => {
    const hydrated = fromViewConfig({
      filter: { plans: ["not-a-plan"] },
      sort: "garbage",
      pageSize: 999,
      density: "cosy",
      groupBy: "nope",
      hidden: ["select"],
    });
    expect(hydrated.filter.plans).toEqual([]);
    expect(hydrated.sort).toEqual([]);
    expect(hydrated.pageSize).toBe(10);
    expect(hydrated.density).toBe("comfortable");
    expect(hydrated.groupBy).toBe("none");
    expect(hydrated.hidden).toEqual([]);
  });
});

describe("toColumnVisibility", () => {
  it("maps hidden ids to false and leaves visible columns absent", () => {
    expect(toColumnVisibility(["plan", "value"])).toEqual({
      plan: false,
      value: false,
    });
    expect(toColumnVisibility([])).toEqual({});
  });
});

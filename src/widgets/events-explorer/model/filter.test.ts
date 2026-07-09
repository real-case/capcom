import { describe, expect, it } from "vitest";

import {
  activeChips,
  clearFacet,
  cycleSort,
  DEFAULT_FILTER,
  eventsFilterSchema,
  eventsSortSchema,
  facetSelection,
  isFilterActive,
  toggleFacetValue,
  withSearch,
  type EventsFilter,
} from "./filter";

describe("eventsFilterSchema (the closed grammar / injection boundary, ADR 0089)", () => {
  it("passes a valid filter through unchanged", () => {
    const valid: EventsFilter = {
      search: "checkout",
      events: ["purchase", "sign_up"],
      plans: ["pro"],
      countries: ["US", "GB"],
      devices: ["mobile"],
    };
    expect(eventsFilterSchema.parse(valid)).toEqual(valid);
  });

  it("rejects an out-of-vocabulary facet value rather than coercing it", () => {
    const parsed = eventsFilterSchema.parse({
      search: "x",
      // A value carrying SQL metacharacters is not in the vocabulary → the facet drops to [].
      plans: ["'; DROP TABLE events; --"],
      devices: ["mobile", "watch"], // 'watch' is out of vocabulary → whole array rejected
    });
    expect(parsed.plans).toEqual([]);
    expect(parsed.devices).toEqual([]);
    expect(parsed.search).toBe("x");
  });

  it("clamps an over-long search and a non-string to the default", () => {
    expect(eventsFilterSchema.parse({ search: "a".repeat(500) }).search).toBe(
      "",
    );
    expect(eventsFilterSchema.parse({ search: 42 }).search).toBe("");
  });
});

describe("facet selection transforms", () => {
  it("toggleFacetValue adds then removes a value", () => {
    const added = toggleFacetValue(DEFAULT_FILTER, "plan", "pro");
    expect(facetSelection(added, "plan")).toEqual(["pro"]);
    const removed = toggleFacetValue(added, "plan", "pro");
    expect(facetSelection(removed, "plan")).toEqual([]);
  });

  it("toggleFacetValue ignores a value outside the dimension's vocabulary", () => {
    const result = toggleFacetValue(DEFAULT_FILTER, "plan", "not-a-plan");
    expect(facetSelection(result, "plan")).toEqual([]);
  });

  it("clearFacet empties one dimension and leaves the others", () => {
    const filter = toggleFacetValue(
      toggleFacetValue(DEFAULT_FILTER, "plan", "pro"),
      "device",
      "mobile",
    );
    const cleared = clearFacet(filter, "plan");
    expect(facetSelection(cleared, "plan")).toEqual([]);
    expect(facetSelection(cleared, "device")).toEqual(["mobile"]);
  });

  it("withSearch sets the search text", () => {
    expect(withSearch(DEFAULT_FILTER, "buy").search).toBe("buy");
  });
});

describe("isFilterActive / activeChips", () => {
  it("reports inactive for the default filter", () => {
    expect(isFilterActive(DEFAULT_FILTER)).toBe(false);
    expect(activeChips(DEFAULT_FILTER)).toEqual([]);
  });

  it("lists the search first, then facets by dimension order", () => {
    const filter: EventsFilter = {
      search: "buy",
      events: ["purchase"],
      plans: ["pro"],
      countries: [],
      devices: ["mobile"],
    };
    expect(isFilterActive(filter)).toBe(true);
    expect(activeChips(filter)).toEqual([
      { kind: "search", value: "buy" },
      { kind: "facet", dimension: "event", value: "purchase" },
      { kind: "facet", dimension: "plan", value: "pro" },
      { kind: "facet", dimension: "device", value: "mobile" },
    ]);
  });
});

describe("cycleSort", () => {
  it("plain activation cycles a sole column asc → desc → cleared", () => {
    expect(cycleSort([], "event", false)).toEqual([
      { id: "event", desc: false },
    ]);
    expect(cycleSort([{ id: "event", desc: false }], "event", false)).toEqual([
      { id: "event", desc: true },
    ]);
    expect(cycleSort([{ id: "event", desc: true }], "event", false)).toEqual(
      [],
    );
  });

  it("plain activation on a new column replaces the existing sort", () => {
    expect(cycleSort([{ id: "time", desc: true }], "event", false)).toEqual([
      { id: "event", desc: false },
    ]);
  });

  it("additive activation appends, toggles direction, then removes", () => {
    const base = [{ id: "time" as const, desc: true }];
    const appended = cycleSort(base, "event", true);
    expect(appended).toEqual([
      { id: "time", desc: true },
      { id: "event", desc: false },
    ]);
    const flipped = cycleSort(appended, "event", true);
    expect(flipped).toEqual([
      { id: "time", desc: true },
      { id: "event", desc: true },
    ]);
    expect(cycleSort(flipped, "event", true)).toEqual([
      { id: "time", desc: true },
    ]);
  });
});

describe("eventsSortSchema (the sort injection boundary)", () => {
  it("rejects an out-of-vocabulary column id", () => {
    expect(
      eventsSortSchema.parse([{ id: "not-a-column", desc: true }]),
    ).toEqual([]);
  });

  it("caps the number of sort keys at SORTABLE_COLUMNS.length", () => {
    // Four keys exceed the three sortable columns → the whole value is rejected.
    expect(
      eventsSortSchema.parse([
        { id: "time", desc: true },
        { id: "event", desc: false },
        { id: "user", desc: true },
        { id: "time", desc: false },
      ]),
    ).toEqual([]);
  });

  it("rejects a non-boolean desc", () => {
    expect(eventsSortSchema.parse([{ id: "time", desc: "true" }])).toEqual([]);
  });
});

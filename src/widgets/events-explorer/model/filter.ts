import { z } from "zod";

/**
 * The closed filter + sort grammar for the events explorer (PR-17, ADR 0097). A filter is
 * USER-AUTHORED data, so — reusing ADR 0089's grammar-as-injection-boundary discipline — it
 * is a **closed, AND-only, Zod-validated** value: free-text `search` over the event name plus
 * a multi-select over four facet dimensions whose values come from a **curated vocabulary**
 * (the seed's value domains, ADR 0085). An out-of-grammar value is rejected (`.catch`), never
 * coerced, and every predicate reaches the database as a parameterized query-builder operator
 * or RPC argument — no user string is ever concatenated into SQL. The whole value is
 * nuqs-encodable (ADR 0027), so a filtered/sorted view is a shareable link.
 *
 * Stated scope boundaries (each its own later PR if pursued, per ADR 0097): a time-range
 * control (the summary/facets RPCs already accept an optional `[from, to)` window — only the
 * UI is deferred), OR / nested logic, and arbitrary `properties`-path predicates.
 */

// ── Curated value vocabularies — the injection boundary (ADR 0089) ────────────────────
// The seed's value domains (ADR 0085); mirrors the segment builder's TRAIT_VALUES. A value
// present in data but absent here simply isn't authorable via the UI — a conscious demo
// scope choice — and a shared link carrying one degrades that facet to empty, never errors.
export const EVENT_NAMES = [
  "page_view",
  "sign_up",
  "feature_used",
  "search",
  "purchase",
] as const;
export const PLANS = ["free", "pro", "enterprise"] as const;
export const COUNTRIES = [
  "US",
  "GB",
  "DE",
  "FR",
  "CA",
  "IN",
  "BR",
  "JP",
  "AU",
] as const;
export const DEVICES = ["desktop", "mobile", "tablet"] as const;

/**
 * The closed, AND-only filter value (ADR 0097/0089). Each field degrades to its neutral
 * default on a malformed shared link (`.catch`) rather than reverting the whole view — an
 * out-of-vocabulary facet value drops that facet to empty, an over-long search resets to "".
 */
export const eventsFilterSchema = z.object({
  search: z.string().max(200).catch(""),
  events: z.array(z.enum(EVENT_NAMES)).catch([]),
  plans: z.array(z.enum(PLANS)).catch([]),
  countries: z.array(z.enum(COUNTRIES)).catch([]),
  devices: z.array(z.enum(DEVICES)).catch([]),
});
export type EventsFilter = z.infer<typeof eventsFilterSchema>;

export const DEFAULT_FILTER: EventsFilter = {
  search: "",
  events: [],
  plans: [],
  countries: [],
  devices: [],
};

// ── Facet dimensions (the multi-select popovers) ──────────────────────────────────────
/** The four facet dimensions; each maps to a fixed column / `properties` key in SQL. */
export const FACET_DIMENSIONS = ["event", "plan", "country", "device"] as const;
export type FacetDimension = (typeof FACET_DIMENSIONS)[number];

/** The curated value vocabulary a facet's popover offers, per dimension. */
export const FACET_VALUES: Record<FacetDimension, readonly string[]> = {
  event: EVENT_NAMES,
  plan: PLANS,
  country: COUNTRIES,
  device: DEVICES,
};

/** Which `EventsFilter` array field a facet dimension selects into. */
export const FACET_FIELD = {
  event: "events",
  plan: "plans",
  country: "countries",
  device: "devices",
} as const satisfies Record<
  FacetDimension,
  "events" | "plans" | "countries" | "devices"
>;

/** The currently-selected values for one facet dimension. */
export function facetSelection(
  filter: EventsFilter,
  dimension: FacetDimension,
): readonly string[] {
  return filter[FACET_FIELD[dimension]];
}

/** True when any predicate is active — drives the chips row and the "clear all" control. */
export function isFilterActive(filter: EventsFilter): boolean {
  return (
    filter.search.trim() !== "" ||
    filter.events.length > 0 ||
    filter.plans.length > 0 ||
    filter.countries.length > 0 ||
    filter.devices.length > 0
  );
}

/**
 * Add or remove a value in one facet dimension's selection, returning a new filter. The
 * result is re-parsed through the schema so its fields keep their narrow enum types and any
 * stray value is dropped — the grammar stays the single validation authority (ADR 0017/0089).
 */
export function toggleFacetValue(
  filter: EventsFilter,
  dimension: FacetDimension,
  value: string,
): EventsFilter {
  const field = FACET_FIELD[dimension];
  const current: readonly string[] = filter[field];
  const next = current.includes(value)
    ? current.filter((entry) => entry !== value)
    : [...current, value];
  return eventsFilterSchema.parse({ ...filter, [field]: next });
}

/** Set the free-text search, returning a new filter (length clamped by the schema). */
export function withSearch(filter: EventsFilter, search: string): EventsFilter {
  return eventsFilterSchema.parse({ ...filter, search });
}

/** Clear one facet dimension's whole selection, returning a new filter. */
export function clearFacet(
  filter: EventsFilter,
  dimension: FacetDimension,
): EventsFilter {
  return eventsFilterSchema.parse({ ...filter, [FACET_FIELD[dimension]]: [] });
}

/** One active-filter chip: a removable predicate shown above the table. */
export type FilterChip =
  | { kind: "search"; value: string }
  | { kind: "facet"; dimension: FacetDimension; value: string };

/** The active predicates as an ordered chip list (search first, then facets by dimension). */
export function activeChips(filter: EventsFilter): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filter.search.trim() !== "") {
    chips.push({ kind: "search", value: filter.search.trim() });
  }
  for (const dimension of FACET_DIMENSIONS) {
    for (const value of facetSelection(filter, dimension)) {
      chips.push({ kind: "facet", dimension, value });
    }
  }
  return chips;
}

// ── Multi-column sort ─────────────────────────────────────────────────────────────────
/**
 * The columns that support server-side sorting — real `events` columns (the jsonb-derived
 * plan / country / device / value columns are filter-only this PR; a numeric jsonb sort is a
 * stated scope boundary, ADR 0097). The widget's column ids map to DB columns in `url-state`.
 */
export const SORTABLE_COLUMNS = ["time", "event", "user"] as const;
export type SortColumn = (typeof SORTABLE_COLUMNS)[number];

/**
 * A bounded multi-sort spec — an ordered list of (column, direction), capped so a shared link
 * can't request an unbounded sort. Empty means the default `ts desc` (applied by the fetcher).
 */
export const eventsSortSchema = z
  .array(
    z.object({
      id: z.enum(SORTABLE_COLUMNS),
      desc: z.boolean(),
    }),
  )
  .max(SORTABLE_COLUMNS.length)
  .catch([]);
export type EventsSort = z.infer<typeof eventsSortSchema>;

export const DEFAULT_SORT: EventsSort = [{ id: "time", desc: true }];

/**
 * Advance the multi-sort when a column header is activated (PR-17). A plain activation cycles
 * that one column through asc → desc → cleared as the sole sort key; an `additive` activation
 * (shift-click / Alt+click) toggles the column **within** the current list (append asc → desc →
 * remove), building a stable multi-column order. Clearing to `[]` restores the default `ts desc`
 * (applied by the fetcher). Pure and total, so it is unit-testable in isolation.
 */
export function cycleSort(
  sort: EventsSort,
  column: SortColumn,
  additive: boolean,
): EventsSort {
  const existing = sort.find((key) => key.id === column);
  if (additive) {
    if (!existing) return [...sort, { id: column, desc: false }];
    if (!existing.desc) {
      return sort.map((key) =>
        key.id === column ? { id: column, desc: true } : key,
      );
    }
    return sort.filter((key) => key.id !== column);
  }
  // Plain activation: this column becomes the sole sort key, cycling asc → desc → cleared.
  const soleAsc = sort.length === 1 && existing !== undefined && !existing.desc;
  const soleDesc = sort.length === 1 && existing !== undefined && existing.desc;
  if (soleAsc) return [{ id: column, desc: true }];
  if (soleDesc) return [];
  return [{ id: column, desc: false }];
}

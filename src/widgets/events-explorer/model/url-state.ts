import {
  parseAsInteger,
  parseAsJson,
  parseAsString,
  parseAsStringEnum,
} from "nuqs";
import { z } from "zod";

import type {
  EventsFacetsArgs,
  EventsQueryFilter,
  EventSortColumn,
  EventsSortSpec,
  EventsSummaryArgs,
} from "@/entities/event";
import type { ReportConfig } from "@/entities/report";

import {
  DEFAULT_FILTER,
  DEFAULT_SORT,
  eventsFilterSchema,
  eventsSortSchema,
  FACET_DIMENSIONS,
  type EventsFilter,
  type EventsSort,
  type FacetDimension,
  type SortColumn,
} from "./filter";

/**
 * URL-state for the events explorer (ADR 0097/0027): the page, page size, row density, the
 * closed filter (search + facet selections, PR-17), the multi-column sort, and the currently
 * expanded event id all live in the query string so a view is a shareable, bookmarkable link.
 * nuqs binds the controls to the URL; this Zod schema plus the `[events-filter]`/`[events-sort]`
 * grammars (ADR 0017/0089) are the validation authority — a malformed shared link falls back to
 * the defaults rather than rendering a broken view.
 */

/** Page-size options the pager offers. */
export const PAGE_SIZES = [10, 25, 50] as const;
/** Row-density options — applied as the ADR 0082 `[data-density]` axis (ADR 0098). */
export const DENSITIES = ["comfortable", "dense"] as const;
export type Density = (typeof DENSITIES)[number];

/**
 * The roll-up dimensions (ADR 0098): "none" = the raw-row grid; a facet dimension swaps
 * in the in-database roll-up view (per-value counts from `fn_events_facets`, ADR 0084).
 */
export const GROUP_BY_VALUES = ["none", ...FACET_DIMENSIONS] as const;
export type GroupBy = (typeof GROUP_BY_VALUES)[number];

/**
 * The columns the visibility menu may hide (ADR 0098). The selection checkbox, the
 * event name, and the time column are the row's spine and are never hideable.
 */
export const HIDEABLE_COLUMNS = [
  "user",
  "plan",
  "country",
  "device",
  "value",
  "properties",
] as const;
export type HideableColumn = (typeof HIDEABLE_COLUMNS)[number];
const hiddenSchema = z.array(z.enum(HIDEABLE_COLUMNS)).catch([]);

/** Validation authority for the resolved URL-state (ADR 0017). */
export const eventsQuerySchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50)]).catch(10),
  density: z.enum(DENSITIES).catch("comfortable"),
  // The closed filter and bounded sort — each self-heals a malformed value to its default.
  filter: eventsFilterSchema.catch(DEFAULT_FILTER),
  sort: eventsSortSchema,
  // The roll-up dimension and the hidden-column set (ADR 0098).
  groupBy: z.enum(GROUP_BY_VALUES).catch("none"),
  hidden: hiddenSchema,
  // The active saved-view report id, or null on the default "All events" view (ADR 0098).
  view: z.string().min(1).nullable().catch(null),
  // The expanded event id, or null when no row is open.
  expanded: z.string().min(1).nullable().catch(null),
});
export type EventsQuery = z.infer<typeof eventsQuerySchema>;

export const DEFAULT_EVENTS_QUERY: EventsQuery = {
  page: 1,
  pageSize: 10,
  density: "comfortable",
  filter: DEFAULT_FILTER,
  sort: DEFAULT_SORT,
  groupBy: "none",
  hidden: [],
  view: null,
  expanded: null,
};

/**
 * nuqs parser map for `useQueryStates`. Each carries the matching default so an absent key
 * reads as the default (and is omitted from the URL until changed). The filter and sort are
 * JSON-encoded values validated by their schemas on read — because every field of those
 * schemas is `.catch`-guarded, the parse never throws, so a malformed shared link degrades
 * to the default value rather than erroring.
 */
export const eventsParsers = {
  page: parseAsInteger.withDefault(DEFAULT_EVENTS_QUERY.page),
  pageSize: parseAsInteger.withDefault(DEFAULT_EVENTS_QUERY.pageSize),
  density: parseAsStringEnum<Density>([...DENSITIES]).withDefault(
    DEFAULT_EVENTS_QUERY.density,
  ),
  filter: parseAsJson((value) => eventsFilterSchema.parse(value)).withDefault(
    DEFAULT_FILTER,
  ),
  sort: parseAsJson((value) => eventsSortSchema.parse(value)).withDefault(
    DEFAULT_SORT,
  ),
  groupBy: parseAsStringEnum<GroupBy>([...GROUP_BY_VALUES]).withDefault(
    DEFAULT_EVENTS_QUERY.groupBy,
  ),
  hidden: parseAsJson((value) => hiddenSchema.parse(value)).withDefault(
    DEFAULT_EVENTS_QUERY.hidden,
  ),
  // Absent → null; parseAsString reads a present value verbatim (view id / open row id).
  view: parseAsString,
  expanded: parseAsString,
};

/**
 * The persistable slice of the URL-state — a saved view's `config` (ADR 0098/0090).
 * `page`, `expanded`, and `view` are navigation state and are never part of a view;
 * the same keys reopen through `reportConfigToSearchParams("events", …)`.
 */
export function toViewConfig(query: EventsQuery): ReportConfig {
  return {
    filter: query.filter,
    sort: query.sort,
    pageSize: query.pageSize,
    density: query.density,
    groupBy: query.groupBy,
    hidden: query.hidden,
  };
}

/** TanStack `columnVisibility` for the hidden-column set (absent = visible). */
export function toColumnVisibility(
  hidden: readonly HideableColumn[],
): Record<string, boolean> {
  return Object.fromEntries(hidden.map((id) => [id, false]));
}

/**
 * Hydrate a saved view's opaque `config` (ADR 0098/0090) into the URL-state fields it
 * governs. Each field re-validates through its own schema — the grammar stays the
 * single authority (ADR 0017) — so a malformed or stale config degrades that field to
 * its default, never errors. An empty config yields exactly the defaults, which is the
 * "All events" tab.
 */
export function fromViewConfig(
  config: Record<string, unknown>,
): Pick<
  EventsQuery,
  "filter" | "sort" | "pageSize" | "density" | "groupBy" | "hidden"
> {
  const shape = eventsQuerySchema.shape;
  return {
    filter: shape.filter.parse(config.filter),
    // An absent sort hydrates to the DISPLAY default (time desc) rather than the
    // schema's `[]` fallback, so the "All events" tab matches a fresh load exactly.
    sort:
      config.sort === undefined ? DEFAULT_SORT : shape.sort.parse(config.sort),
    pageSize: shape.pageSize.parse(config.pageSize),
    density: shape.density.parse(config.density),
    groupBy: shape.groupBy.parse(config.groupBy),
    hidden: shape.hidden.parse(config.hidden),
  };
}

/** The half-open page window (offset/limit) for the raw-event fetcher (ADR 0097). */
export function toPageWindow(query: EventsQuery): {
  offset: number;
  limit: number;
} {
  const limit = query.pageSize;
  return { offset: (query.page - 1) * limit, limit };
}

/** Widget column id → the `events` column the fetcher sorts on. */
const SORT_COLUMN: Record<SortColumn, EventSortColumn> = {
  time: "ts",
  event: "event_name",
  user: "distinct_id",
};

/** Map the widget's multi-sort (column ids) to the entity's DB-column sort spec (ADR 0097). */
export function toSortSpec(sort: EventsSort): EventsSortSpec {
  return sort.map((key) => ({ column: SORT_COLUMN[key.id], desc: key.desc }));
}

/** The entity-level filter for a raw-event page read (empty arrays/blank = unconstrained). */
export function toQueryFilter(filter: EventsFilter): EventsQueryFilter {
  return {
    search: filter.search,
    events: filter.events,
    plans: filter.plans,
    countries: filter.countries,
    devices: filter.devices,
  };
}

/** The full `fetchEvents` argument bag (page window + closed filter + multi-sort). */
export function toFetchArgs(query: EventsQuery): {
  offset: number;
  limit: number;
  filter: EventsQueryFilter;
  sort: EventsSortSpec;
} {
  return {
    ...toPageWindow(query),
    filter: toQueryFilter(query.filter),
    sort: toSortSpec(query.sort),
  };
}

/**
 * Map the closed filter to the shared RPC argument names (fn_events_summary /
 * fn_events_facets). An empty selection becomes `undefined` so JSON serialization omits it
 * and the SQL default (`null` = unconstrained) applies — never an empty array, which the
 * `= any('{}')` predicate would read as "match nothing".
 */
function filterToRpcArgs(filter: EventsFilter): {
  p_search?: string;
  p_events?: string[];
  p_plans?: string[];
  p_countries?: string[];
  p_devices?: string[];
} {
  const search = filter.search.trim();
  return {
    p_search: search === "" ? undefined : search,
    p_events: filter.events.length ? [...filter.events] : undefined,
    p_plans: filter.plans.length ? [...filter.plans] : undefined,
    p_countries: filter.countries.length ? [...filter.countries] : undefined,
    p_devices: filter.devices.length ? [...filter.devices] : undefined,
  };
}

/** The `fn_events_summary` argument bag for a project under the active filter (ADR 0097). */
export function toSummaryArgs(
  projectId: string,
  filter: EventsFilter,
): EventsSummaryArgs {
  return { p_project_id: projectId, ...filterToRpcArgs(filter) };
}

/**
 * The `fn_events_facets` argument bag for one facet dimension under the active filter
 * (ADR 0097). The RPC self-skips the dimension's own predicate, so passing the whole filter
 * (including that dimension's current selection) is correct — the SQL ignores it.
 */
export function toFacetsArgs(
  projectId: string,
  filter: EventsFilter,
  dimension: FacetDimension,
): EventsFacetsArgs {
  return {
    p_project_id: projectId,
    p_dimension: dimension,
    ...filterToRpcArgs(filter),
  };
}

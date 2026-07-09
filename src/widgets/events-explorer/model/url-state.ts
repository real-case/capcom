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

import {
  DEFAULT_FILTER,
  DEFAULT_SORT,
  eventsFilterSchema,
  eventsSortSchema,
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
/** Row-density options (local row padding; distinct from the global ADR 0082 axis). */
export const DENSITIES = ["comfortable", "dense"] as const;
export type Density = (typeof DENSITIES)[number];

/** Validation authority for the resolved URL-state (ADR 0017). */
export const eventsQuerySchema = z.object({
  page: z.number().int().min(1).catch(1),
  pageSize: z.union([z.literal(10), z.literal(25), z.literal(50)]).catch(10),
  density: z.enum(DENSITIES).catch("comfortable"),
  // The closed filter and bounded sort — each self-heals a malformed value to its default.
  filter: eventsFilterSchema.catch(DEFAULT_FILTER),
  sort: eventsSortSchema,
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
  // Absent → null (no open row); parseAsString reads a present value verbatim.
  expanded: parseAsString,
};

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

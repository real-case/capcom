import { parseAsInteger, parseAsString, parseAsStringEnum } from "nuqs";
import { z } from "zod";

import type { EventsSummaryArgs } from "@/entities/event";

/**
 * URL-state for the events explorer (ADR 0097/0027): the page, page size, row density,
 * and the currently expanded event id live in the query string so a view is a shareable,
 * bookmarkable link. nuqs binds the controls to the URL; this Zod schema (ADR 0017) is the
 * validation authority — a malformed shared link falls back to the defaults rather than
 * rendering a broken view. The richer closed filter/sort grammar (ADR 0089-style) extends
 * this schema in the follow-up PR; PR-16 wires paging + density + expansion only.
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
  // The expanded event id, or null when no row is open.
  expanded: z.string().min(1).nullable().catch(null),
});
export type EventsQuery = z.infer<typeof eventsQuerySchema>;

export const DEFAULT_EVENTS_QUERY: EventsQuery = {
  page: 1,
  pageSize: 10,
  density: "comfortable",
  expanded: null,
};

/**
 * nuqs parser map for `useQueryStates`. Each carries the matching default so an absent
 * key reads as the default (and is omitted from the URL until changed). The parsed values
 * are re-validated by `eventsQuerySchema` before use.
 */
export const eventsParsers = {
  page: parseAsInteger.withDefault(DEFAULT_EVENTS_QUERY.page),
  pageSize: parseAsInteger.withDefault(DEFAULT_EVENTS_QUERY.pageSize),
  density: parseAsStringEnum<Density>([...DENSITIES]).withDefault(
    DEFAULT_EVENTS_QUERY.density,
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

/** The `fn_events_summary` argument bag for a project (PR-16 wires no window filter). */
export function toSummaryArgs(projectId: string): EventsSummaryArgs {
  return { p_project_id: projectId };
}

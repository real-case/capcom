import { parseAsString, parseAsStringEnum } from "nuqs";
import { z } from "zod";

import type { EventTrendsArgs, TopEventsArgs } from "@/entities/event";

/**
 * URL-state for the trends explorer (ADR 0027): event / date-range / interval /
 * breakdown live in the query string so a report is a shareable, bookmarkable link.
 * nuqs binds the controls to the URL; the Zod schema (ADR 0017) is the single
 * validation authority and the source of the `TrendsQuery` type. The two are kept
 * in lockstep — same keys, same enums.
 */

/** Bucket granularities, mirrored by the SQL `p_interval` guard in fn_event_trends. */
export const INTERVALS = ["hour", "day", "week", "month"] as const;
/** Relative date-range presets (resolved to an explicit window at query time). */
export const RANGES = ["7d", "30d", "90d"] as const;
/**
 * Breakdown options offered in the UI: `none` (single series) plus a curated set of
 * common `properties` keys present in the seeded data. `none` maps to a null breakdown
 * key in the RPC. (Curated rather than data-derived — a conscious demo scope choice.)
 */
export const BREAKDOWN_KEYS = [
  "none",
  "device",
  "plan",
  "country",
  "path",
  "referrer",
] as const;

export type Interval = (typeof INTERVALS)[number];
export type Range = (typeof RANGES)[number];
export type BreakdownKey = (typeof BREAKDOWN_KEYS)[number];

/** Validation authority for the resolved URL-state (ADR 0017). */
export const trendsQuerySchema = z.object({
  event: z.string().min(1).max(200),
  range: z.enum(RANGES),
  interval: z.enum(INTERVALS),
  breakdown: z.enum(BREAKDOWN_KEYS),
});
export type TrendsQuery = z.infer<typeof trendsQuerySchema>;

/** Defaults: 30 days of daily buckets of `page_view`, no breakdown. */
export const DEFAULT_TRENDS_QUERY: TrendsQuery = {
  event: "page_view",
  range: "30d",
  interval: "day",
  breakdown: "none",
};

/**
 * nuqs parser map for `useQueryStates`. Each carries the matching default so an
 * absent key reads as the default (and is omitted from the URL until changed).
 */
export const trendsParsers = {
  event: parseAsString.withDefault(DEFAULT_TRENDS_QUERY.event),
  range: parseAsStringEnum<Range>([...RANGES]).withDefault(
    DEFAULT_TRENDS_QUERY.range,
  ),
  interval: parseAsStringEnum<Interval>([...INTERVALS]).withDefault(
    DEFAULT_TRENDS_QUERY.interval,
  ),
  breakdown: parseAsStringEnum<BreakdownKey>([...BREAKDOWN_KEYS]).withDefault(
    DEFAULT_TRENDS_QUERY.breakdown,
  ),
};

const DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 86_400_000;

/**
 * Resolve a relative range to an explicit half-open `[from, to)` window. `to` is
 * floored to the next UTC midnight so the window — and therefore the TanStack query
 * key — is stable across re-renders within the same day (no cache thrash from a live
 * clock). `now` is injected so the resolution is deterministic and unit-testable.
 */
export function resolveWindow(
  range: Range,
  now: Date,
): { from: string; to: string } {
  const toMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  const from = toMidnight - DAYS[range] * DAY_MS;
  return {
    from: new Date(from).toISOString(),
    to: new Date(toMidnight).toISOString(),
  };
}

/**
 * Map URL-state to the `fn_event_trends` argument bag. `breakdown: "none"` omits the
 * key entirely (the SQL default is null → a single series); any other value is passed
 * as the breakdown property key.
 */
export function toTrendsArgs(
  query: TrendsQuery,
  projectId: string,
  now: Date,
): EventTrendsArgs {
  const { from, to } = resolveWindow(query.range, now);
  const base: EventTrendsArgs = {
    p_project_id: projectId,
    p_event_name: query.event,
    p_from: from,
    p_to: to,
    p_interval: query.interval,
  };
  return query.breakdown === "none"
    ? base
    : { ...base, p_breakdown_key: query.breakdown };
}

/** Map URL-state to the `fn_top_events` argument bag (window only). */
export function toTopEventsArgs(
  query: TrendsQuery,
  projectId: string,
  now: Date,
  limit = 10,
): TopEventsArgs {
  const { from, to } = resolveWindow(query.range, now);
  return { p_project_id: projectId, p_from: from, p_to: to, p_limit: limit };
}

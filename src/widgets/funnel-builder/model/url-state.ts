import { parseAsArrayOf, parseAsString, parseAsStringEnum } from "nuqs";
import { z } from "zod";

import type { FunnelArgs } from "@/entities/event";

/**
 * URL-state for the funnel builder (ADR 0027): the ordered step list, the entry
 * date-range, and the conversion window live in the query string so a funnel is a
 * shareable, bookmarkable link. nuqs binds the controls to the URL; the Zod schema
 * (ADR 0017) is the single validation authority and the source of the `FunnelQuery`
 * type. The semantics these encode are fixed by ADR 0087.
 */

/** Relative entry date-range presets (resolved to an explicit window at query time). */
export const RANGES = ["7d", "30d", "90d"] as const;
/**
 * Conversion-window presets — the single total window measured from step 1 within
 * which the whole funnel must complete (ADR 0087). Each maps to a Postgres interval.
 */
export const WINDOWS = ["1d", "7d", "14d", "30d"] as const;
/**
 * Curated event vocabulary offered in the step pickers: the canonical events the seed
 * emits. Curated rather than data-derived — a conscious demo scope choice, mirroring
 * the trends breakdown options.
 */
export const FUNNEL_EVENTS = [
  "page_view",
  "sign_up",
  "feature_used",
  "search",
  "purchase",
] as const;

/** Step-count bounds. The UI caps at MAX_STEPS; the SQL guard allows up to 10 (ADR 0087). */
export const MIN_STEPS = 2;
export const MAX_STEPS = 6;

export type Range = (typeof RANGES)[number];
export type Window = (typeof WINDOWS)[number];

/** Conversion-window preset → the Postgres interval string passed to `fn_funnel`. */
const WINDOW_INTERVALS: Record<Window, string> = {
  "1d": "1 day",
  "7d": "7 days",
  "14d": "14 days",
  "30d": "30 days",
};

/** Validation authority for the resolved URL-state (ADR 0017). */
export const funnelQuerySchema = z.object({
  steps: z.array(z.string().min(1).max(200)).min(MIN_STEPS).max(MAX_STEPS),
  range: z.enum(RANGES),
  window: z.enum(WINDOWS),
});
export type FunnelQuery = z.infer<typeof funnelQuerySchema>;

/** Defaults: the acquisition → activation → revenue funnel, 90-day entry, 30-day window. */
export const DEFAULT_FUNNEL_QUERY: FunnelQuery = {
  steps: ["page_view", "sign_up", "feature_used", "purchase"],
  range: "90d",
  window: "30d",
};

/**
 * nuqs parser map for `useQueryStates`. The steps are a comma-separated array (event
 * names carry no commas); each parser carries the matching default so an absent key
 * reads as the default (and is omitted from the URL until changed).
 */
export const funnelParsers = {
  steps: parseAsArrayOf(parseAsString).withDefault(DEFAULT_FUNNEL_QUERY.steps),
  range: parseAsStringEnum<Range>([...RANGES]).withDefault(
    DEFAULT_FUNNEL_QUERY.range,
  ),
  window: parseAsStringEnum<Window>([...WINDOWS]).withDefault(
    DEFAULT_FUNNEL_QUERY.window,
  ),
};

const DAYS: Record<Range, number> = { "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 86_400_000;

/**
 * Resolve a relative entry range to an explicit half-open `[from, to)` window — the
 * window in which a user's first step-1 event must fall (ADR 0087). `to` is floored to
 * the next UTC midnight so the window — and the TanStack query key — is stable across
 * re-renders within the same day. `now` is injected so the resolution is deterministic
 * and unit-testable. (Mirrors the trends slice's resolver; kept slice-local so the two
 * widgets stay independent under FSD.)
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

/** Map URL-state to the `fn_funnel` argument bag (ADR 0087). */
export function toFunnelArgs(
  query: FunnelQuery,
  projectId: string,
  now: Date,
): FunnelArgs {
  const { from, to } = resolveWindow(query.range, now);
  return {
    p_project_id: projectId,
    p_steps: query.steps,
    p_from: from,
    p_to: to,
    p_window: WINDOW_INTERVALS[query.window],
  };
}

import { parseAsStringEnum } from "nuqs";
import { z } from "zod";

import type { RetentionArgs } from "@/entities/event";

/**
 * URL-state for the retention cohort grid (ADR 0027): the analysis range and the
 * cohort/period granularity live in the query string so a cohort grid is a shareable,
 * bookmarkable link. nuqs binds the controls to the URL; the Zod schema (ADR 0017) is
 * the single validation authority and the source of the `RetentionQuery` type. The
 * semantics these encode are fixed by ADR 0088.
 */

/** Analysis-range presets (resolved to an explicit window at query time). */
export const RANGES = ["30d", "90d", "180d"] as const;
/**
 * Cohort/period granularity. Calendar-aligned weeks or months (ADR 0088); each maps to
 * a Postgres `date_trunc` unit. Daily is a stated ADR 0088 scope boundary.
 */
export const PERIODS = ["week", "month"] as const;

export type Range = (typeof RANGES)[number];
export type Period = (typeof PERIODS)[number];

/** Validation authority for the resolved URL-state (ADR 0017). */
export const retentionQuerySchema = z.object({
  range: z.enum(RANGES),
  period: z.enum(PERIODS),
});
export type RetentionQuery = z.infer<typeof retentionQuerySchema>;

/** Defaults: weekly cohorts over the trailing 90 days — the dense triangular grid. */
export const DEFAULT_RETENTION_QUERY: RetentionQuery = {
  range: "90d",
  period: "week",
};

/**
 * nuqs parser map for `useQueryStates`. Each parser carries the matching default so an
 * absent key reads as the default (and is omitted from the URL until changed).
 */
export const retentionParsers = {
  range: parseAsStringEnum<Range>([...RANGES]).withDefault(
    DEFAULT_RETENTION_QUERY.range,
  ),
  period: parseAsStringEnum<Period>([...PERIODS]).withDefault(
    DEFAULT_RETENTION_QUERY.period,
  ),
};

const DAYS: Record<Range, number> = { "30d": 30, "90d": 90, "180d": 180 };
const DAY_MS = 86_400_000;

/**
 * Resolve a relative range to an explicit half-open `[from, to)` window — a user's
 * first-touch must fall in it to enter a cohort (ADR 0088). `to` is floored to the next
 * UTC midnight so the window — and the TanStack query key — is stable across re-renders
 * within the same day. `now` is injected so the resolution is deterministic and
 * unit-testable. (Mirrors the trends/funnel resolvers; kept slice-local so the widgets
 * stay independent under FSD.)
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

/** Map URL-state to the `fn_retention` argument bag (ADR 0088). */
export function toRetentionArgs(
  query: RetentionQuery,
  projectId: string,
  now: Date,
): RetentionArgs {
  const { from, to } = resolveWindow(query.range, now);
  return {
    p_project_id: projectId,
    p_from: from,
    p_to: to,
    p_period: query.period,
  };
}

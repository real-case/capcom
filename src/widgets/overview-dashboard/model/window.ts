import { parseAsStringEnum } from "nuqs";
import { z } from "zod";

import type { OverviewKpisArgs, OverviewSignalArgs } from "@/entities/event";

/**
 * URL-state for the curated Overview home (ADR 0099/0027): a single `range` preset in the
 * query string so the console home is a shareable, bookmarkable link. nuqs binds the
 * control to the URL; the Zod schema (ADR 0017) is the validation authority and the source
 * of the `OverviewRange` type. The equal-length PREVIOUS window (for deltas + goal-pace) is
 * computed in SQL by `fn_overview_kpis` (the `_prev` columns) — this module only bounds the
 * current `[from, to)` window and maps it to the two RPC argument bags.
 */

/** Relative date-range presets (resolved to an explicit window at query time). */
export const RANGES = ["7d", "30d", "90d"] as const;
export type OverviewRange = (typeof RANGES)[number];

/** Default range: a trailing 30 days. */
export const DEFAULT_RANGE: OverviewRange = "30d";

/**
 * Validation authority for the resolved range (ADR 0017): an out-of-range URL value falls
 * back to the default rather than discarding the view.
 */
export const overviewRangeSchema = z.enum(RANGES).catch(DEFAULT_RANGE);

/** nuqs parser for the single `range` control (absent from the URL until changed). */
export const overviewParsers = {
  range: parseAsStringEnum<OverviewRange>([...RANGES]).withDefault(
    DEFAULT_RANGE,
  ),
};

const DAYS: Record<OverviewRange, number> = { "7d": 7, "30d": 30, "90d": 90 };
const DAY_MS = 86_400_000;

/**
 * The signal-sparkline bucket granularity per range: daily for the short spans, weekly for
 * 90d (mirrored by the SQL `p_interval` guard in `fn_overview_signal`).
 */
export function signalInterval(range: OverviewRange): "day" | "week" {
  return range === "90d" ? "week" : "day";
}

/**
 * Resolve a relative range to an explicit half-open `[from, to)` window. `to` is floored to
 * the next UTC midnight so the window — and therefore the TanStack query key — is stable
 * across re-renders within the same day (no cache thrash from a live clock). `now` is
 * injected so the resolution is deterministic and unit-testable. The span (`to - from`)
 * equals the range length, so the SQL `_prev` window is the equal-length adjacent span.
 */
export function resolveWindow(
  range: OverviewRange,
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

/** Map the range to the `fn_overview_kpis` argument bag (project + current window). */
export function toKpisArgs(
  range: OverviewRange,
  projectId: string,
  now: Date,
): OverviewKpisArgs {
  const { from, to } = resolveWindow(range, now);
  return { p_project_id: projectId, p_from: from, p_to: to };
}

/** Map the range to the `fn_overview_signal` argument bag (window + bucket interval). */
export function toSignalArgs(
  range: OverviewRange,
  projectId: string,
  now: Date,
): OverviewSignalArgs {
  const { from, to } = resolveWindow(range, now);
  return {
    p_project_id: projectId,
    p_from: from,
    p_to: to,
    p_interval: signalInterval(range),
  };
}

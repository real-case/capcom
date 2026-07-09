import { z } from "zod";

import type { AnalyticsEvent } from "@/entities/event";
import {
  defaultConfigForKind,
  reportConfigToSearchParams,
  reportKindRoute,
  type ReportConfig,
} from "@/entities/report";
import {
  MAX_IN_VALUES,
  segmentRuleSchema,
  TRAIT_KEYS,
  type AttributePredicate,
  type SegmentRule,
} from "@/entities/segment";

import { jsonRecord, trait } from "./presentation";

/**
 * Bulk actions over the row selection (PR-18, ADR 0097): CSV serialization of the
 * SELECTED already-fetched rows, and read-only deep-links into the existing analysis
 * surfaces via the report entity's kind→route map + config→URL-state serializer
 * (ADR 0090) — the same reopen path a saved report and the AI query panel use. Every
 * config is built through the target grammar's Zod schema (the segment rule via
 * `[segment]`, ADR 0089/0017), never a hand-assembled query string; the destination
 * widget re-validates its URL-state on open, so a malformed link degrades to defaults.
 *
 * Selection drives navigation and export ONLY — events are immutable (ADR 0083), so
 * there is no delete or edit path here by design. The CSV is a per-row serialization
 * of rows the database already returned, not a reduction (ADR 0084) — every total
 * stays with `fn_events_summary`.
 */

// ── CSV export ────────────────────────────────────────────────────────────────────────

/** Stable, machine-readable header — DB column names, never localized copy. */
const CSV_COLUMNS = [
  "id",
  "event_name",
  "distinct_id",
  "plan",
  "country",
  "device",
  "amount",
  "currency",
  "ts",
  "properties",
] as const;

/** RFC 4180 field escaping: quote when the value carries a comma/quote/newline. */
function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value;
}

/**
 * Serialize the selected rows to RFC 4180 CSV (CRLF records, quoted/doubled specials).
 * The trait columns mirror the table's cells; the full jsonb `properties` bag rides
 * along as one JSON-encoded column so no property is lost in the flattening.
 */
export function toCsv(rows: readonly AnalyticsEvent[]): string {
  const lines = [CSV_COLUMNS.join(",")];
  for (const row of rows) {
    const props = jsonRecord(row.properties);
    const amount =
      typeof props.amount === "number" && Number.isFinite(props.amount)
        ? String(props.amount)
        : "";
    const currency = typeof props.currency === "string" ? props.currency : "";
    const cells = [
      row.id,
      row.event_name,
      row.distinct_id,
      trait(row, "plan") ?? "",
      trait(row, "country") ?? "",
      trait(row, "device") ?? "",
      amount,
      currency,
      row.ts,
      row.properties === null ? "" : JSON.stringify(row.properties),
    ];
    lines.push(cells.map(csvField).join(","));
  }
  return `${lines.join("\r\n")}\r\n`;
}

/** The export filename for a reference timestamp (injected, so it is deterministic). */
export function csvFilename(nowMs: number): string {
  return `events-${new Date(nowMs).toISOString().slice(0, 10)}.csv`;
}

// ── Build funnel — selected rows' event names → an ordered step list ──────────────────

/**
 * Step bounds mirrored from the funnel widget's `funnelQuerySchema` (same-layer widget
 * slices cannot import each other, ADR 0065/0066) — the ADR 0090 mirror-with-comment
 * posture; the funnel surface re-validates on open, so drift degrades to its defaults.
 * Keep in lockstep with `src/widgets/funnel-builder/model/url-state.ts`.
 */
export const FUNNEL_MIN_STEPS = 2;
export const FUNNEL_MAX_STEPS = 6;
const funnelStepsSchema = z
  .array(z.string().min(1).max(200))
  .min(FUNNEL_MIN_STEPS)
  .max(FUNNEL_MAX_STEPS);

/**
 * The selection's distinct event names in first-occurrence chronological order (`ts`
 * ascending) — the order the events actually happened is the funnel-step order —
 * capped at the funnel's step maximum.
 */
export function funnelStepsFromSelection(
  rows: readonly AnalyticsEvent[],
): string[] {
  const chronological = [...rows].sort((a, b) => a.ts.localeCompare(b.ts));
  const steps: string[] = [];
  for (const row of chronological) {
    if (!steps.includes(row.event_name)) steps.push(row.event_name);
    if (steps.length === FUNNEL_MAX_STEPS) break;
  }
  return steps;
}

/**
 * The funnel surface's deep-link for the selection, or `null` when the selection
 * cannot form a funnel (fewer than two distinct event names). Range/window come from
 * the report entity's funnel defaults (ADR 0090).
 */
export function funnelDeepLink(
  projectId: string,
  rows: readonly AnalyticsEvent[],
): string | null {
  const steps = funnelStepsSchema.safeParse(funnelStepsFromSelection(rows));
  if (!steps.success) return null;
  const config: ReportConfig = {
    ...defaultConfigForKind.funnel,
    steps: steps.data,
  };
  const qs = reportConfigToSearchParams("funnel", config);
  return `/p/${projectId}/${reportKindRoute.funnel}?${qs}`;
}

// ── Add to segment — selected rows' traits → a segment rule ───────────────────────────

/**
 * A segment rule matching users shaped like the selection: for each trait key present
 * on the selected rows' `properties`, one attribute predicate over the distinct values
 * (`eq` for a single value, `in` for several, sorted so the same selection always
 * yields the same link). Built through the `[segment]` grammar (ADR 0089/0017) —
 * `null` when the selection carries no trait at all (an empty rule would match every
 * user) or the values fall outside the grammar.
 */
export function segmentRuleFromSelection(
  rows: readonly AnalyticsEvent[],
): SegmentRule | null {
  const attributes: AttributePredicate[] = [];
  for (const key of TRAIT_KEYS) {
    const values = [
      ...new Set(
        rows
          .map((row) => trait(row, key))
          .filter((value): value is string => value !== undefined),
      ),
    ].sort();
    const [only] = values;
    if (only === undefined) continue;
    if (values.length === 1) {
      attributes.push({ key, op: "eq", value: only });
    } else {
      attributes.push({ key, op: "in", value: values.slice(0, MAX_IN_VALUES) });
    }
  }
  if (attributes.length === 0) return null;
  const rule = segmentRuleSchema.safeParse({
    match: "all",
    attributes,
    behaviors: [],
  });
  return rule.success ? rule.data : null;
}

/**
 * The segment surface's deep-link for the selection, or `null` when no rule can be
 * built. Dimension/range come from the report entity's segment defaults (ADR 0090).
 */
export function segmentDeepLink(
  projectId: string,
  rows: readonly AnalyticsEvent[],
): string | null {
  const rule = segmentRuleFromSelection(rows);
  if (rule === null) return null;
  const config: ReportConfig = { ...defaultConfigForKind.segment, rule };
  const qs = reportConfigToSearchParams("segment", config);
  return `/p/${projectId}/${reportKindRoute.segment}?${qs}`;
}

import { z } from "zod";

import {
  reportConfigToSearchParams,
  reportKindRoute,
  type ReportConfig,
} from "@/entities/report";
import {
  SEGMENT_EVENTS,
  TRAIT_KEYS,
  segmentRuleSchema,
  type SegmentRule,
} from "@/entities/segment";

/**
 * The `[ai-query]` query-spec — the closed grammar the AI translation targets
 * (ADR 0091). A spec is a discriminated union over the four analysis kinds whose
 * `config` is *exactly* the originating surface's URL-state (ADR 0027): a spec is
 * a `reports` row's `{ kind, config }` minus its `name` (ADR 0090). This schema is
 * the single validation authority (ADR 0017) **and the injection boundary**: a
 * model's raw output is `safeParse`d against it and **rejected, never coerced** on
 * any mismatch, so an untrusted model can at worst pick a *valid* analysis — never
 * inject SQL/an RPC/a URL (ADR 0089's closed-grammar guarantee, applied to model
 * output). A validated spec is *interpreted* by deep-linking to the existing
 * surface (`specToDeepLink`); the AI slice never calls an RPC or renders a chart.
 *
 * The `segment` rule grammar and the event/dimension vocabularies are reused from
 * `entities/segment` (a downward FSD import). The small per-kind URL-state enums
 * below are **mirrored** from each widget's `model/url-state.ts` — the widgets
 * layer cannot be imported upward (ADR 0065/0066), so this is the same
 * mirror-with-comment posture ADR 0090 took for `defaultConfigForKind`; the
 * destination widget re-validates on reopen, so any drift degrades to a default
 * fallback, never an error. Keep each list in lockstep with its widget schema.
 */

/** The canonical event vocabulary the seed emits — reused from the segment entity. */
export const AI_EVENTS = SEGMENT_EVENTS;
export const aiEventSchema = z.enum(AI_EVENTS);

// — Mirrored per-kind URL-state enums (ADR 0090 mirror posture; see above) ——————
const TRENDS_RANGES = ["7d", "30d", "90d"] as const; // ↔ trendsQuerySchema.range
const TRENDS_INTERVALS = ["hour", "day", "week", "month"] as const;
const TRENDS_BREAKDOWNS = [
  "none",
  "device",
  "plan",
  "country",
  "path",
  "referrer",
] as const;
const FUNNEL_RANGES = ["7d", "30d", "90d"] as const; // ↔ funnelQuerySchema.range
const FUNNEL_WINDOWS = ["1d", "7d", "14d", "30d"] as const;
const RETENTION_RANGES = ["30d", "90d", "180d"] as const; // ↔ retentionQuerySchema.range
const RETENTION_PERIODS = ["week", "month"] as const;
const SEGMENT_RANGES = ["30d", "90d", "180d"] as const; // ↔ segmentQuerySchema.range
/** UI step bound; the SQL guard allows up to 10 (ADR 0087), mirrored from the widget. */
export const FUNNEL_MIN_STEPS = 2;
export const FUNNEL_MAX_STEPS = 6;

/**
 * Per-kind config schemas. `strictObject` rejects unknown keys so an injected
 * extra field is surfaced, not silently dropped (the ADR 0017/0089 boundary
 * posture; matches `segmentRuleSchema`'s `strictObject`).
 */
export const trendsConfigSchema = z.strictObject({
  event: aiEventSchema,
  range: z.enum(TRENDS_RANGES),
  interval: z.enum(TRENDS_INTERVALS),
  breakdown: z.enum(TRENDS_BREAKDOWNS),
});
export const funnelConfigSchema = z.strictObject({
  steps: z.array(aiEventSchema).min(FUNNEL_MIN_STEPS).max(FUNNEL_MAX_STEPS),
  range: z.enum(FUNNEL_RANGES),
  window: z.enum(FUNNEL_WINDOWS),
});
export const retentionConfigSchema = z.strictObject({
  range: z.enum(RETENTION_RANGES),
  period: z.enum(RETENTION_PERIODS),
});
export const segmentConfigSchema = z.strictObject({
  rule: segmentRuleSchema,
  dimension: z.enum(TRAIT_KEYS),
  range: z.enum(SEGMENT_RANGES),
});

/**
 * The closed `[ai-query]` spec. Discriminated on `kind` (the `report_kind`
 * enum, ADR 0090); each arm pairs the literal kind with its strict config.
 */
export const aiQuerySpecSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("trends"), config: trendsConfigSchema }),
  z.strictObject({ kind: z.literal("funnel"), config: funnelConfigSchema }),
  z.strictObject({
    kind: z.literal("retention"),
    config: retentionConfigSchema,
  }),
  z.strictObject({ kind: z.literal("segment"), config: segmentConfigSchema }),
]);
export type AiQuerySpec = z.infer<typeof aiQuerySpecSchema>;

/** Bound on the free-text prompt (the `[ai-query]` request, ADR 0091). */
export const MAX_PROMPT_LENGTH = 500;
export const translateInputSchema = z.object({
  projectId: z.string().min(1),
  prompt: z.string().trim().min(1).max(MAX_PROMPT_LENGTH),
});
export type TranslateInput = z.infer<typeof translateInputSchema>;

/**
 * Turn a validated spec into the destination surface's deep-link (ADR 0090/0091):
 * the same route map + URL-state serialization a saved report uses to reopen on
 * its surface (ADR 0027). The surface widget hydrates and re-validates the
 * URL-state — so the AI slice never calls an RPC, builds a query, or renders a
 * chart (no aggregation in app code, ADR 0084; FSD downward-only, ADR 0065/0066).
 */
export function specToDeepLink(spec: AiQuerySpec, projectId: string): string {
  // The spec's config is a typed subset of a ReportConfig (a JSON object); the
  // serializer reads only the keys it knows for the kind.
  const qs = reportConfigToSearchParams(
    spec.kind,
    spec.config as unknown as ReportConfig,
  );
  return `/p/${projectId}/${reportKindRoute[spec.kind]}${qs ? `?${qs}` : ""}`;
}

/** One field of an interpreted spec for the UI to render with a localized label. */
export type SpecFieldKey =
  | "event"
  | "range"
  | "interval"
  | "breakdown"
  | "steps"
  | "window"
  | "period"
  | "dimension"
  | "rule";
export type SpecField = { key: SpecFieldKey; value: string };

/** Render a segment rule as a short, human-readable predicate string. */
function describeRule(rule: SegmentRule): string {
  const parts: string[] = [];
  for (const a of rule.attributes) {
    if (a.op === "in") parts.push(`${a.key} ∈ [${a.value.join(", ")}]`);
    else parts.push(`${a.key} ${a.op === "eq" ? "=" : "≠"} ${a.value}`);
  }
  for (const b of rule.behaviors) {
    parts.push(`${b.event} ${b.op === "at_least" ? "≥" : "≤"} ${b.count}`);
  }
  return parts.length ? parts.join(" AND ") : "all users";
}

/**
 * Extract the ordered, display-ready fields of an interpreted spec so the panel
 * can show a plain-language summary before the user opens the analysis (ADR 0091
 * — a wrong interpretation is visible, never silently run). Pure: the UI maps each
 * `key` to a localized label.
 */
export function summarizeSpec(spec: AiQuerySpec): SpecField[] {
  switch (spec.kind) {
    case "trends":
      return [
        { key: "event", value: spec.config.event },
        { key: "range", value: spec.config.range },
        { key: "interval", value: spec.config.interval },
        { key: "breakdown", value: spec.config.breakdown },
      ];
    case "funnel":
      return [
        { key: "steps", value: spec.config.steps.join(" → ") },
        { key: "range", value: spec.config.range },
        { key: "window", value: spec.config.window },
      ];
    case "retention":
      return [
        { key: "range", value: spec.config.range },
        { key: "period", value: spec.config.period },
      ];
    case "segment":
      return [
        { key: "rule", value: describeRule(spec.config.rule) },
        { key: "dimension", value: spec.config.dimension },
        { key: "range", value: spec.config.range },
      ];
  }
}

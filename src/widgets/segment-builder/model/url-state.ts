import { parseAsJson, parseAsStringEnum } from "nuqs";
import { z } from "zod";

import {
  ruleToJson,
  segmentRuleSchema,
  TRAIT_KEYS,
  type SegmentDistributionArgs,
  type SegmentRule,
  type SegmentSizeArgs,
} from "@/entities/segment";

/**
 * URL-state for the segment builder (ADR 0027): the whole segment rule, the distribution
 * dimension, and the analysis range live in the query string so a segment is a shareable,
 * bookmarkable link. nuqs binds the controls to the URL; the `[segment]` rule schema and
 * this query schema (ADR 0017) are the validation authority. The rule's meaning is fixed
 * by ADR 0089.
 */

/** Analysis-range presets — bound the behavioural-predicate counts (resolved at query time). */
export const RANGES = ["30d", "90d", "180d"] as const;
/** Distribution dimensions: the trait keys the matched users are broken down by (ADR 0089). */
export const DIMENSIONS = TRAIT_KEYS;

export type Range = (typeof RANGES)[number];
export type Dimension = (typeof DIMENSIONS)[number];

/**
 * Curated value vocabulary per trait — the options the builder's attribute-value controls
 * offer (the seed's trait values, ADR 0085). Curated rather than data-derived, mirroring
 * the funnel's `FUNNEL_EVENTS`: every control is a select/checkbox of known values, so the
 * builder only ever produces a schema-valid rule (no transient-invalid state that would
 * revert a shared link). A trait value present in data but absent here just isn't authorable
 * via the UI — a conscious demo scope choice.
 */
export const TRAIT_VALUES: Record<Dimension, readonly string[]> = {
  plan: ["free", "pro", "enterprise"],
  country: ["US", "GB", "DE", "FR", "CA", "IN", "BR", "JP", "AU"],
  device: ["desktop", "mobile", "tablet"],
  referrer: ["organic", "google", "twitter", "newsletter", "direct"],
};

/**
 * Default demo segment: paying users who have purchased at least once — a non-trivial
 * AND of an attribute and a behavioural predicate, broken down by country.
 */
export const DEFAULT_RULE: SegmentRule = {
  match: "all",
  attributes: [{ key: "plan", op: "eq", value: "pro" }],
  behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
};

/** Validation authority for the resolved URL-state (ADR 0017). */
export const segmentQuerySchema = z.object({
  rule: segmentRuleSchema,
  dimension: z.enum(DIMENSIONS),
  range: z.enum(RANGES),
});
export type SegmentQuery = z.infer<typeof segmentQuerySchema>;

export const DEFAULT_SEGMENT_QUERY: SegmentQuery = {
  rule: DEFAULT_RULE,
  dimension: "country",
  range: "90d",
};

/**
 * nuqs parser map for `useQueryStates`. The rule is a JSON-encoded value validated by the
 * `[segment]` schema on read (a malformed shared link falls back to the default); the
 * dimension and range are enums. Each parser carries the matching default so an absent key
 * reads as the default (and is omitted from the URL until changed).
 */
export const segmentParsers = {
  rule: parseAsJson((value) => segmentRuleSchema.parse(value)).withDefault(
    DEFAULT_RULE,
  ),
  dimension: parseAsStringEnum<Dimension>([...DIMENSIONS]).withDefault(
    DEFAULT_SEGMENT_QUERY.dimension,
  ),
  range: parseAsStringEnum<Range>([...RANGES]).withDefault(
    DEFAULT_SEGMENT_QUERY.range,
  ),
};

const DAYS: Record<Range, number> = { "30d": 30, "90d": 90, "180d": 180 };
const DAY_MS = 86_400_000;

/**
 * Resolve a relative range to an explicit half-open `[from, to)` window — the window the
 * behavioural-predicate counts are taken over (ADR 0089). `to` is floored to the next UTC
 * midnight so the window — and the TanStack query key — is stable across re-renders within
 * the same day. `now` is injected so the resolution is deterministic and unit-testable.
 * (Mirrors the trends/funnel/retention resolvers; kept slice-local so the widgets stay
 * independent under FSD.)
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

/** Map URL-state to the `fn_segment_size` argument bag (ADR 0089). */
export function toSegmentSizeArgs(
  query: SegmentQuery,
  projectId: string,
  now: Date,
): SegmentSizeArgs {
  const { from, to } = resolveWindow(query.range, now);
  return {
    p_project_id: projectId,
    p_rule: ruleToJson(query.rule),
    p_from: from,
    p_to: to,
  };
}

/** Map URL-state to the `fn_segment_distribution` argument bag (ADR 0089). */
export function toSegmentDistributionArgs(
  query: SegmentQuery,
  projectId: string,
  now: Date,
): SegmentDistributionArgs {
  const { from, to } = resolveWindow(query.range, now);
  return {
    p_project_id: projectId,
    p_rule: ruleToJson(query.rule),
    p_dimension: query.dimension,
    p_from: from,
    p_to: to,
  };
}

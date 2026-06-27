import { z } from "zod";

import type { Json } from "@/lib/supabase/database.types";

/**
 * The segment-rule boundary schema `[segment]` (ADR 0089 / 0017).
 *
 * A segment is a CLOSED jsonb rule that defines a sub-population of tracked users by
 * their attributes and behaviour. This schema is the single client-side validation
 * authority for that rule (ADR 0017): types are inferred from it, never hand-written,
 * and every message carries the `[segment]` origin marker so a validation failure
 * names its boundary. It is the exact shape the `fn_segment_size` /
 * `fn_segment_distribution` RPCs interpret in-database (ADR 0089) — and the shape a
 * future PR-8 `segments.definition` column will persist.
 *
 * The grammar is deliberately bounded (ADR 0089): attribute predicates over
 * `profiles.traits` (`eq | neq | in`) and behavioural predicates over the `events`
 * stream (`at_least | at_most` a count in the analysis window), combined by AND only
 * (`match: "all"`). OR/nested logic, per-predicate windows, and numeric `properties`
 * predicates are stated scope boundaries — each an additive extension, none reopening
 * this shape.
 */

/**
 * Trait keys offered by the builder (the seed's profile traits, ADR 0085). The SQL
 * grammar does not restrict the key (ADR 0089); this schema — the client authority —
 * bounds it to the meaningful set, which doubles as the distribution dimensions.
 */
export const TRAIT_KEYS = ["plan", "country", "device", "referrer"] as const;
/** Curated event vocabulary for behavioural predicates: the canonical events the seed emits. */
export const SEGMENT_EVENTS = [
  "page_view",
  "sign_up",
  "feature_used",
  "search",
  "purchase",
] as const;
/** Attribute-predicate operators (ADR 0089): equality, inequality, set membership. */
export const ATTRIBUTE_OPS = ["eq", "neq", "in"] as const;
/** Behavioural-predicate operators (ADR 0089): a frequency floor / ceiling over the window. */
export const BEHAVIOR_OPS = ["at_least", "at_most"] as const;

export type TraitKey = (typeof TRAIT_KEYS)[number];
export type SegmentEvent = (typeof SEGMENT_EVENTS)[number];
export type AttributeOp = (typeof ATTRIBUTE_OPS)[number];
export type BehaviorOp = (typeof BEHAVIOR_OPS)[number];

/** Per-list predicate cap (UI + sanity bound) and the `in`-value / count bounds. */
export const MAX_PREDICATES = 8;
export const MAX_IN_VALUES = 20;
export const MAX_BEHAVIOR_COUNT = 1_000_000;

const traitKey = z.enum(TRAIT_KEYS);
const predicateValue = z
  .string()
  .min(1, "[segment] value is required")
  .max(200, "[segment] value must be at most 200 characters");

/**
 * One attribute predicate, discriminated on `op` so `in` carries an array value while
 * `eq`/`neq` carry a single string — the shape `traits ->> key <op> value` evaluates
 * against in SQL (ADR 0089).
 */
export const attributePredicateSchema = z.discriminatedUnion("op", [
  z.object({ key: traitKey, op: z.literal("eq"), value: predicateValue }),
  z.object({ key: traitKey, op: z.literal("neq"), value: predicateValue }),
  z.object({
    key: traitKey,
    op: z.literal("in"),
    value: z
      .array(predicateValue)
      .min(1, "[segment] in-predicate needs at least one value")
      .max(MAX_IN_VALUES),
  }),
]);

/**
 * One behavioural predicate: the user performed `event` `at_least`/`at_most` `count`
 * times in the analysis window (ADR 0089). `at_least 1` means "performed"; `at_most 0`
 * means "never performed" — so absence needs no separate negation operator.
 */
export const behaviorPredicateSchema = z.object({
  event: z.enum(SEGMENT_EVENTS),
  op: z.enum(BEHAVIOR_OPS),
  count: z
    .number()
    .int("[segment] count must be a whole number")
    .min(0, "[segment] count must be non-negative")
    .max(MAX_BEHAVIOR_COUNT),
});

/**
 * A complete segment rule. `match` is recorded but fixed to `"all"` (AND) for now, so a
 * future `"any"` (OR) is an additive value, not a schema change (ADR 0089). Both
 * predicate lists default to empty — an empty rule matches every tracked user.
 */
export const segmentRuleSchema = z.object({
  match: z.literal("all").default("all"),
  attributes: z.array(attributePredicateSchema).max(MAX_PREDICATES).default([]),
  behaviors: z.array(behaviorPredicateSchema).max(MAX_PREDICATES).default([]),
});

export type AttributePredicate = z.infer<typeof attributePredicateSchema>;
export type BehaviorPredicate = z.infer<typeof behaviorPredicateSchema>;
export type SegmentRule = z.infer<typeof segmentRuleSchema>;

/**
 * Cast a validated `SegmentRule` to the generated `Json` type for the RPC argument bag.
 * The rule is a plain object of strings / string arrays / integers — structurally a
 * `Json` value — but TypeScript can't infer that through `z.infer`, so the cast is made
 * here, once, behind the schema that guarantees the shape (ADR 0017/0089).
 */
export function ruleToJson(rule: SegmentRule): Json {
  return rule as unknown as Json;
}

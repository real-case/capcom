/**
 * Public API of the `segment` entity (ADR 0065/0066). Consumers import
 * `@/entities/segment`, never a deep segment path. Groups the segment-domain code: the
 * `[segment]` rule schema (the ADR 0089 definition + ADR 0017 validation authority), its
 * inferred types and controlled vocabularies, the generated RPC types, and the
 * RLS-scoped fetchers over the two in-database aggregation functions.
 */
export {
  ATTRIBUTE_OPS,
  BEHAVIOR_OPS,
  MAX_BEHAVIOR_COUNT,
  MAX_IN_VALUES,
  MAX_PREDICATES,
  SEGMENT_EVENTS,
  TRAIT_KEYS,
  attributePredicateSchema,
  behaviorPredicateSchema,
  ruleToJson,
  segmentRuleSchema,
} from "./model/rule";
export type {
  AttributeOp,
  AttributePredicate,
  BehaviorOp,
  BehaviorPredicate,
  SegmentEvent,
  SegmentRule,
  TraitKey,
} from "./model/rule";
export type {
  SegmentDistributionArgs,
  SegmentDistributionRow,
  SegmentSizeArgs,
} from "./model/types";
export { fetchSegmentDistribution, fetchSegmentSize } from "./api/queries";

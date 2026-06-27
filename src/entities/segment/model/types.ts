import type { Database } from "@/lib/supabase/database.types";

/**
 * The argument bag for the `fn_segment_size` RPC (generated, ADR 0015): the project,
 * the `p_rule` jsonb (a validated `SegmentRule`, sent via `ruleToJson`), and the
 * behavioural-window bounds. Derived from the generated signature so a SQL change
 * surfaces here at compile time.
 */
export type SegmentSizeArgs =
  Database["public"]["Functions"]["fn_segment_size"]["Args"];

/** The argument bag for the `fn_segment_distribution` RPC (generated, ADR 0015). */
export type SegmentDistributionArgs =
  Database["public"]["Functions"]["fn_segment_distribution"]["Args"];

/**
 * One reduced row from the `fn_segment_distribution` aggregation (ADR 0089, under the
 * 0084 strategy): a `bucket` (one value of the chosen trait dimension, or `(unknown)`
 * for absent traits) and the count of distinct matching `users` in it. `SUM(users)`
 * over the rows equals `fn_segment_size`. Generated RPC return type (ADR 0015).
 */
export type SegmentDistributionRow =
  Database["public"]["Functions"]["fn_segment_distribution"]["Returns"][number];

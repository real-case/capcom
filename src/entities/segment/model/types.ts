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

/** The argument bag for the `fn_segment_scatter` RPC (generated, ADR 0015). `p_limit` is optional — it defaults to 300 in SQL. */
export type SegmentScatterArgs =
  Database["public"]["Functions"]["fn_segment_scatter"]["Args"];

/**
 * One reduced point from the `fn_segment_scatter` aggregation (ADR 0084/0099): a tracked
 * user's `frequency` (their event count in the window) against their `ltv` (the summed
 * numeric `properties.amount` over their purchases, 0 when none), plus the `plan` trait
 * used to colour the point (`null` when the user has no profile row). The set is
 * events-driven — a point exists only for a user with at least one event in the window, so
 * `frequency >= 1` always — and is capped in SQL by `p_limit`, ordered by `ltv` descending.
 * Generated RPC return type (ADR 0015).
 */
export type SegmentScatterPoint =
  Database["public"]["Functions"]["fn_segment_scatter"]["Returns"][number];

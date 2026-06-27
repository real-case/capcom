import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  SegmentDistributionArgs,
  SegmentDistributionRow,
  SegmentSizeArgs,
} from "../model/types";

/**
 * Read access for the segment entity (ADR 0013/0084). Both fetchers call a
 * `SECURITY INVOKER` set-returning/scalar function as RPC; because those functions run
 * under the caller's RLS, the reduction is scoped to the caller's projects and a
 * non-member receives size 0 / zero rows (ADR 0083/0089). The functions own the entire
 * computation — interpreting the closed jsonb rule, intersecting the predicate sets,
 * grouping by the dimension — and these fetchers only forward the typed argument bag and
 * return the already-reduced result; they perform no client-side reduction.
 */

/**
 * Segment size (ADR 0089): the count of distinct tracked users matching a rule, via the
 * `fn_segment_size` RPC. Returns 0 when no user matches (or the caller is a non-member).
 */
export async function fetchSegmentSize(
  supabase: SupabaseClient<Database>,
  args: SegmentSizeArgs,
): Promise<number> {
  const { data, error } = await supabase.rpc("fn_segment_size", args);
  if (error) throw error;
  return data ?? 0;
}

/**
 * Segment distribution (ADR 0089): the matched users grouped by one trait dimension,
 * via the `fn_segment_distribution` RPC. Rows are ordered by `users` descending, absent
 * traits folded into a single `(unknown)` bucket, and `SUM(users)` equals the size.
 */
export async function fetchSegmentDistribution(
  supabase: SupabaseClient<Database>,
  args: SegmentDistributionArgs,
): Promise<SegmentDistributionRow[]> {
  const { data, error } = await supabase.rpc("fn_segment_distribution", args);
  if (error) throw error;
  return data ?? [];
}

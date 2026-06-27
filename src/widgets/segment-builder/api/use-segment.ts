// No "use client" here: this hook module is only imported by the interactive leaf
// (SegmentBuilder.tsx), which owns the client boundary — the directive belongs at the
// leaf, not widened across the hook module (ADR 0002).
import { useQuery } from "@tanstack/react-query";

import {
  fetchSegmentDistribution,
  fetchSegmentSize,
  type SegmentDistributionArgs,
  type SegmentSizeArgs,
} from "@/entities/segment";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Server-state hooks for the segment builder (ADR 0025/0084). Each wraps an in-database
 * aggregation behind its entity fetcher, keyed by the exact argument bag (the jsonb rule
 * included) so any control change is a fresh cache entry; staleness resolves by
 * refetch/poll, never realtime (ADR 0012/0079). The hooks own no aggregation — the SQL
 * functions do (ADR 0084/0089) — and the widget that consumes them owns no fetching.
 *
 * The browser Supabase client (ADR 0013) runs the RPC as the signed-in member, so the
 * `SECURITY INVOKER` functions inherit that member's RLS scope.
 */

/** The distinct-user size of the segment defined by `args.p_rule`. */
export function useSegmentSize(args: SegmentSizeArgs) {
  return useQuery({
    queryKey: queryKeys.segment.size(args),
    queryFn: () => fetchSegmentSize(createClient(), args),
  });
}

/** The matched users broken down by `args.p_dimension`. */
export function useSegmentDistribution(args: SegmentDistributionArgs) {
  return useQuery({
    queryKey: queryKeys.segment.distribution(args),
    queryFn: () => fetchSegmentDistribution(createClient(), args),
  });
}

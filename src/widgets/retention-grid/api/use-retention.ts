// No "use client" here: this hook module is only imported by the interactive leaf
// (RetentionGrid.tsx), which owns the client boundary — the directive belongs at the
// leaf, not widened across the hook module (ADR 0002).
import { useQuery } from "@tanstack/react-query";

import { fetchRetention, type RetentionArgs } from "@/entities/event";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Server-state hook for the retention cohort grid (ADR 0025/0084). Wraps the in-database
 * `fn_retention` aggregation behind the entity fetcher, keyed by the exact argument bag
 * so any control change (range / period) is a fresh cache entry; staleness resolves by
 * refetch/poll, never realtime (ADR 0012/0079). The hook owns no aggregation — the SQL
 * function does (ADR 0084/0088) — and the widget that consumes it owns no fetching.
 *
 * The browser Supabase client (ADR 0013) runs the RPC as the signed-in member, so the
 * `SECURITY INVOKER` function inherits that member's RLS scope.
 */
export function useRetention(args: RetentionArgs) {
  return useQuery({
    queryKey: queryKeys.retention.cohorts(args),
    queryFn: () => fetchRetention(createClient(), args),
  });
}

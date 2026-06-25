"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchEventTrends,
  fetchTopEvents,
  type EventTrendsArgs,
  type TopEventsArgs,
} from "@/entities/event";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Server-state hooks for the trends explorer (ADR 0025/0084). Each wraps an
 * in-database aggregation RPC behind the entity fetchers, keyed by the exact
 * argument bag so a control change is a fresh cache entry; staleness resolves by
 * refetch/poll, never realtime (ADR 0012/0079). The hooks own no aggregation — the
 * SQL function does (ADR 0084) — and the widgets that consume them own no fetching.
 *
 * The browser Supabase client (ADR 0013) runs the RPC as the signed-in member, so
 * the `SECURITY INVOKER` functions inherit that member's RLS scope.
 */
export function useEventTrends(args: EventTrendsArgs) {
  return useQuery({
    queryKey: queryKeys.trends.series(args),
    queryFn: () => fetchEventTrends(createClient(), args),
  });
}

export function useTopEvents(args: TopEventsArgs) {
  return useQuery({
    queryKey: queryKeys.trends.top(args),
    queryFn: () => fetchTopEvents(createClient(), args),
  });
}

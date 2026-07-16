// No "use client" here: this hook module is only imported by the interactive leaf
// (OverviewDashboard.tsx), which owns the client boundary — the directive belongs at the
// leaf, not widened across the hook module (ADR 0002).
import { useQuery } from "@tanstack/react-query";

import {
  fetchEventTrends,
  fetchFunnel,
  fetchOverviewKpis,
  fetchOverviewSignal,
  type EventTrendsArgs,
  type FunnelArgs,
  type OverviewKpisArgs,
  type OverviewSignalArgs,
} from "@/entities/event";
import {
  fetchSegmentScatter,
  type SegmentScatterArgs,
} from "@/entities/segment";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Server-state hooks for the curated Overview home (ADR 0025/0084/0099). Each wraps an
 * in-database aggregation RPC behind the entity fetchers, keyed by the exact argument bag so
 * a range change is a fresh cache entry; staleness resolves by refetch/poll, never realtime
 * (ADR 0012/0079). The hooks own no aggregation — the SQL functions do (ADR 0084) — and the
 * widget that consumes them owns no fetching. The browser Supabase client (ADR 0013) runs
 * the RPC as the signed-in member, so the `SECURITY INVOKER` functions inherit that member's
 * RLS scope.
 */
export function useOverviewKpis(args: OverviewKpisArgs) {
  return useQuery({
    queryKey: queryKeys.overview.kpis(args),
    queryFn: () => fetchOverviewKpis(createClient(), args),
  });
}

export function useOverviewSignal(args: OverviewSignalArgs) {
  return useQuery({
    queryKey: queryKeys.overview.signal(args),
    queryFn: () => fetchOverviewSignal(createClient(), args),
  });
}

/** The b-hero multi-series trend (daily activity by plan), via the existing fn_event_trends. */
export function useOverviewHero(args: EventTrendsArgs) {
  return useQuery({
    queryKey: queryKeys.overview.hero(args),
    queryFn: () => fetchEventTrends(createClient(), args),
  });
}

/** The b-bars stacked series (sign-ups by plan), via the existing fn_event_trends. */
export function useOverviewBars(args: EventTrendsArgs) {
  return useQuery({
    queryKey: queryKeys.overview.bars(args),
    queryFn: () => fetchEventTrends(createClient(), args),
  });
}

/** The b-funnel activation funnel, via the existing fn_funnel. */
export function useActivationFunnel(args: FunnelArgs) {
  return useQuery({
    queryKey: queryKeys.overview.funnel(args),
    queryFn: () => fetchFunnel(createClient(), args),
  });
}

/** The b-seg frequency × LTV scatter, via the precursor's fn_segment_scatter. */
export function useSegmentScatter(args: SegmentScatterArgs) {
  return useQuery({
    queryKey: queryKeys.overview.scatter(args),
    queryFn: () => fetchSegmentScatter(createClient(), args),
  });
}

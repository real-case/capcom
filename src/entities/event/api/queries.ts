import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  AnalyticsEvent,
  EventTrendBucket,
  EventTrendsArgs,
  FunnelArgs,
  FunnelStep,
  RetentionArgs,
  RetentionCell,
  TopEvent,
  TopEventsArgs,
} from "../model/types";

/**
 * Read access for the event entity (ADR 0013). Reads run as the signed-in user
 * under RLS, so a non-member of the project sees nothing (ADR 0083); the explicit
 * `project_id` filter narrows a multi-project member to the one project asked for.
 * Events are written only through the ingest path (ADR 0085) — there is no member
 * write fetcher here by design.
 */

/** The most recent events in a project, newest first. */
export async function fetchRecentEvents(
  supabase: SupabaseClient<Database>,
  projectId: string,
  limit = 50,
): Promise<AnalyticsEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("project_id", projectId)
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/**
 * Trends aggregation (ADR 0084). Calls the `fn_event_trends` set-returning function
 * as RPC; because that function is `SECURITY INVOKER`, the reduction runs under the
 * caller's RLS and a non-member receives zero rows (ADR 0083). The function owns all
 * aggregation — this fetcher only forwards the typed argument bag and returns the
 * already-reduced rows; it performs no client-side reduction.
 */
export async function fetchEventTrends(
  supabase: SupabaseClient<Database>,
  args: EventTrendsArgs,
): Promise<EventTrendBucket[]> {
  const { data, error } = await supabase.rpc("fn_event_trends", args);
  if (error) throw error;
  return data ?? [];
}

/** Most-frequent events in a window (ADR 0084), via the `fn_top_events` RPC. */
export async function fetchTopEvents(
  supabase: SupabaseClient<Database>,
  args: TopEventsArgs,
): Promise<TopEvent[]> {
  const { data, error } = await supabase.rpc("fn_top_events", args);
  if (error) throw error;
  return data ?? [];
}

/**
 * Funnel aggregation (ADR 0087, under the 0084 strategy). Calls the `fn_funnel`
 * set-returning function as RPC; because that function is `SECURITY INVOKER`, the
 * ordered-step conversion runs under the caller's RLS and a non-member receives zero
 * rows (ADR 0083). The function owns the entire computation — first-touch entry,
 * at-or-after ordering, the total conversion window — and this fetcher only forwards
 * the typed argument bag and returns the already-reduced per-step rows; it performs
 * no client-side reduction.
 */
export async function fetchFunnel(
  supabase: SupabaseClient<Database>,
  args: FunnelArgs,
): Promise<FunnelStep[]> {
  const { data, error } = await supabase.rpc("fn_funnel", args);
  if (error) throw error;
  return data ?? [];
}

/**
 * Retention aggregation (ADR 0088, under the 0084 strategy). Calls the `fn_retention`
 * set-returning function as RPC; because that function is `SECURITY INVOKER`, the
 * acquisition-cohort retention runs under the caller's RLS and a non-member receives
 * zero rows — no cohorts (ADR 0083). The function owns the entire computation —
 * acquisition cohorting, calendar periods, active-in-period counting, the triangular
 * zero-filled grid — and this fetcher only forwards the typed argument bag and returns
 * the already-reduced cells; it performs no client-side reduction.
 */
export async function fetchRetention(
  supabase: SupabaseClient<Database>,
  args: RetentionArgs,
): Promise<RetentionCell[]> {
  const { data, error } = await supabase.rpc("fn_retention", args);
  if (error) throw error;
  return data ?? [];
}

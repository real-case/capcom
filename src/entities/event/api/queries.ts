import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  AnalyticsEvent,
  EventsSummary,
  EventsSummaryArgs,
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
 * A page of raw events for the events explorer (ADR 0097), newest-first. A
 * filtered, ordered, RANGED select over `public.events` under the caller's RLS
 * (ADR 0013/0083) — the raw-listing sibling of `fetchRecentEvents`, NOT an
 * aggregation (the footer totals come from `fetchEventsSummary`). `distinctId`
 * narrows to a single tracked user (the detail panel's recent-activity timeline).
 * Ordering pins `ts desc` with an `id` tiebreak so pagination is stable when
 * timestamps collide. No user input is ever assembled into SQL — every predicate is
 * a parameterized query-builder operator.
 */
export async function fetchEvents(
  supabase: SupabaseClient<Database>,
  projectId: string,
  {
    offset = 0,
    limit = 25,
    distinctId,
  }: { offset?: number; limit?: number; distinctId?: string } = {},
): Promise<AnalyticsEvent[]> {
  let query = supabase.from("events").select("*").eq("project_id", projectId);
  if (distinctId !== undefined) query = query.eq("distinct_id", distinctId);
  const { data, error } = await query
    .order("ts", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

/**
 * The events-explorer footer totals (ADR 0097, under the 0084 strategy): total
 * matching events, distinct users, and value sum, from the `SECURITY INVOKER`
 * `fn_events_summary` RPC — reduced in the database under the caller's RLS, never in
 * application code. Returns zeros when RLS yields no row (a non-member, ADR 0083);
 * the function forwards the typed argument bag verbatim and performs no reduction.
 */
export async function fetchEventsSummary(
  supabase: SupabaseClient<Database>,
  args: EventsSummaryArgs,
): Promise<EventsSummary> {
  const { data, error } = await supabase.rpc("fn_events_summary", args);
  if (error) throw error;
  return data?.[0] ?? { total_events: 0, distinct_users: 0, value_sum: 0 };
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

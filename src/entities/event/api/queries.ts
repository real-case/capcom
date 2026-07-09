import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type {
  AnalyticsEvent,
  EventsFacet,
  EventsFacetsArgs,
  EventsQueryFilter,
  EventsSortSpec,
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
 * A page of raw events for the events explorer (ADR 0097), newest-first by default. A
 * filtered, ordered, RANGED select over `public.events` under the caller's RLS
 * (ADR 0013/0083) — the raw-listing sibling of `fetchRecentEvents`, NOT an
 * aggregation (the footer totals come from `fetchEventsSummary`). `distinctId`
 * narrows to a single tracked user (the detail panel's recent-activity timeline);
 * `filter` applies the closed `[events-filter]` grammar (PR-17); `sort` is a bounded
 * multi-column order. No user input is ever assembled into SQL — every predicate is a
 * parameterized query-builder operator (`.ilike`/`.in`/`.gte`/`.lt`) and the sort
 * columns come from a closed union (ADR 0089). A trailing `id desc` tiebreak keeps
 * pagination stable when the requested sort keys collide.
 */
export async function fetchEvents(
  supabase: SupabaseClient<Database>,
  projectId: string,
  {
    offset = 0,
    limit = 25,
    distinctId,
    filter,
    sort,
  }: {
    offset?: number;
    limit?: number;
    distinctId?: string;
    filter?: EventsQueryFilter;
    sort?: EventsSortSpec;
  } = {},
): Promise<AnalyticsEvent[]> {
  let query = supabase.from("events").select("*").eq("project_id", projectId);
  if (distinctId !== undefined) query = query.eq("distinct_id", distinctId);

  if (filter) {
    const search = filter.search?.trim();
    if (search) query = query.ilike("event_name", `%${search}%`);
    if (filter.events?.length)
      query = query.in("event_name", [...filter.events]);
    // jsonb top-level keys read via the `->>'` path operator; PostgREST applies the
    // `in` predicate parameterized (values from the closed vocabulary, ADR 0089).
    if (filter.plans?.length)
      query = query.in("properties->>plan", [...filter.plans]);
    if (filter.countries?.length)
      query = query.in("properties->>country", [...filter.countries]);
    if (filter.devices?.length)
      query = query.in("properties->>device", [...filter.devices]);
    if (filter.from) query = query.gte("ts", filter.from);
    if (filter.to) query = query.lt("ts", filter.to);
  }

  const order = sort?.length ? sort : [{ column: "ts", desc: true } as const];
  for (const key of order) {
    query = query.order(key.column, { ascending: !key.desc });
  }
  const { data, error } = await query
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return data ?? [];
}

/**
 * Per-value facet counts for one dimension of the events-explorer filter popover
 * (ADR 0097, under the 0084 strategy), via the `SECURITY INVOKER` `fn_events_facets`
 * RPC — reduced in the database under the caller's RLS, never a client-side tally. The
 * function honours every OTHER active filter but not the facet's own dimension (so each
 * value's count reflects what selecting it would yield). Returns an empty list when RLS
 * yields no rows (a non-member, ADR 0083); this fetcher forwards the typed argument bag
 * verbatim and performs no reduction.
 */
export async function fetchEventsFacets(
  supabase: SupabaseClient<Database>,
  args: EventsFacetsArgs,
): Promise<EventsFacet[]> {
  const { data, error } = await supabase.rpc("fn_events_facets", args);
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

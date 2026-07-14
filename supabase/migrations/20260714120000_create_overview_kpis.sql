-- Phase D / ADR 0099, 0084: the curated Overview home — its two in-database reductions.
--
-- The console's Overview is a FIRST-CLASS, curated bento of project-level KPIs + signal
-- sparklines (distinct from the user-composed dashboards of ADR 0090). Its aggregations run
-- IN THE DATABASE (ADR 0084), never in application code: two `SECURITY INVOKER` functions
-- that execute as the CALLING member, so the ADR 0083 membership-join RLS on `events`
-- filters their input automatically (a non-member's call reduces zero rows / no rows, with
-- no per-query scoping code). Same idiom as fn_events_summary / fn_event_trends.
--
-- `search_path` is pinned to '' (every reference schema-qualified, ADR 0083) and both are
-- `STABLE` (they read, never write). No new table, policy, index, or GRANT beyond these two
-- functions. The functions ARE the contract: the application calls them as typed RPC
-- (gen:types, ADR 0015); KPI ratios/deltas/pacing are PRESENTATION over the already-reduced
-- scalars (a ratio of two returned counts, ADR 0087/0088), never a client-side reduction.

-- ---------------------------------------------------------------------------
-- fn_overview_kpis — one row of the project's scalar KPIs over a window AND over the
-- equal-length adjacent PRECEDING window (the `_prev` columns), so the caller derives
-- every delta and the goal-pace as a ratio of two returned scalars.
--
-- The previous window is [p_from - (p_to - p_from), p_from): the same span, adjacent,
-- immediately before the current [p_from, p_to). A single index range scan over
-- [prev_from, p_to) feeds all eight aggregates via FILTER — current is `ts >= p_from`,
-- previous is `ts < p_from` (both upper/lower bounds pinned by the outer WHERE).
--
-- Shape: one row of (active_users, active_users_prev, new_signups, new_signups_prev,
--   purchasers, purchasers_prev, value_sum, value_sum_prev).
--   • active_users  = distinct users with ANY event.
--   • new_signups   = distinct users firing 'sign_up' (the demo's canonical signup event).
--   • purchasers    = distinct users firing 'purchase' (the conversion numerator).
--   • value_sum     = sum of numeric purchase `properties.amount` (the ARPU + pacing
--     numerator); jsonb_typeof gates the cast so a non-numeric amount can never raise
--     (the fn_events_summary idiom).
-- ---------------------------------------------------------------------------
create function public.fn_overview_kpis(
  p_project_id uuid,
  p_from timestamptz,
  p_to timestamptz
)
  returns table (
    active_users bigint,
    active_users_prev bigint,
    new_signups bigint,
    new_signups_prev bigint,
    purchasers bigint,
    purchasers_prev bigint,
    value_sum numeric,
    value_sum_prev numeric
  )
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  select
    count(distinct e.distinct_id) filter (where e.ts >= p_from)::bigint as active_users,
    count(distinct e.distinct_id) filter (where e.ts < p_from)::bigint as active_users_prev,
    count(distinct e.distinct_id)
      filter (where e.event_name = 'sign_up' and e.ts >= p_from)::bigint as new_signups,
    count(distinct e.distinct_id)
      filter (where e.event_name = 'sign_up' and e.ts < p_from)::bigint as new_signups_prev,
    count(distinct e.distinct_id)
      filter (where e.event_name = 'purchase' and e.ts >= p_from)::bigint as purchasers,
    count(distinct e.distinct_id)
      filter (where e.event_name = 'purchase' and e.ts < p_from)::bigint as purchasers_prev,
    coalesce(
      sum((e.properties ->> 'amount')::numeric) filter (
        where e.event_name = 'purchase'
          and jsonb_typeof(e.properties -> 'amount') = 'number'
          and e.ts >= p_from
      ),
      0
    )::numeric as value_sum,
    coalesce(
      sum((e.properties ->> 'amount')::numeric) filter (
        where e.event_name = 'purchase'
          and jsonb_typeof(e.properties -> 'amount') = 'number'
          and e.ts < p_from
      ),
      0
    )::numeric as value_sum_prev
  from public.events e
  where e.project_id = p_project_id
    and e.ts >= p_from - (p_to - p_from)
    and e.ts < p_to;
$$;

comment on function public.fn_overview_kpis(uuid, timestamptz, timestamptz) is
  'One row of curated Overview KPIs (active_users, new_signups, purchasers, value_sum) over [from,to) and the equal-length preceding window (_prev columns), for the console Overview home (ADR 0099/0084). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- fn_overview_signal — per-bucket reductions for the Overview signal sparklines:
-- distinct active users, distinct new sign-ups, and purchase revenue per time bucket.
-- Empty buckets are zero-filled via generate_series so the sparkline is contiguous (the
-- fn_event_trends idiom); the interval is constrained to a known set so no arbitrary text
-- reaches date_trunc. Shape: setof (bucket, active_users, new_signups, value_sum).
-- ---------------------------------------------------------------------------
create function public.fn_overview_signal(
  p_project_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_interval text
)
  returns table (
    bucket timestamptz,
    active_users bigint,
    new_signups bigint,
    value_sum numeric
  )
  language plpgsql
  stable
  security invoker
  set search_path = ''
as $$
-- The RETURNS TABLE columns are also plpgsql out-variables; resolve a bare reference to
-- the COLUMN (the fn_event_trends idiom).
#variable_conflict use_column
begin
  if p_interval not in ('hour', 'day', 'week', 'month') then
    raise exception 'invalid interval %, expected one of hour|day|week|month', p_interval
      using errcode = '22023';
  end if;

  return query
  with buckets as (
    -- One row per interval across the (truncated) window — the zero-fill spine. The upper
    -- bound truncates `p_to - 1 microsecond`, not `p_to`: the match window is half-open
    -- (`ts < p_to`) and every nuqs window floors `to` to midnight, so stepping one tick
    -- short keeps the spine aligned with the rows it zero-fills (the fn_event_trends note).
    select g as bucket
    from generate_series(
      date_trunc(p_interval, p_from),
      date_trunc(p_interval, p_to - interval '1 microsecond'),
      ('1 ' || p_interval)::interval
    ) as g
  ),
  matched as (
    -- In-range events. RLS on public.events restricts this to the caller's projects
    -- (SECURITY INVOKER); the explicit project_id pins the one asked for.
    select
      date_trunc(p_interval, e.ts) as bucket,
      e.distinct_id,
      e.event_name,
      case
        when e.event_name = 'purchase'
          and jsonb_typeof(e.properties -> 'amount') = 'number'
        then (e.properties ->> 'amount')::numeric
      end as amount
    from public.events e
    where e.project_id = p_project_id
      and e.ts >= p_from
      and e.ts < p_to
  ),
  agg as (
    select
      m.bucket,
      count(distinct m.distinct_id)::bigint as active_users,
      count(distinct m.distinct_id) filter (where m.event_name = 'sign_up')::bigint as new_signups,
      coalesce(sum(m.amount), 0)::numeric as value_sum
    from matched m
    group by m.bucket
  )
  select
    b.bucket,
    coalesce(a.active_users, 0)::bigint as active_users,
    coalesce(a.new_signups, 0)::bigint as new_signups,
    coalesce(a.value_sum, 0)::numeric as value_sum
  from buckets b
  left join agg a on a.bucket = b.bucket
  order by b.bucket;
end;
$$;

comment on function public.fn_overview_signal(uuid, timestamptz, timestamptz, text) is
  'Per-bucket Overview signal series (active_users, new_signups, value_sum), zero-filled, for the console Overview sparklines (ADR 0099/0084). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (the product is authenticated-only,
-- ADR 0016). The functions read events under the caller's RLS, so a non-member already
-- sees nothing; restricting EXECUTE keeps anon out of the call surface (the PR-4 idiom).
-- ---------------------------------------------------------------------------
revoke execute on function
  public.fn_overview_kpis(uuid, timestamptz, timestamptz),
  public.fn_overview_signal(uuid, timestamptz, timestamptz, text)
from public;
grant execute on function
  public.fn_overview_kpis(uuid, timestamptz, timestamptz),
  public.fn_overview_signal(uuid, timestamptz, timestamptz, text)
to authenticated;

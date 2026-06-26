-- PR-6 / ADR 0088 (refining 0084, 0086): the third aggregation surface — retention.
--
-- One set-returning function reduces the events stream IN THE DATABASE (ADR 0084):
-- it computes acquisition-cohort retention under the SEMANTICS fixed by ADR 0088.
-- Like the PR-4 trend and PR-5 funnel functions it runs `SECURITY INVOKER`, so it
-- executes as the CALLING member and the ADR 0083 membership-join RLS on `events`
-- scopes what it reads automatically — a non-member's call reduces over nothing and
-- returns zero rows (no cohorts) with no error, no per-query scoping code. (The
-- deliberate opposite of the PR-2 membership helpers, which are `SECURITY DEFINER` to
-- bypass RLS without recursion; here we WANT the caller's RLS to filter the input.)
--
-- `search_path` is pinned to '' (every reference schema-qualified, ADR 0083) and the
-- function is `STABLE` (it reads, never writes). The function IS the contract
-- (ADR 0084): the application never assembles retention SQL; it calls this as typed
-- RPC (gen:types, ADR 0015) and draws the flat rows with a token-only visx heatmap
-- (ADR 0086). Reduction never lives in application code — the widget derives only the
-- display percentage (retained_users / cohort_size) from the returned counts (ADR 0088).

-- ---------------------------------------------------------------------------
-- fn_retention — acquisition-cohort retention over distinct tracked users (ADR 0088).
--
-- Semantics (ADR 0088, option A):
--   • Acquisition cohorts: a user's cohort is the calendar period (week|month) of their
--     FIRST event ever in the project (global min(ts)); a user is included only if that
--     first-touch falls in the analysis window [p_from, p_to). A pre-existing user (first
--     seen before p_from) is NOT re-counted as new.
--   • Counting unit: the distinct user (`distinct_id`); each cell is a distinct-user count.
--   • Calendar-aligned periods via date_trunc — real weeks/months, the same alignment the
--     PR-4 trend functions use. Granularity p_period ∈ {week, month}.
--   • period_offset N: whole calendar periods between the cohort period and an activity
--     period (N >= 0); offset 0 is the cohort period itself.
--   • Retained in period N = active IN THAT EXACT period (classic): the user emitted >= 1
--     event whose period = cohort_period + N. Reappearance is allowed; the curve need not
--     be monotonic. Offset 0 retained == cohort_size by construction.
--   • Output: a triangular, zero-filled grid — one row per (cohort, offset) within the
--     window, with retained_users = 0 where nobody returned (no client gap-handling).
--
-- Shape: setof (cohort_period timestamptz, cohort_size bigint, period_offset int,
--               retained_users bigint), ordered by (cohort_period, period_offset).
-- The (project_id, ts) and (project_id, distinct_id) indexes from PR-3 serve the scans.
-- ---------------------------------------------------------------------------
create function public.fn_retention(
  p_project_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_period text
)
  returns table (
    cohort_period timestamptz,
    cohort_size bigint,
    period_offset int,
    retained_users bigint
  )
  language plpgsql
  stable
  security invoker
  set search_path = ''
as $$
-- The RETURNS TABLE columns are also in scope as plpgsql variables; resolve any bare
-- reference to the COLUMN, never the out-variable.
#variable_conflict use_column
begin
  -- Constrain the granularity to a known set: a typed contract for the caller and no
  -- arbitrary text reaching date_trunc (daily is a stated ADR 0088 scope boundary).
  if p_period not in ('week', 'month') then
    raise exception 'invalid period %, expected one of week|month', p_period
      using errcode = '22023';
  end if;
  -- The analysis window must be non-empty (half-open [from, to)).
  if p_to <= p_from then
    raise exception 'analysis window must be non-empty: from % must precede to %', p_from, p_to
      using errcode = '22023';
  end if;

  return query
  with
  -- Each user's global first-touch in the project (RLS scopes this to the caller's
  -- projects via SECURITY INVOKER; the explicit project_id pins the one asked for).
  -- Bounded above by p_to so a first-touch after the window is never the anchor.
  first_seen as (
    select e.distinct_id, min(e.ts) as first_ts
    from public.events e
    where e.project_id = p_project_id
      and e.ts < p_to
    group by e.distinct_id
  ),
  -- Genuinely-new users in the window: first-touch in [p_from, p_to). Their cohort is
  -- the calendar period of that first-touch.
  cohort_members as (
    select
      fs.distinct_id,
      fs.first_ts,
      date_trunc(p_period, fs.first_ts) as cohort_period
    from first_seen fs
    where fs.first_ts >= p_from
  ),
  cohort_sizes as (
    select cm.cohort_period, count(distinct cm.distinct_id)::bigint as cohort_size
    from cohort_members cm
    group by cm.cohort_period
  ),
  -- Each cohort member's DISTINCT activity periods inside the window. Their events are
  -- all at-or-after first_ts (>= p_from), so every offset below is >= 0.
  activity as (
    select distinct
      cm.cohort_period,
      cm.distinct_id,
      date_trunc(p_period, e.ts) as active_period
    from public.events e
    join cohort_members cm on cm.distinct_id = e.distinct_id
    where e.project_id = p_project_id
      and e.ts >= p_from
      and e.ts < p_to
  ),
  -- The last calendar period that can hold an event. The window is half-open (ts < p_to),
  -- so truncate `p_to - 1 microsecond` (mirrors the PR-4 trend zero-fill spine): a p_to
  -- landing exactly on a period boundary must not add an empty trailing offset column.
  bounds as (
    select date_trunc(p_period, p_to - interval '1 microsecond') as last_period
  ),
  -- The triangular spine: for every cohort, an offset row for 0..maxOffset, where
  -- maxOffset is the whole periods between the cohort and the last in-window period.
  -- Week offsets use date subtraction (both operands are week-aligned, so the day gap is
  -- an exact multiple of 7); month offsets use the year*12+month index difference. Both
  -- are robust to DST, unlike epoch arithmetic on a timestamptz interval.
  spine as (
    select
      cs.cohort_period,
      cs.cohort_size,
      g.n::int as period_offset
    from cohort_sizes cs
    cross join bounds b
    cross join lateral generate_series(
      0,
      (case p_period
        when 'week' then (b.last_period::date - cs.cohort_period::date) / 7
        when 'month' then
          (extract(year from b.last_period) * 12 + extract(month from b.last_period))
          - (extract(year from cs.cohort_period) * 12 + extract(month from cs.cohort_period))
      end)::int
    ) as g(n)
  ),
  -- Distinct users active at each (cohort, offset), offset computed the same way as the
  -- spine bound above.
  retained as (
    select
      a.cohort_period,
      (case p_period
        when 'week' then (a.active_period::date - a.cohort_period::date) / 7
        when 'month' then
          (extract(year from a.active_period) * 12 + extract(month from a.active_period))
          - (extract(year from a.cohort_period) * 12 + extract(month from a.cohort_period))
      end)::int as period_offset,
      count(distinct a.distinct_id)::bigint as retained_users
    from activity a
    group by 1, 2
  )
  -- Left join the spine onto the retained counts so an empty (cohort, offset) cell still
  -- emits a 0 row — the grid is rectangular-triangular, no gaps for the widget to handle.
  select
    s.cohort_period,
    s.cohort_size,
    s.period_offset,
    coalesce(r.retained_users, 0)::bigint as retained_users
  from spine s
  left join retained r
    on r.cohort_period = s.cohort_period
   and r.period_offset = s.period_offset
  order by s.cohort_period, s.period_offset;
end;
$$;

comment on function public.fn_retention(uuid, timestamptz, timestamptz, text) is
  'Acquisition-cohort retention over distinct users: calendar cohorts, active-in-period (classic) retention, triangular zero-filled grid (ADR 0088). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (the product is
-- authenticated-only, ADR 0016). The function reads events under the caller's RLS, so a
-- non-member already sees nothing; restricting EXECUTE keeps anon out of the call
-- surface entirely, matching the PR-2 helper and PR-4/PR-5 aggregation idiom.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.fn_retention(uuid, timestamptz, timestamptz, text)
from public;
grant execute on function
  public.fn_retention(uuid, timestamptz, timestamptz, text)
to authenticated;

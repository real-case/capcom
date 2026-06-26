-- PR-5 / ADR 0087 (refining 0084, 0086): the second aggregation surface — funnels.
--
-- One set-returning function reduces the events stream IN THE DATABASE (ADR 0084):
-- it computes ordered-step funnel conversion under the SEMANTICS fixed by ADR 0087.
-- Like the PR-4 trend functions it runs `SECURITY INVOKER`, so it executes as the
-- CALLING member and the ADR 0083 membership-join RLS on `events` scopes what it
-- reads automatically — a non-member's call reduces over nothing and returns zero
-- rows with no error, no per-query scoping code. (The deliberate opposite of the
-- PR-2 membership helpers, which are `SECURITY DEFINER` to bypass RLS without
-- recursion; here we WANT the caller's RLS to filter the aggregation input.)
--
-- `search_path` is pinned to '' (every reference schema-qualified, ADR 0083) and the
-- function is `STABLE` (it reads, never writes). The function IS the contract
-- (ADR 0084): the application never assembles funnel SQL; it calls this as typed RPC
-- (gen:types, ADR 0015) and draws the flat rows with a token-only visx widget
-- (ADR 0086). Reduction never lives in application code — the widget derives only
-- display percentages from the returned per-step user counts (ADR 0087).

-- ---------------------------------------------------------------------------
-- fn_funnel — ordered-step conversion over distinct tracked users (ADR 0087).
--
-- Semantics (ADR 0087, option A):
--   • Steps are an ordered list of 2..10 `event_name`s (steps[1] is the entry).
--   • The counting unit is the distinct user (`distinct_id`); each step's value is
--     the number of distinct users who REACHED that step.
--   • First-touch entry: a user enters at the EARLIEST step-1 event whose ts is in
--     the entry window [p_from, p_to). That ts (t1) anchors the attempt and the
--     conversion deadline t1 + p_window.
--   • Ordered, non-strict, at-or-after: step i (i>=2) is the EARLIEST occurrence of
--     steps[i]'s event with ts >= the previous step's matched ts; unrelated events
--     may occur between steps.
--   • Single total conversion window from step 1: every matched ts <= t1 + p_window.
--     The entry window bounds only step 1; later steps may land after p_to provided
--     they fall inside the deadline.
--   • Output: one row per step (step_index, step_event, users), users non-increasing
--     by construction (each step's users are a subset of the previous step's).
--
-- Shape: setof (step_index int, step_event text, users bigint).
-- The (project_id, event_name) and (project_id, distinct_id) indexes from PR-3 serve
-- the per-step scans.
-- ---------------------------------------------------------------------------
create function public.fn_funnel(
  p_project_id uuid,
  p_steps text[],
  p_from timestamptz,
  p_to timestamptz,
  p_window interval
)
  returns table (step_index int, step_event text, users bigint)
  language plpgsql
  stable
  security invoker
  set search_path = ''
as $$
-- The RETURNS TABLE columns (step_index, step_event, users) are also in scope as
-- plpgsql variables; resolve any bare reference to the COLUMN, never the out-variable.
#variable_conflict use_column
declare
  n_steps int := coalesce(array_length(p_steps, 1), 0);
begin
  -- An ordered funnel needs at least 2 steps; cap at 10 to bound the recursive walk
  -- and keep the shareable URL short (ADR 0087). A typed contract for the caller.
  if n_steps < 2 or n_steps > 10 then
    raise exception 'funnel needs between 2 and 10 steps, got %', n_steps
      using errcode = '22023';
  end if;
  -- The conversion window must be positive: the whole path completes within it.
  if p_window <= interval '0' then
    raise exception 'conversion window must be positive, got %', p_window
      using errcode = '22023';
  end if;

  return query
  with recursive
  -- The ordered step list as (1-based index, event_name) rows.
  step_list as (
    select ord::int as idx, s.event_name
    from unnest(p_steps) with ordinality as s(event_name, ord)
  ),
  -- First-touch entry: each user's earliest step-1 event inside [p_from, p_to).
  -- RLS on public.events restricts this to the caller's projects (SECURITY INVOKER);
  -- the explicit project_id pins the one asked for.
  entries as (
    select e.distinct_id, min(e.ts) as matched_ts
    from public.events e
    where e.project_id = p_project_id
      and e.event_name = p_steps[1]
      and e.ts >= p_from
      and e.ts < p_to
    group by e.distinct_id
  ),
  -- Walk the funnel one step at a time. Base = step 1 (the entry). Each recursion
  -- finds the earliest occurrence of the next step's event at-or-after the prior
  -- step's matched ts and within the (carried) deadline; a user with no such event
  -- produces no row for that step, so the lateral join drops them from there on.
  walk as (
    select
      1 as idx,
      en.distinct_id,
      en.matched_ts,
      en.matched_ts + p_window as deadline
    from entries en
    union all
    select
      w.idx + 1,
      w.distinct_id,
      nxt.matched_ts,
      w.deadline
    from walk w
    join step_list sl on sl.idx = w.idx + 1
    cross join lateral (
      select min(e.ts) as matched_ts
      from public.events e
      where e.project_id = p_project_id
        and e.event_name = sl.event_name
        and e.distinct_id = w.distinct_id
        and e.ts >= w.matched_ts
        and e.ts <= w.deadline
    ) nxt
    where nxt.matched_ts is not null
  )
  -- Left join the walk onto every step so an unreached step still emits a 0 row
  -- (count(distinct null) = 0). Ordered by step so the drop-off reads top to bottom.
  select
    sl.idx as step_index,
    sl.event_name as step_event,
    count(distinct w.distinct_id)::bigint as users
  from step_list sl
  left join walk w on w.idx = sl.idx
  group by sl.idx, sl.event_name
  order by sl.idx;
end;
$$;

comment on function public.fn_funnel(uuid, text[], timestamptz, timestamptz, interval) is
  'Ordered-step funnel conversion over distinct users: first-touch entry, at-or-after ordering, single total conversion window from step 1 (ADR 0087). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (the product is
-- authenticated-only, ADR 0016). The function reads events under the caller's RLS,
-- so a non-member already sees nothing; restricting EXECUTE keeps anon out of the
-- call surface entirely, matching the PR-2 helper and PR-4 trend idiom.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.fn_funnel(uuid, text[], timestamptz, timestamptz, interval)
from public;
grant execute on function
  public.fn_funnel(uuid, text[], timestamptz, timestamptz, interval)
to authenticated;

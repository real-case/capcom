-- PR-16 / ADR 0097: the events-explorer surface — its ONE in-database reduction.
--
-- The explorer lists raw events (a filtered/ordered/ranged SELECT over public.events
-- under the caller's RLS, ADR 0083) — that listing owns no aggregation. But its footer
-- shows genuine reductions (total matching events, distinct users, value sum). Per the
-- no-aggregation-in-app-code posture (ADR 0084) those are NEVER reduced from the fetched
-- page in JS; they come from this `SECURITY INVOKER` function, which runs as the calling
-- member so the ADR 0083 membership-join RLS on `events` filters its input automatically
-- (a non-member's call sums zero rows). Same idiom as fn_event_trends / fn_top_events.
--
-- `search_path` is pinned to '' (every reference schema-qualified) and the function is
-- STABLE (it reads, never writes). The optional [p_from, p_to) window is the only filter
-- this PR wires; the broader closed filter grammar (ADR 0089-style) extends this signature
-- in the follow-up PR. The (project_id, ts) index from PR-3 serves the range scan.

-- ---------------------------------------------------------------------------
-- fn_events_summary — one-row totals over a project's event stream, optionally
-- constrained to a half-open [p_from, p_to) window (null bound = unbounded).
-- Shape: setof (total_events bigint, distinct_users bigint, value_sum numeric).
--   • value_sum sums the numeric `properties.amount` (purchase value); events
--     without a numeric amount contribute nothing. jsonb_typeof gates the cast so
--     a non-numeric amount can never raise.
-- ---------------------------------------------------------------------------
create function public.fn_events_summary(
  p_project_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null
)
  returns table (total_events bigint, distinct_users bigint, value_sum numeric)
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  select
    count(*)::bigint as total_events,
    count(distinct e.distinct_id)::bigint as distinct_users,
    coalesce(
      sum(
        case
          when jsonb_typeof(e.properties -> 'amount') = 'number'
          then (e.properties ->> 'amount')::numeric
        end
      ),
      0
    )::numeric as value_sum
  from public.events e
  where e.project_id = p_project_id
    and (p_from is null or e.ts >= p_from)
    and (p_to is null or e.ts < p_to);
$$;

comment on function public.fn_events_summary(uuid, timestamptz, timestamptz) is
  'One-row totals (total_events, distinct_users, value_sum) over a project''s events, optional [from,to) window (ADR 0097/0084). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (authenticated-only product,
-- ADR 0016). The function reads events under the caller's RLS, so a non-member
-- already sums nothing; restricting EXECUTE keeps anon out of the call surface.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.fn_events_summary(uuid, timestamptz, timestamptz)
from public;
grant execute on function
  public.fn_events_summary(uuid, timestamptz, timestamptz)
to authenticated;

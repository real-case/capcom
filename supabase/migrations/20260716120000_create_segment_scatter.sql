-- ---------------------------------------------------------------------------
-- Segment scatter — per-user frequency × lifetime value (ADR 0084, 0099).
--
-- Feeds the Overview bento's `Segments · freq × LTV` cell: one point per tracked
-- user, x = how often they act, y = what they are worth, coloured by plan. The
-- reduction lives here, never in application code (ADR 0084) — the widget receives
-- already-reduced points and only scales them.
--
-- EVENTS-DRIVEN, deliberately: the grouping starts from public.events, so a point
-- exists only for a user with at least one event in the window (frequency >= 1 by
-- construction) and a profile with no activity never yields a zero-frequency point.
-- public.profiles is LEFT JOINed only to colour the point by plan; a tracked user
-- with no profile row still plots, with plan = null.
--
--   • frequency counts the user's events in [p_from, p_to).
--   • ltv sums the numeric `properties.amount` over their 'purchase' events;
--     jsonb_typeof gates the cast so a non-numeric amount can never raise (the
--     fn_events_summary / fn_overview_kpis idiom). A user with no purchase is 0.
--   • p_limit caps the point set IN SQL, ordered by ltv desc — a scatter is only
--     readable at a bounded cardinality, and capping here (not in the client) keeps
--     the reduction in the database and the payload small. The cap is clamped to
--     [0, MAX] and NULL-coalesced to the default, so the bound is enforced by this
--     function rather than trusted from the caller: `greatest()` IGNORES nulls (so a
--     bare `greatest(p_limit, 0)` would turn an explicit `p_limit => null` into 0 rows
--     instead of the default), and an unbounded client-supplied limit would make the
--     "payload small" claim above merely advisory. Neither is an isolation concern —
--     a member may already read their own tenant's events — but the stated intent
--     should be the enforced one.
--
-- SECURITY INVOKER: runs under the caller's RLS, so the ADR 0083 membership join
-- decides visibility — a non-member simply reduces zero rows (a set-returning
-- function has no zero-fill spine, so they get NO ROWS, not zeros). The explicit
-- project_id pins the one project asked for; the client never asserts tenancy.
-- The public.profiles read rides the existing "Members read profiles in their
-- projects" policy (20260624045654_create_events_profiles.sql:158).
-- ---------------------------------------------------------------------------
create function public.fn_segment_scatter(
  p_project_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit integer default 300
)
  returns table (
    distinct_id text,
    frequency bigint,
    ltv numeric,
    plan text
  )
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  with per_user as (
    -- In-range events grouped per tracked user. RLS on public.events restricts this
    -- to the caller's projects (SECURITY INVOKER); the explicit project_id pins one.
    select
      e.distinct_id,
      count(*)::bigint as frequency,
      coalesce(
        sum(
          case
            when e.event_name = 'purchase'
              and jsonb_typeof(e.properties -> 'amount') = 'number'
            then (e.properties ->> 'amount')::numeric
          end
        ),
        0
      )::numeric as ltv
    from public.events e
    where e.project_id = p_project_id
      and e.ts >= p_from
      and e.ts < p_to
    group by e.distinct_id
  )
  select
    u.distinct_id,
    u.frequency,
    u.ltv,
    p.traits ->> 'plan' as plan
  from per_user u
  left join public.profiles p
    on p.project_id = p_project_id
   and p.distinct_id = u.distinct_id
  order by u.ltv desc, u.distinct_id
  -- coalesce: an explicit `p_limit => null` falls back to the default (greatest() would
  -- otherwise ignore the null and yield 0). greatest: never a negative LIMIT. least: the
  -- upper bound is this function's to enforce, not the caller's to choose.
  limit least(greatest(coalesce(p_limit, 300), 0), 1000);
$$;

comment on function public.fn_segment_scatter(uuid, timestamptz, timestamptz, integer) is
  'Per-user frequency × lifetime-value points for the console Overview segment scatter (ADR 0099/0084), capped at p_limit by ltv desc. SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (the product is authenticated-only,
-- ADR 0016). The function reads events/profiles under the caller's RLS, so a
-- non-member already sees nothing; restricting EXECUTE keeps anon out of the call
-- surface (the PR-4 idiom).
-- ---------------------------------------------------------------------------
revoke execute on function
  public.fn_segment_scatter(uuid, timestamptz, timestamptz, integer)
from public;
grant execute on function
  public.fn_segment_scatter(uuid, timestamptz, timestamptz, integer)
to authenticated;

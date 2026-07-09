-- PR-17 / ADR 0097: interactive query controls for the events explorer — filtering
-- (a closed AND-only grammar), free-text search, and faceted per-value counts.
--
-- This migration extends the ONE reduction the surface owns (fn_events_summary) so the
-- footer totals honour the active filter, and adds fn_events_facets so the filter
-- popover's per-value counts come from the DATABASE, never a client-side tally (the
-- no-aggregation-in-app-code posture, ADR 0084).
--
-- The filter is USER-AUTHORED data: validated client-side by the `[events-filter]` Zod
-- schema (ADR 0017) and re-bounded here. Every predicate is a PARAMETERIZED comparison
-- (`=`, `= any(...)`, `ilike`, `>=`, `<`) over a fixed column or a fixed top-level
-- `properties` key — there is NO dynamic SQL / EXECUTE and no user string is ever
-- concatenated into SQL. The closed grammar IS the injection boundary (ADR 0089, reused).
-- Both functions are SECURITY INVOKER, so they run as the CALLING member and the ADR 0083
-- membership-join RLS on `events` scopes their input automatically (a non-member's call
-- reduces over nothing); `search_path` is pinned to '' (every reference schema-qualified)
-- and both are STABLE (they read, never write).
--
-- The filter dimensions are a CLOSED set — `event_name`, the half-open [p_from, p_to)
-- time window, and the top-level `properties` keys plan / country / device. Arbitrary
-- `properties`-path predicates and OR / nested logic remain stated scope boundaries
-- (ADR 0097). Empty selections arrive as NULL (unconstrained), never an empty array. The
-- (project_id, ts) index from PR-3 serves the range scan.

-- ---------------------------------------------------------------------------
-- fn_events_summary — one-row totals over a project's event stream, now constrained
-- by the full filter. Replaces the PR-16 three-argument version (the signature grows,
-- so the old function is dropped first — a new migration, never an edit in place).
--   • value_sum sums the numeric `properties.amount`; jsonb_typeof gates the cast so a
--     non-numeric amount can never raise.
-- ---------------------------------------------------------------------------
drop function if exists public.fn_events_summary(uuid, timestamptz, timestamptz);

create function public.fn_events_summary(
  p_project_id uuid,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_search text default null,
  p_events text[] default null,
  p_plans text[] default null,
  p_countries text[] default null,
  p_devices text[] default null
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
    and (p_to is null or e.ts < p_to)
    and (p_search is null or e.event_name ilike '%' || p_search || '%')
    and (p_events is null or e.event_name = any(p_events))
    and (p_plans is null or e.properties ->> 'plan' = any(p_plans))
    and (p_countries is null or e.properties ->> 'country' = any(p_countries))
    and (p_devices is null or e.properties ->> 'device' = any(p_devices));
$$;

comment on function public.fn_events_summary(
  uuid, timestamptz, timestamptz, text, text[], text[], text[], text[]
) is
  'One-row totals (total_events, distinct_users, value_sum) over a project''s events under the closed [events-filter] grammar (ADR 0097/0084/0089). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- fn_events_facets — per-value counts for ONE facet dimension, for the filter
-- popover. Genuine faceted search: the counts honour every OTHER active filter but
-- NOT the facet's own dimension (so a user sees what selecting each value would add,
-- not a self-narrowed list). The self-skip is `(p_dimension = 'X' or <predicate>)`.
--
-- `p_dimension` is a CLOSED enum (event | plan | country | device); an out-of-set
-- value makes the CASE yield NULL for every row, which the outer `value is not null`
-- drops — an unknown dimension returns nothing rather than mis-grouping. No dynamic
-- SQL: the grouping column is chosen by a fixed CASE, never assembled from input.
-- Shape: setof (value text, count bigint), most-frequent first.
-- ---------------------------------------------------------------------------
create function public.fn_events_facets(
  p_project_id uuid,
  p_dimension text,
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_search text default null,
  p_events text[] default null,
  p_plans text[] default null,
  p_countries text[] default null,
  p_devices text[] default null
)
  returns table (value text, count bigint)
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  select s.value, count(*)::bigint as count
  from (
    select
      case p_dimension
        when 'event' then e.event_name
        when 'plan' then e.properties ->> 'plan'
        when 'country' then e.properties ->> 'country'
        when 'device' then e.properties ->> 'device'
      end as value
    from public.events e
    where e.project_id = p_project_id
      and (p_from is null or e.ts >= p_from)
      and (p_to is null or e.ts < p_to)
      and (p_search is null or e.event_name ilike '%' || p_search || '%')
      and (p_dimension = 'event' or p_events is null or e.event_name = any(p_events))
      and (p_dimension = 'plan' or p_plans is null or e.properties ->> 'plan' = any(p_plans))
      and (p_dimension = 'country' or p_countries is null or e.properties ->> 'country' = any(p_countries))
      and (p_dimension = 'device' or p_devices is null or e.properties ->> 'device' = any(p_devices))
  ) s
  where s.value is not null
  group by s.value
  order by count desc, s.value asc;
$$;

comment on function public.fn_events_facets(
  uuid, text, timestamptz, timestamptz, text, text[], text[], text[], text[]
) is
  'Per-value counts for one facet dimension (event|plan|country|device), honouring every OTHER active [events-filter] predicate but not the facet''s own (ADR 0097/0084). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (authenticated-only product,
-- ADR 0016). Both functions read events under the caller's RLS, so a non-member
-- already reduces over nothing; restricting EXECUTE keeps anon out of the call surface.
-- ---------------------------------------------------------------------------
revoke execute on function public.fn_events_summary(
  uuid, timestamptz, timestamptz, text, text[], text[], text[], text[]
) from public;
grant execute on function public.fn_events_summary(
  uuid, timestamptz, timestamptz, text, text[], text[], text[], text[]
) to authenticated;

revoke execute on function public.fn_events_facets(
  uuid, text, timestamptz, timestamptz, text, text[], text[], text[], text[]
) from public;
grant execute on function public.fn_events_facets(
  uuid, text, timestamptz, timestamptz, text, text[], text[], text[], text[]
) to authenticated;

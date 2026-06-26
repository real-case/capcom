-- PR-4 / ADR 0084, 0086: the first aggregation surface — trends.
--
-- Two set-returning functions reduce the events stream IN THE DATABASE (ADR 0084):
-- trends counts by time bucket, and the top events in a window. Both run
-- `SECURITY INVOKER`, so they execute as the CALLING member and the ADR 0083
-- membership-join RLS on `events` applies to what they read automatically — a
-- non-member's call returns zero rows with no per-query scoping code. This is the
-- deliberate opposite of the PR-2 membership helpers (`is_member`, etc.), which are
-- `SECURITY DEFINER` because they must bypass RLS to answer "is this user a member"
-- without recursion. Here we WANT the caller's RLS to filter the aggregation input.
--
-- `search_path` is pinned to '' (every reference schema-qualified, ADR 0083) and
-- both functions are `STABLE` (they read, never write). The functions ARE the
-- contract (ADR 0084): the application never assembles aggregation SQL; it calls
-- these as typed RPC (gen:types, ADR 0015) and draws the flat rows with token-only
-- visx widgets (ADR 0086). Reduction never lives in application code.

-- ---------------------------------------------------------------------------
-- fn_event_trends — time-bucketed counts of one event over a window, optionally
-- broken down by a top-level `properties` key.
--
-- Shape: setof (bucket timestamptz, series text, count bigint).
--   • Empty buckets are zero-filled via generate_series so the chart timeline is
--     contiguous (no gaps to special-case client-side).
--   • No breakdown key  → a single series named after the event.
--   • A breakdown key   → the top `p_breakdown_limit` property values by volume,
--     with every other value folded into a single 'Other' series. A row missing
--     the key reads as '(none)'.
-- The (project_id, ts) index added in PR-3 serves the range scan.
-- ---------------------------------------------------------------------------
create function public.fn_event_trends(
  p_project_id uuid,
  p_event_name text,
  p_from timestamptz,
  p_to timestamptz,
  p_interval text,
  p_breakdown_key text default null,
  p_breakdown_limit int default 8
)
  returns table (bucket timestamptz, series text, count bigint)
  language plpgsql
  stable
  security invoker
  set search_path = ''
as $$
-- The RETURNS TABLE columns (bucket, series, count) are also in scope as plpgsql
-- variables; resolve any bare reference to the COLUMN, never the out-variable.
#variable_conflict use_column
begin
  -- Constrain the interval to a known set: a typed contract for the caller and no
  -- arbitrary text reaching date_trunc.
  if p_interval not in ('hour', 'day', 'week', 'month') then
    raise exception 'invalid interval %, expected one of hour|day|week|month', p_interval
      using errcode = '22023';
  end if;

  return query
  with buckets as (
    -- One row per interval across the (truncated) window — the zero-fill spine.
    -- The upper bound truncates `p_to - 1 microsecond`, not `p_to`: the match
    -- window is half-open (`ts < p_to`), so a `p_to` landing exactly on an interval
    -- boundary (every nuqs window floors `to` to midnight) would otherwise emit a
    -- trailing bucket that can never hold an event. Stepping one tick short keeps
    -- the spine aligned with the rows it zero-fills.
    select g as bucket
    from generate_series(
      date_trunc(p_interval, p_from),
      date_trunc(p_interval, p_to - interval '1 microsecond'),
      ('1 ' || p_interval)::interval
    ) as g
  ),
  matched as (
    -- The in-range events. RLS on public.events restricts this to the caller's
    -- projects (SECURITY INVOKER); the explicit project_id pins the one asked for.
    select
      date_trunc(p_interval, e.ts) as bucket,
      case
        when p_breakdown_key is null then p_event_name
        else coalesce(e.properties ->> p_breakdown_key, '(none)')
      end as raw_series
    from public.events e
    where e.project_id = p_project_id
      and e.event_name = p_event_name
      and e.ts >= p_from
      and e.ts < p_to
  ),
  top_series as (
    -- The breakdown values that get their own series (only when a key is given).
    select m.raw_series
    from matched m
    where p_breakdown_key is not null
    group by m.raw_series
    -- Clamp the caller-supplied limit server-side: any authenticated client can call
    -- this RPC, so cap the series count (50) to bound the result set regardless of input.
    order by count(*) desc, m.raw_series
    limit least(greatest(p_breakdown_limit, 0), 50)
  ),
  normalized as (
    -- Collapse non-top breakdown values into 'Other'.
    select
      m.bucket,
      case
        when p_breakdown_key is null then p_event_name
        when m.raw_series in (select ts.raw_series from top_series ts) then m.raw_series
        else 'Other'
      end as series
    from matched m
  ),
  series_set as (
    -- The full set of series to render, so every bucket gets a zero-filled row for
    -- each. Derived from what actually appears in `normalized`, so 'Other' shows up
    -- only when something fell outside the top-N.
    select distinct n.series from normalized n
  ),
  counted as (
    select n.bucket, n.series, count(*)::bigint as count
    from normalized n
    group by n.bucket, n.series
  )
  select
    b.bucket,
    s.series,
    coalesce(c.count, 0)::bigint as count
  from buckets b
  cross join series_set s
  left join counted c on c.bucket = b.bucket and c.series = s.series
  order by b.bucket, s.series;
end;
$$;

comment on function public.fn_event_trends(uuid, text, timestamptz, timestamptz, text, text, int) is
  'Time-bucketed counts of one event over a window, zero-filled, with optional top-N+Other property breakdown (ADR 0084). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- fn_top_events — the most frequent events in a window, ranked desc.
-- Shape: setof (event_name text, count bigint). Backs the secondary bar widget.
-- The (project_id, event_name) index added in PR-3 serves the group-by.
-- ---------------------------------------------------------------------------
create function public.fn_top_events(
  p_project_id uuid,
  p_from timestamptz,
  p_to timestamptz,
  p_limit int default 10
)
  returns table (event_name text, count bigint)
  language sql
  stable
  security invoker
  set search_path = ''
as $$
  select e.event_name, count(*)::bigint as count
  from public.events e
  where e.project_id = p_project_id
    and e.ts >= p_from
    and e.ts < p_to
  group by e.event_name
  order by count(*) desc, e.event_name
  -- Clamp the caller-supplied limit server-side (cap 100) — bounds the result set for
  -- any authenticated caller regardless of the requested value.
  limit least(greatest(p_limit, 0), 100);
$$;

comment on function public.fn_top_events(uuid, timestamptz, timestamptz, int) is
  'Most frequent events in a window, ranked desc (ADR 0084). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (the product is
-- authenticated-only, ADR 0016). The functions read events under the caller's RLS,
-- so a non-member already sees nothing; restricting EXECUTE keeps anon out of the
-- call surface entirely, matching the PR-2 helper idiom.
-- ---------------------------------------------------------------------------
revoke execute on function
  public.fn_event_trends(uuid, text, timestamptz, timestamptz, text, text, int),
  public.fn_top_events(uuid, timestamptz, timestamptz, int)
from public;
grant execute on function
  public.fn_event_trends(uuid, text, timestamptz, timestamptz, text, text, int),
  public.fn_top_events(uuid, timestamptz, timestamptz, int)
to authenticated;

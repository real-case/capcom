-- ---------------------------------------------------------------------------
-- Overview signal — add a per-bucket `purchasers` column (ADR 0084, 0099).
--
-- WHY: the Overview bento's three mini cells (New sign-ups · Conversion · Avg
-- revenue/user) each carry a sparkline. Their series come from this function.
--   • new sign-ups → the existing new_signups column;
--   • ARPU        → value_sum / active_users — a per-bucket ratio of two
--                   already-reduced scalars, i.e. presentation (ADR 0087/0088);
--   • conversion  → purchasers / active_users — and no per-bucket `purchasers`
--                   existed. Hence this column. It is the ONLY thing standing
--                   between the reference's conversion sparkline and the code.
--
-- The definition mirrors fn_overview_kpis' scalar exactly —
-- count(distinct distinct_id) filter (where event_name = 'purchase') — so the
-- sparkline and the KPI card agree by construction (the e2e pins that identity).
--
-- DROP-FIRST, NOT `create or replace`: Postgres compares the row type defined by
-- the OUT parameters and rejects a changed RETURNS TABLE on replace ("cannot change
-- return type of existing function … Use DROP FUNCTION first"). The repo's shipped
-- idiom for reshaping a function is drop-then-create — see
-- 20260709120000_events_filtered_summary_and_facets.sql:27-32.
--
-- ⚠️ The DROP discards the function's GRANTs and COMMENT, and `create function`
-- grants EXECUTE to PUBLIC by default — so this migration MUST re-issue the
-- revoke/grant and the comment below. Omitting them would silently hand `anon`
-- EXECUTE on the call surface. Everything else is unchanged: same signature, same
-- body, same zero-filled bucket spine, same row order (`order by b.bucket`), same
-- SECURITY INVOKER + pinned search_path. The new column is appended LAST, so the
-- change is additive for every existing caller.
-- ---------------------------------------------------------------------------
drop function if exists public.fn_overview_signal(uuid, timestamptz, timestamptz, text);

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
    value_sum numeric,
    purchasers bigint
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
      coalesce(sum(m.amount), 0)::numeric as value_sum,
      -- Distinct BUYERS in the bucket — the same reduction fn_overview_kpis uses for its
      -- `purchasers` scalar, so the conversion sparkline and the conversion KPI cannot drift.
      count(distinct m.distinct_id) filter (where m.event_name = 'purchase')::bigint as purchasers
    from matched m
    group by m.bucket
  )
  select
    b.bucket,
    coalesce(a.active_users, 0)::bigint as active_users,
    coalesce(a.new_signups, 0)::bigint as new_signups,
    coalesce(a.value_sum, 0)::numeric as value_sum,
    coalesce(a.purchasers, 0)::bigint as purchasers
  from buckets b
  left join agg a on a.bucket = b.bucket
  order by b.bucket;
end;
$$;

-- Re-issued: the DROP above discarded the original COMMENT.
comment on function public.fn_overview_signal(uuid, timestamptz, timestamptz, text) is
  'Per-bucket Overview signal series (active_users, new_signups, value_sum, purchasers), zero-filled, for the console Overview sparklines (ADR 0099/0084). SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Re-issued: the DROP discarded the original GRANTs, and `create function` grants
-- EXECUTE to PUBLIC by default — without these two statements `anon` would gain
-- EXECUTE on this function. Restores exactly the ACL of
-- 20260714120000_create_overview_kpis.sql:182-189 for this function (fn_overview_kpis
-- was untouched, so its grants still stand).
-- ---------------------------------------------------------------------------
revoke execute on function
  public.fn_overview_signal(uuid, timestamptz, timestamptz, text)
from public;
grant execute on function
  public.fn_overview_signal(uuid, timestamptz, timestamptz, text)
to authenticated;

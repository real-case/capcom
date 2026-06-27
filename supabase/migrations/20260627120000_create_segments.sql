-- PR-7 / ADR 0089 (refining 0084): the fourth aggregation surface — segmentation.
--
-- Two set-returning/scalar functions reduce the profiles + events streams IN THE
-- DATABASE (ADR 0084) under the SEGMENT-DEFINITION MODEL fixed by ADR 0089:
--   • fn_segment_size         — how many distinct tracked users match a rule.
--   • fn_segment_distribution — how those matched users break down by one trait.
--
-- A segment is a CLOSED jsonb rule (ADR 0089), validated client-side by the Zod
-- `[segment]` schema (ADR 0017) before the call:
--
--   { "match": "all",                                  -- AND-composition (fixed)
--     "attributes": [ { "key": "plan", "op": "eq",  "value": "pro" },
--                     { "key": "country", "op": "in", "value": ["US","GB"] } ],
--     "behaviors":  [ { "event": "purchase", "op": "at_least", "count": 1 },
--                     { "event": "sign_up",  "op": "at_most",  "count": 0 } ] }
--
-- The rule is USER-AUTHORED DATA. It is interpreted by a CLOSED grammar — a fixed
-- `case <op>` per predicate kind — and NEVER concatenated into SQL: there is no
-- dynamic SQL / EXECUTE anywhere here. Rule values are compared as jsonb/text
-- (`traits ->> key = value`, `event_name = event`), so a value carrying SQL
-- metacharacters is a harmless literal that matches nothing. The grammar's closure
-- IS the injection boundary (ADR 0089).
--
-- Like the PR-4/PR-5/PR-6 aggregation functions both run `SECURITY INVOKER`, so they
-- execute as the CALLING member and the ADR 0083 membership-join RLS on profiles /
-- events scopes what they read automatically — a non-member's call matches over
-- nothing and returns size 0 / zero rows with no error, no per-query scoping code.
-- `search_path` is pinned to '' (every reference schema-qualified, ADR 0083); the
-- functions are STABLE (they read, never write). The function IS the contract
-- (ADR 0084): the application never assembles segment SQL — it calls these as typed
-- RPC (gen:types, ADR 0015) and draws the result with a token-only visx chart
-- (ADR 0086). Reduction never lives in application code — the widget derives only
-- the display percentage (bucket users / size) from the returned counts (ADR 0089).
--
-- Composition is AND-only and matching is shared by both functions: a profile is in
-- the segment iff NO attribute predicate and NO behavioural predicate fails. The
-- "fails" form (a `not exists` over a `not coalesce(<pred>, false)`) makes the
-- three-valued logic explicit: a predicate that evaluates to NULL (e.g. an ABSENT
-- trait under `eq`/`in`) counts as a FAILURE, so the user is excluded — the intended
-- "user does not have plan=pro if they have no plan at all" semantics. The two
-- functions repeat this matching block deliberately (no shared helper keeps the RPC
-- surface to exactly the two ADR-0089 functions); the e2e asserts the distribution
-- SUMS TO the size, which fails loudly if the two blocks ever drift apart.
--
-- Scope boundaries (ADR 0089, all additive — none reopens this model): OR / nested
-- groups (only `match:"all"` here), per-predicate time windows (the single [from,to)
-- bounds every behavioural count), numeric `properties` predicates, and SAVED/NAMED
-- segment persistence (a `segments` table + write path) — deferred to PR-8 Server
-- Actions. PR-7 ships NO table: a segment is an ephemeral, URL-state-shareable rule.

-- ---------------------------------------------------------------------------
-- fn_segment_validate_rule — enforce the closed ADR 0089 grammar on a segment rule.
--
-- The rule is USER-AUTHORED data; the Zod `[segment]` schema validates it on the client,
-- but a direct RPC caller bypasses that, so the DATABASE re-validates the whole grammar
-- before either aggregation interprets it: `match` is "all" (OR/nesting is a deferred
-- boundary), every attribute predicate is {key:string, op:eq|neq|in, value:string | (for
-- `in`) a non-empty array of strings}, every behavioural predicate is {event:string,
-- op:at_least|at_most, count: a non-negative integer}. Any deviation raises 22023. The
-- function only INSPECTS its argument — no table reads, no dynamic SQL — hence `immutable`.
-- Shared by both aggregations so the closed grammar lives in exactly one place.
-- ---------------------------------------------------------------------------
create function public.fn_segment_validate_rule(p_rule jsonb)
  returns void
  language plpgsql
  immutable
  security invoker
  set search_path = ''
as $$
-- Every comparison is NULL-safe: an ABSENT field yields SQL NULL, and `x <> 'string'`
-- on NULL is NULL (not true), which would let a malformed predicate slip through. So type
-- checks use `is distinct from`, operator membership uses `coalesce(..., '')`, and the
-- shape-dependent checks use CASE so a cast/`jsonb_array_elements` only runs once the type
-- is confirmed (a non-array `in` value or a non-number count never reaches a raising cast).
begin
  if jsonb_typeof(p_rule) is distinct from 'object' then
    raise exception 'segment rule must be a json object' using errcode = '22023';
  end if;
  -- AND-only composition: `match`, when present, must be "all" (ADR 0089).
  if coalesce(p_rule ->> 'match', 'all') <> 'all' then
    raise exception 'segment rule "match" must be "all"' using errcode = '22023';
  end if;
  if p_rule ? 'attributes' and jsonb_typeof(p_rule -> 'attributes') <> 'array' then
    raise exception 'segment rule "attributes" must be an array' using errcode = '22023';
  end if;
  if p_rule ? 'behaviors' and jsonb_typeof(p_rule -> 'behaviors') <> 'array' then
    raise exception 'segment rule "behaviors" must be an array' using errcode = '22023';
  end if;
  -- Every attribute predicate: an object with a string key, a known op, and a value whose
  -- shape matches the op (a string for eq/neq; a non-empty array of strings for `in`).
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_rule -> 'attributes', '[]'::jsonb)) as ap
    where jsonb_typeof(ap) is distinct from 'object'
      or jsonb_typeof(ap -> 'key') is distinct from 'string'
      or coalesce(ap ->> 'op', '') not in ('eq', 'neq', 'in')
      or (
        coalesce(ap ->> 'op', '') in ('eq', 'neq')
        and jsonb_typeof(ap -> 'value') is distinct from 'string'
      )
      or (
        coalesce(ap ->> 'op', '') = 'in'
        and case jsonb_typeof(ap -> 'value')
          when 'array' then
            jsonb_array_length(ap -> 'value') = 0
            or exists (
              select 1 from jsonb_array_elements(ap -> 'value') as v
              where jsonb_typeof(v) is distinct from 'string'
            )
          else true -- absent or non-array `in` value is invalid
        end
      )
  ) then
    raise exception 'segment rule contains an invalid attribute predicate'
      using errcode = '22023';
  end if;
  -- Every behavioural predicate: an object with a string event, a known op, and a
  -- non-negative integer count (so the matching block's `::bigint` cast is always safe).
  if exists (
    select 1
    from jsonb_array_elements(coalesce(p_rule -> 'behaviors', '[]'::jsonb)) as bp
    where jsonb_typeof(bp) is distinct from 'object'
      or jsonb_typeof(bp -> 'event') is distinct from 'string'
      or coalesce(bp ->> 'op', '') not in ('at_least', 'at_most')
      or case jsonb_typeof(bp -> 'count')
        when 'number' then
          (bp ->> 'count')::numeric < 0
          or (bp ->> 'count')::numeric <> trunc((bp ->> 'count')::numeric)
        else true -- absent or non-number count is invalid
      end
  ) then
    raise exception 'segment rule contains an invalid behaviour predicate'
      using errcode = '22023';
  end if;
end;
$$;

comment on function public.fn_segment_validate_rule(jsonb) is
  'Enforce the closed ADR 0089 segment-rule grammar (match=all, predicate shapes/ops, non-negative integer counts); raises 22023 on any deviation. Inspects the argument only — no table reads, no dynamic SQL.';

-- ---------------------------------------------------------------------------
-- fn_segment_size — count of distinct tracked users matching a segment rule (ADR 0089).
--
-- The base population is `profiles` (the tracked users keyed by (project_id,
-- distinct_id), ADR 0083): an empty rule (no predicates) matches every project user.
-- Attribute predicates test `profiles.traits`; behavioural predicates count `events`
-- with the given event_name in the half-open window [p_from, p_to). The window bounds
-- ONLY the behavioural counts — attribute-only and empty rules are window-independent.
--
-- Returns: bigint (a distinct-user count; profiles are unique per (project_id,
-- distinct_id), so count(*) is already a distinct-user count).
-- The (project_id, distinct_id) and (project_id, event_name) indexes from PR-3 serve
-- the per-user behavioural scans.
-- ---------------------------------------------------------------------------
create function public.fn_segment_size(
  p_project_id uuid,
  p_rule jsonb,
  p_from timestamptz,
  p_to timestamptz
)
  returns bigint
  language plpgsql
  stable
  security invoker
  set search_path = ''
as $$
begin
  -- Reject NULL arguments outright: a typed, strict contract for the caller (the
  -- 22023 error class the PR-4/5/6 aggregation guards use).
  if p_project_id is null or p_rule is null or p_from is null or p_to is null then
    raise exception 'fn_segment_size requires non-null project, rule, from, and to'
      using errcode = '22023';
  end if;
  -- Enforce the closed ADR 0089 grammar at the RPC boundary (match + every predicate's
  -- shape/operator/operand). The Zod `[segment]` schema is the client authority; this
  -- makes the DATABASE the real enforcement point for a grammar a direct RPC caller could
  -- otherwise bypass — no SQL is ever built from the rule, so this is validation, not
  -- interpretation. Raises 22023 on any malformed rule.
  perform public.fn_segment_validate_rule(p_rule);
  -- The behavioural window must be non-empty (half-open [from, to)).
  if p_to <= p_from then
    raise exception 'analysis window must be non-empty: from % must precede to %', p_from, p_to
      using errcode = '22023';
  end if;

  return (
    select count(*)::bigint
    from public.profiles p
    where p.project_id = p_project_id
      -- All attribute predicates hold: no predicate FAILS. A NULL result (absent
      -- trait under eq/in) is coalesced to false, i.e. treated as a failure.
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_rule -> 'attributes', '[]'::jsonb)) as ap
        where not coalesce(
          case ap ->> 'op'
            when 'eq'  then p.traits ->> (ap ->> 'key') = (ap ->> 'value')
            when 'neq' then p.traits ->> (ap ->> 'key') is distinct from (ap ->> 'value')
            when 'in'  then (p.traits ->> (ap ->> 'key')) = any (
                              array(select jsonb_array_elements_text(ap -> 'value')))
            else false
          end, false)
      )
      -- All behavioural predicates hold: no predicate FAILS. The event count per
      -- predicate is computed once via lateral, then compared by the op.
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_rule -> 'behaviors', '[]'::jsonb)) as bp
        cross join lateral (
          select count(*) as c
          from public.events e
          where e.project_id = p_project_id
            and e.distinct_id = p.distinct_id
            and e.event_name = (bp ->> 'event')
            and e.ts >= p_from
            and e.ts <  p_to
        ) as cnt
        where not coalesce(
          case bp ->> 'op'
            when 'at_least' then cnt.c >= (bp ->> 'count')::bigint
            when 'at_most'  then cnt.c <= (bp ->> 'count')::bigint
            else false
          end, false)
      )
  );
end;
$$;

comment on function public.fn_segment_size(uuid, jsonb, timestamptz, timestamptz) is
  'Distinct-user count matching a closed jsonb segment rule (attribute + behavioural predicates, AND-only; ADR 0089). No dynamic SQL — the grammar is the injection boundary. SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- fn_segment_distribution — the matched users broken down by one trait dimension.
--
-- Same matching as fn_segment_size, then grouped by `traits ->> p_dimension`. An
-- absent/empty trait value folds into a single '(unknown)' bucket so the chart needs
-- no gap handling. Ordered by users desc, then bucket asc (a deterministic tie-break
-- for Chromatic). Every matched user lands in exactly one bucket, so SUM(users)
-- equals fn_segment_size — the e2e cross-checks this. Conversion to a percentage of
-- the segment is presentation (a ratio of two reduced counts), derived in the widget,
-- not here (ADR 0089, mirroring 0087/0088).
--
-- Returns: setof (bucket text, users bigint).
-- ---------------------------------------------------------------------------
create function public.fn_segment_distribution(
  p_project_id uuid,
  p_rule jsonb,
  p_dimension text,
  p_from timestamptz,
  p_to timestamptz
)
  returns table (
    bucket text,
    users bigint
  )
  language plpgsql
  stable
  security invoker
  set search_path = ''
as $$
-- The RETURNS TABLE columns are also in scope as plpgsql variables; resolve any bare
-- reference (the `order by users` below) to the COLUMN, never the out-variable.
#variable_conflict use_column
begin
  if p_project_id is null or p_rule is null or p_dimension is null
     or p_from is null or p_to is null then
    raise exception 'fn_segment_distribution requires non-null project, rule, dimension, from, and to'
      using errcode = '22023';
  end if;
  -- `p_dimension` is one trait dimension (ADR 0089) — reject anything else rather than
  -- silently collapsing every matched user into the `(unknown)` bucket and returning
  -- misleading data.
  if p_dimension not in ('plan', 'country', 'device', 'referrer') then
    raise exception 'segment distribution dimension must be one of plan, country, device, referrer'
      using errcode = '22023';
  end if;
  -- Enforce the closed ADR 0089 grammar at the RPC boundary (see fn_segment_validate_rule).
  perform public.fn_segment_validate_rule(p_rule);
  if p_to <= p_from then
    raise exception 'analysis window must be non-empty: from % must precede to %', p_from, p_to
      using errcode = '22023';
  end if;

  return query
  select
    coalesce(nullif(p.traits ->> p_dimension, ''), '(unknown)') as bucket,
    count(*)::bigint as users
  from public.profiles p
  where p.project_id = p_project_id
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_rule -> 'attributes', '[]'::jsonb)) as ap
      where not coalesce(
        case ap ->> 'op'
          when 'eq'  then p.traits ->> (ap ->> 'key') = (ap ->> 'value')
          when 'neq' then p.traits ->> (ap ->> 'key') is distinct from (ap ->> 'value')
          when 'in'  then (p.traits ->> (ap ->> 'key')) = any (
                            array(select jsonb_array_elements_text(ap -> 'value')))
          else false
        end, false)
    )
    and not exists (
      select 1
      from jsonb_array_elements(coalesce(p_rule -> 'behaviors', '[]'::jsonb)) as bp
      cross join lateral (
        select count(*) as c
        from public.events e
        where e.project_id = p_project_id
          and e.distinct_id = p.distinct_id
          and e.event_name = (bp ->> 'event')
          and e.ts >= p_from
          and e.ts <  p_to
      ) as cnt
      where not coalesce(
        case bp ->> 'op'
          when 'at_least' then cnt.c >= (bp ->> 'count')::bigint
          when 'at_most'  then cnt.c <= (bp ->> 'count')::bigint
          else false
        end, false)
    )
  group by coalesce(nullif(p.traits ->> p_dimension, ''), '(unknown)')
  order by users desc, bucket asc;
end;
$$;

comment on function public.fn_segment_distribution(uuid, jsonb, text, timestamptz, timestamptz) is
  'Distribution by one trait dimension of the users matching a closed jsonb segment rule (ADR 0089); absent traits fold into (unknown), SUM(users) == fn_segment_size. SECURITY INVOKER — runs under the caller''s RLS.';

-- ---------------------------------------------------------------------------
-- Least-privilege execution: signed-in users only (the product is authenticated-only,
-- ADR 0016). The functions read profiles/events under the caller's RLS, so a
-- non-member already sees nothing; restricting EXECUTE keeps anon out of the call
-- surface entirely, matching the PR-2 helper and PR-4/5/6 aggregation idiom.
-- ---------------------------------------------------------------------------
-- The shared validator is called by the SECURITY INVOKER aggregations as the invoking
-- member, so `authenticated` needs EXECUTE on it too; anon stays out of the call surface.
revoke execute on function public.fn_segment_validate_rule(jsonb) from public;
grant execute on function public.fn_segment_validate_rule(jsonb) to authenticated;

revoke execute on function
  public.fn_segment_size(uuid, jsonb, timestamptz, timestamptz)
from public;
grant execute on function
  public.fn_segment_size(uuid, jsonb, timestamptz, timestamptz)
to authenticated;

revoke execute on function
  public.fn_segment_distribution(uuid, jsonb, text, timestamptz, timestamptz)
from public;
grant execute on function
  public.fn_segment_distribution(uuid, jsonb, text, timestamptz, timestamptz)
to authenticated;

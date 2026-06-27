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
  -- The rule must be a json object, and its predicate lists (when present) arrays —
  -- so jsonb_array_elements below never errors on a scalar. A typed contract; the Zod
  -- `[segment]` schema (ADR 0017) is the client-side authority, this is the DB guard.
  if jsonb_typeof(p_rule) <> 'object' then
    raise exception 'segment rule must be a json object' using errcode = '22023';
  end if;
  if p_rule ? 'attributes' and jsonb_typeof(p_rule -> 'attributes') <> 'array' then
    raise exception 'segment rule "attributes" must be an array' using errcode = '22023';
  end if;
  if p_rule ? 'behaviors' and jsonb_typeof(p_rule -> 'behaviors') <> 'array' then
    raise exception 'segment rule "behaviors" must be an array' using errcode = '22023';
  end if;
  -- Each behavioural predicate's `count` must be a number, so the `::bigint` cast in
  -- the matching block yields a clean 22023 rather than a 22P02 cast error on a
  -- hand-crafted non-numeric value — the Zod `[segment]` schema (ADR 0017) is the
  -- client-side authority; this keeps the DB guard's error class uniform.
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_rule -> 'behaviors', '[]'::jsonb)) as bp
    where jsonb_typeof(bp -> 'count') is distinct from 'number'
  ) then
    raise exception 'segment behaviour predicate "count" must be a number'
      using errcode = '22023';
  end if;
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
  if jsonb_typeof(p_rule) <> 'object' then
    raise exception 'segment rule must be a json object' using errcode = '22023';
  end if;
  if p_rule ? 'attributes' and jsonb_typeof(p_rule -> 'attributes') <> 'array' then
    raise exception 'segment rule "attributes" must be an array' using errcode = '22023';
  end if;
  if p_rule ? 'behaviors' and jsonb_typeof(p_rule -> 'behaviors') <> 'array' then
    raise exception 'segment rule "behaviors" must be an array' using errcode = '22023';
  end if;
  -- Each behavioural predicate's `count` must be a number, so the `::bigint` cast in
  -- the matching block yields a clean 22023 rather than a 22P02 cast error on a
  -- hand-crafted non-numeric value — the Zod `[segment]` schema (ADR 0017) is the
  -- client-side authority; this keeps the DB guard's error class uniform.
  if exists (
    select 1 from jsonb_array_elements(coalesce(p_rule -> 'behaviors', '[]'::jsonb)) as bp
    where jsonb_typeof(bp -> 'count') is distinct from 'number'
  ) then
    raise exception 'segment behaviour predicate "count" must be a number'
      using errcode = '22023';
  end if;
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

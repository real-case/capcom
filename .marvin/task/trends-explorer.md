---
slug: trends-explorer
type: feature
status: shipped
created: 2026-06-25
tracker: none
supersedes: none
stack: sql, typescript, javascript
risk: medium
breaking: false
spike_required: false
test_command: npm run db:reset && npm run gen:types && npx tsc --noEmit && npm run lint && npm run check:fsd && npm run check:design-system && npm run test:coverage && SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z npm run seed:events && npm run test:e2e
contract_sha: authored-with-implementation
---

# CAPCOM Trends — first flagship vertical slice (PR-4)

## Goal

Realize the accepted **ADR 0084** (in-database aggregation) and **ADR 0086** (visx +
token charting) as the first end-to-end product slice: in-DB `SECURITY INVOKER`
set-returning functions reduce the `events` stream by time bucket under the caller's
RLS, the result is called as a typed RPC, cached by TanStack Query, driven by nuqs
URL state, and drawn by presentational token-only visx widgets — proving the whole
spine **ingest → event model → SQL aggregation → TanStack Query → nuqs → token-governed
chart** on real multi-tenant RLS. No new ADR (0084/0086 accepted).

## Context

- Decisions of record: **ADR 0084** (accepted) — aggregations are Postgres
  views/`SECURITY INVOKER` set-returning functions invoked as RPC under the caller's
  RLS, params as function arguments, results typed via `gen:types` (0015), refreshed by
  poll (TanStack Query), never reduced in application code. **ADR 0086** (accepted) —
  charts are built from visx primitives (`@visx/scale`, `@visx/shape`, `@visx/axis`,
  `@visx/group`), unstyled, every color/size from the generated token allowlist (0058)
  and the mission-control data-viz palette (0081); widgets are presentational (props
  only, no fetching/aggregation), SVG carries explicit a11y roles and renders
  deterministically for Chromatic (0043).
- Related patterns: the membership-join helpers and `SECURITY DEFINER`/pinned-`search_path`
  function idiom in [create_tenancy.sql:135](supabase/migrations/20260623115135_create_tenancy.sql)
  (the aggregation fns here are `SECURITY INVOKER` instead — they run _as_ the caller so
  RLS applies); the events schema + the `(project_id, ts)` / `(project_id, event_name)`
  indexes the trend/top-events scans use ([create_events_profiles.sql:87](supabase/migrations/20260624045654_create_events_profiles.sql));
  the RLS-scoped entity-fetcher + query-shape-test pattern in
  [entities/event/api/queries.ts](src/entities/event/api/queries.ts) and
  [queries.test.ts](src/entities/event/api/queries.test.ts); the browser client
  factory [client.ts:14](src/lib/supabase/client.ts) (this slice's first client-side
  `useQuery` consumer); the wired-but-unused TanStack + nuqs providers
  ([providers.tsx](src/app/providers.tsx)); the `queryKeys` factory template
  ([keys.ts:28](src/lib/query/keys.ts)); the RLS-isolation e2e pattern in
  [e2e/rls-events.spec.ts](e2e/rls-events.spec.ts); the RSC project page that this slice
  adds a sibling route beside ([page.tsx](<src/app/[locale]/(app)/p/[projectId]/page.tsx>)).
- Callers / reverse-deps: the new RPCs have no callers but the new entity fetchers; the
  trends page is a new route (no inbound links except the one added from the project
  overview). `eslint.config.mjs` token-lint block currently scopes `src/components/**`
  ([eslint.config.mjs:55](eslint.config.mjs)) — extended here to also cover `src/widgets/**`.
- Constraints: Supabase baseline = Postgres + RLS + Auth only, no external OLAP, no
  Realtime (ADR 0012/0079 — poll/refetch); migrations are plain SQL with RLS versioned
  together (ADR 0014); types generated not written (ADR 0015); aggregation never lives in
  application code (ADR 0084); chart widgets carry no baked palette and no raw SVG
  `fill`/`stroke` (ADR 0086/0058); every user-facing string via next-intl (ADR 0030);
  FSD import direction + public `index.ts` (ADR 0065/0066); merging is human-only (ADR 0046).
- Sibling specs: builds on `tenancy-foundation` (PR-2, `status: done`) and the merged PR-3
  events/profiles/ingest work; PR-5 (funnels) and PR-6 (retention) reuse this exact
  `SECURITY INVOKER` RPC + token-visx-widget pattern.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: supabase/migrations/20260625120000_create_event_trends.sql
    action: new
    intent: >-
      Two SECURITY INVOKER, search_path-pinned set-returning functions over events,
      invoked as the caller so the ADR 0083 membership-join RLS applies (no scoping
      code): fn_event_trends(p_project_id, p_event_name, p_from, p_to, p_interval,
      p_breakdown_key default null, p_breakdown_limit default 8) returning
      setof (bucket timestamptz, series text, count bigint) — buckets zero-filled via
      generate_series(date_trunc(p_interval, ...)) cross-joined with the series set, one
      constant series when p_breakdown_key is null else the top-N properties->>key values
      plus an 'Other' rollup; and fn_top_events(p_project_id, p_from, p_to, p_limit
      default 10) returning setof (event_name text, count bigint) ranked desc. p_interval
      constrained to hour|day|week|month. EXECUTE granted to authenticated.
    satisfies: [AC1, AC2, AC3]
  - id: F2
    path: src/lib/supabase/database.types.ts
    action: edit
    intent: Regenerated by gen:types — adds the fn_event_trends / fn_top_events Args+Returns RPC signatures.
    satisfies: [AC8]
  - id: F3
    path: src/entities/event/model/types.ts
    action: edit
    intent: >-
      Add EventTrendBucket and TopEvent row types derived from the generated RPC Returns
      (Database["public"]["Functions"][...]["Returns"][number]) — never hand-written (ADR 0015).
    satisfies: [AC4, AC8]
  - id: F4
    path: src/entities/event/api/queries.ts
    action: edit
    intent: >-
      Add fetchEventTrends and fetchTopEvents — RLS-scoped supabase.rpc() calls passing the
      function arguments; throw on error, return [] on null; no reduction here (ADR 0084).
    satisfies: [AC4]
  - id: F5
    path: src/entities/event/api/queries.test.ts
    action: edit
    intent: >-
      Add rpc-shape unit tests using a recording client mock — assert each fetcher calls
      .rpc with the exact function name and argument bag, returns rows / [] / throws.
    satisfies: [AC4]
  - id: F6
    path: src/entities/event/index.ts
    action: edit
    intent: Export the new EventTrendBucket / TopEvent types and the fetchEventTrends / fetchTopEvents fetchers from the public API.
    satisfies: [AC4]
  - id: F7
    path: src/lib/query/keys.ts
    action: edit
    intent: Add a hierarchical `trends` query-key family (all / list(params)) following the documented shape, replacing the placeholder notes example.
    satisfies: [AC5]
  - id: F8
    path: src/features/trends-explorer/model/url-state.ts
    action: new
    intent: >-
      nuqs parsers + a Zod-validated TrendsQuery type for event / from / to / interval /
      breakdown URL state (ADR 0017/0027), with sane defaults (e.g. last 30 days, day interval).
    satisfies: [AC5]
  - id: F9
    path: src/features/trends-explorer/model/url-state.test.ts
    action: new
    intent: Unit tests — parse/serialize round-trips, default application, and interval/range validation.
    satisfies: [AC5]
  - id: F10
    path: src/features/trends-explorer/api/use-trends.ts
    action: new
    intent: >-
      Client TanStack Query hooks (useEventTrends / useTopEvents) over the entity fetchers
      via the browser client, keyed by queryKeys.trends — the poll/refetch cache (ADR 0084/0025).
    satisfies: [AC5]
  - id: F11
    path: src/features/trends-explorer/ui/TrendsExplorer.tsx
    action: new
    intent: >-
      Client component: nuqs-bound controls (event picker, date range, interval, breakdown
      key) that drive useEventTrends/useTopEvents and compose the two widgets, threading
      loading/error/empty down as props (ADR 0086 — widgets stay presentational).
    satisfies: [AC5, AC6]
  - id: F12
    path: src/features/trends-explorer/ui/TrendsExplorer.test.tsx
    action: new
    intent: Component test — changing a control updates the URL state and the query inputs (mocked hooks).
    satisfies: [AC5]
  - id: F13
    path: src/features/trends-explorer/index.ts
    action: new
    intent: Public API of the trends-explorer feature — exports TrendsExplorer.
    satisfies: [AC5]
  - id: F14
    path: src/widgets/trends-chart/ui/TrendsChart.tsx
    action: new
    intent: >-
      Presentational visx line/area chart of EventTrendBucket rows; scales/axes/series colors
      sourced only from the generated token allowlist + viz palette (var(--color-viz-*)); renders
      empty/loading/error states; SVG role="img" + aria-label; deterministic (no time/random).
    satisfies: [AC6, AC7]
  - id: F15
    path: src/widgets/trends-chart/ui/TrendsChart.stories.tsx
    action: new
    intent: >-
      CSF3 stories for the meaningful states (default/multi-series, empty, loading, error,
      overflow) under the axe a11y gate (ADR 0036/0038/0039); deterministic fixture data.
    satisfies: [AC6]
  - id: F16
    path: src/widgets/trends-chart/index.ts
    action: new
    intent: Public API of the trends-chart widget — exports TrendsChart and its props type.
    satisfies: [AC6]
  - id: F17
    path: src/widgets/top-events-bar/ui/TopEventsBar.tsx
    action: new
    intent: >-
      Presentational visx horizontal bar of TopEvent rows; token-only colors/sizes; empty/loading/
      error states; SVG a11y role + label; deterministic.
    satisfies: [AC6, AC7]
  - id: F18
    path: src/widgets/top-events-bar/ui/TopEventsBar.stories.tsx
    action: new
    intent: CSF3 stories for default/empty/loading/error/overflow under the axe a11y gate; deterministic fixtures.
    satisfies: [AC6]
  - id: F19
    path: src/widgets/top-events-bar/index.ts
    action: new
    intent: Public API of the top-events-bar widget — exports TopEventsBar and its props type.
    satisfies: [AC6]
  - id: F20
    path: eslint.config.mjs
    action: edit
    intent: >-
      Extend the design-token-usage lint block's `files` glob (and its test/stories ignores)
      from src/components/** to also cover src/widgets/** so the token rules apply to chart SVG
      where it lives — implements ADR 0086's confirmation; no token rule changes. NOTE: the
      config glob alone is insufficient — the check:tokens npm script must also pass src/widgets
      to eslint (see F24), or the gate never lints the widgets.
    satisfies: [AC7]
  - id: F21
    path: src/app/[locale]/(app)/p/[projectId]/trends/page.tsx
    action: new
    intent: >-
      RSC route — sets locale, resolves the project under RLS (404 leaking nothing, mirroring
      the overview page), renders <TrendsExplorer projectId=...>. Next-runtime-only → covered by
      build + e2e, excluded from unit coverage per vitest.config.mts.
    satisfies: [AC5]
  - id: F22
    path: src/app/[locale]/(app)/p/[projectId]/page.tsx
    action: edit
    intent: Add a locale-aware link from the project overview to the new /trends route.
    satisfies: [AC5]
  - id: F23
    path: messages/en.json
    action: edit
    intent: Add a `Trends` namespace (page title, control labels, empty/error copy) — the source catalog (ADR 0030/0055).
    satisfies: [AC5]
  - id: F24
    path: package.json
    action: edit
    intent: >-
      (a) Add the @visx/* chart primitive dependencies (scale, shape, axis, group, plus
      responsive/grid as needed) — all MIT, within the SPDX allowlist (ADR 0071); the
      ADR-0086-sanctioned EXTENSION. (b) Widen the `check:tokens` script from
      `eslint src/components` to `eslint src/components src/widgets --no-error-on-unmatched-pattern`
      so the token gate actually lints the new chart widgets (pairs with F20's config glob).
    satisfies: [AC6, AC7]
  - id: F25
    path: e2e/trends.spec.ts
    action: new
    intent: >-
      Playwright e2e against local Supabase seeded by `seed:events` under the pinned
      SEED_EVENTS_ANCHOR (2026-06-24T12:00:00Z, trailing 90-day spread). Signs in as a seeded
      member and calls each RPC with an EXPLICIT window covering the anchored range (not the UI
      relative default) so assertions are wall-clock-independent: fn_event_trends proves zero-
      filled buckets and BOTH series paths (single-series with no breakdown; top-N values plus
      an 'Other' rollup for a known generator property such as `plan`/`country`); fn_top_events
      proves descending rank + limit. A non-member (RLS) gets error === null and rows === []
      from both RPCs (SECURITY INVOKER inherits the membership-join scope — empty, not a 42501
      permission error), mirroring e2e/rls-events.spec.ts.
    satisfies: [AC1, AC2, AC3]
  - id: F26
    path: docs/capcom/PROGRESS.md
    action: edit
    intent: Update the status table + handoff (PR-4 shipped, PR-5 next) — the repo's end-of-PR merge obligation.
    satisfies: ["—"]
  - id: F27
    path: vitest.config.mts
    action: edit
    intent: >-
      Add a coverage exclusion for the new trends route — the existing globs stop at
      `src/app/[locale]/*/p/*/page.tsx`, one segment shallower than
      `src/app/[locale]/*/p/*/trends/page.tsx`, so without this the Next-runtime-only RSC route
      (F21) sits in the >=80% denominator with zero unit coverage and can push test:coverage red.
    satisfies: ["—"]
  - id: F28
    path: src/lib/query/keys.test.ts
    action: edit
    intent: >-
      Update the query-keys test to assert the new `trends` family (F7 replaces the placeholder
      `notes` example, whose `queryKeys.notes.all` this test currently asserts — it would break
      otherwise).
    satisfies: [AC5]
build_order:
  [
    F1,
    F2,
    F3,
    F4,
    F5,
    F6,
    F7,
    F8,
    F9,
    F10,
    F14,
    F16,
    F17,
    F19,
    F11,
    F12,
    F13,
    F15,
    F18,
    F20,
    F21,
    F22,
    F23,
    F24,
    F27,
    F28,
    F25,
    F26,
  ]
depends_on: []
contract:
  kind: function
  signature: |
    -- Postgres RPC (SECURITY INVOKER, search_path pinned), called via supabase.rpc():
    fn_event_trends(
      p_project_id uuid, p_event_name text, p_from timestamptz, p_to timestamptz,
      p_interval text,                 -- one of: hour | day | week | month
      p_breakdown_key text default null, p_breakdown_limit int default 8
    ) returns setof (bucket timestamptz, series text, count bigint)
    fn_top_events(
      p_project_id uuid, p_from timestamptz, p_to timestamptz, p_limit int default 10
    ) returns setof (event_name text, count bigint)
criteria:
  - id: AC1
    statement: >-
      Given a project seeded by `seed:events` under the pinned anchor, when fn_event_trends is
      called with an explicit window + interval, then it returns one count row per bucket with
      empty buckets zero-filled, a single series when p_breakdown_key is null, and — for a known
      multi-valued generator property (e.g. `plan`) — the top-`p_breakdown_limit` values plus an
      'Other' rollup series when that breakdown key is given.
    implemented_by: [F1, F25]
    oracle:
      kind: test
      ref: e2e/trends.spec.ts::fn_event_trends buckets and breakdown
    failure: gaps in the timeline, missing 'Other' rollup, or breakdown ignored
  - id: AC2
    statement: >-
      Given a project's seeded events, when fn_top_events is called with a window, then it
      returns event_name counts ranked descending and limited to p_limit.
    implemented_by: [F1, F25]
    oracle:
      kind: test
      ref: e2e/trends.spec.ts::fn_top_events ranking
    failure: unranked, unbounded, or unscoped results
  - id: AC3
    statement: >-
      Given a signed-in user who is not a member of the project, when they invoke either RPC
      for that project, then the call returns error === null and rows === [] (RLS inherited via
      SECURITY INVOKER — empty, not a 42501 permission error), never another tenant's aggregates.
    implemented_by: [F1, F25]
    oracle:
      kind: test
      ref: e2e/trends.spec.ts::cross-tenant isolation
    failure: a non-member reads aggregated counts, or the path errors instead of returning empty
  - id: AC4
    statement: >-
      Given the entity fetchers, when fetchEventTrends / fetchTopEvents run, then each calls
      supabase.rpc with the exact function name and argument bag, returns the rows, returns []
      on null data, and throws on error — performing no client-side reduction.
    implemented_by: [F3, F4, F5, F6]
    oracle:
      kind: test
      ref: src/entities/event/api/queries.test.ts::rpc fetchers call the right function with the right args
    failure: wrong fn name/args, reduction in TS, or a swallowed error
  - id: AC5
    statement: >-
      Given the trends explorer, when the event / date-range / interval / breakdown controls
      change, then the nuqs URL state round-trips those values (a shareable link) and the
      TanStack query inputs update accordingly.
    implemented_by: [F7, F8, F9, F10, F11, F12, F13, F21, F22, F23, F28]
    oracle:
      kind: test
      ref: src/features/trends-explorer/model/url-state.test.ts::parse and serialize round-trip with defaults
    failure: state not reflected in the URL, or controls do not re-drive the query
  - id: AC6
    statement: >-
      Given the chart widgets, when each is fed its empty, loading, error, populated, AND
      overflow data, then it renders the corresponding state with an SVG a11y role+label — each
      state is a named CSF3 story (so a missing state is a missing export, not a silent pass) and
      every story passes the axe gate (ADR 0039); renders are deterministic for Chromatic (0043).
    implemented_by: [F11, F14, F15, F16, F17, F18, F19, F24]
    oracle:
      kind: command
      ref: npm run test
    failure: a state lacks a story, an axe violation, or a non-deterministic render
    note: >-
      The scoped local proof is the `story-verify` browser-mode run over each widget; `npm run
      test` is the merge-blocking superset (both Vitest projects, axe over every story).
  - id: AC7
    statement: >-
      Given the token-usage gate extended to widgets, when check:tokens runs, then src/widgets/**
      is linted and the chart widgets pass with no raw color/size literals, inline-style raw
      values, raw SVG fill/stroke, or Tailwind numbered-palette classes — only var(--token).
    implemented_by: [F14, F17, F20]
    oracle:
      kind: command
      ref: npm run check:tokens
    failure: the gate skips widgets, or a chart smuggles a raw color/size value
  - id: AC8
    statement: >-
      Given the new RPCs, when gen:types regenerates database.types.ts and the app typechecks,
      then both functions appear as typed Args+Returns signatures and the entity types derive
      from them with no drift.
    implemented_by: [F1, F2, F3]
    oracle:
      kind: command
      ref: npx tsc --noEmit
    failure: type drift, hand-written row types, or an untyped rpc call
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - typecheck + lint + format:check green (CI quality gate)
  - check:fsd + check:boundaries + check:design-system (incl. check:tokens, check:contrast, check:i18n) green
  - test:coverage >= 80%
  - build green; test:e2e green locally (DEV-001 deferred in CI)
  - gen:types committed with the migration (no drift); PROGRESS.md handoff updated
  - supabase-rls-reviewer run over the new migration before the PR (ADR 0083 confirmation)
  - Conventional Commits (commitlint); no AI attribution
gates:
  test: npm run test:coverage
```

## Data & Config

- **Migration (forward):** `supabase/migrations/*_create_event_trends.sql` adds two
  `SECURITY INVOKER` set-returning functions; no table/column changes, no data migration,
  no backfill. **Rollback:** `drop function` for both (a new down-migration if ever needed);
  the functions read existing tables only, so reverting is non-destructive.
- `gen:types` regenerates `src/lib/supabase/database.types.ts` (committed with the migration).
- **New dependency:** `@visx/*` (MIT) — the ADR-0086 charting primitive layer.
- **Test data:** the static `supabase/seed.sql` carries only ~5 events (enough for the RLS
  e2e), with no breakdown-rich properties; the dense, deterministic `scripts/seed-events.mjs`
  (`npm run seed:events`) supplies the `plan`/`country`/`device`/`path` properties the breakdown
  path needs. `test_command` therefore runs `seed:events` with a **pinned**
  `SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z` (trailing 90-day spread) before `test:e2e`, and
  the e2e queries an **explicit** window over that anchored range so assertions don't drift with
  the wall clock. `seed:events` needs the service-role secret (auto-detected from `supabase
status` locally, per PROGRESS.md).
- **Config:** `check:tokens` script widened to lint `src/widgets` (F24); a coverage exclusion
  for the trends route added to `vitest.config.mts` (F27).
- No new env vars or feature flags. Members already hold `SELECT` on `events`; the RPCs run
  under their RLS, so no new GRANTs beyond `EXECUTE` on the two functions to `authenticated`.

## Chosen Approach

Variant 1 — **two flat-row `SECURITY INVOKER` set-returning functions with SQL-side
gap-fill**. `fn_event_trends` buckets via `generate_series(date_trunc(p_interval, p_from) …
p_to, p_interval)` cross-joined with the resolved series set (a single constant series, or
the top-`p_breakdown_limit` `properties->>p_breakdown_key` values with the remainder folded
into an `'Other'` series) and left-joined to the per-bucket counts so empty buckets surface
as `0`. `fn_top_events` ranks `count(*)` by `event_name` over the window, `limit p_limit`.
Both pin `search_path = ''`, run `SECURITY INVOKER` so the ADR 0083 membership-join RLS on
`events` applies to the caller automatically, and grant `EXECUTE` to `authenticated`. The
flat `(bucket, series, count)` / `(event_name, count)` rows are typed via `gen:types` and map
straight onto visx; reduction stays entirely in the database (ADR 0084). The feature layer
only selects which fn args to send (from nuqs state) and caches the rows (TanStack Query) —
it performs no aggregation. The chart SVG draws color/size exclusively from
`var(--color-viz-*)` / token utilities, and `check:tokens` is extended to lint `src/widgets/**`
so that discipline is gate-enforced (ADR 0086/0058).

**Stack compliance:** EXTENSION
**Future alignment:** N/A (no VISION.md; aligns with the roadmap — PR-5/6 reuse this pattern)

**Stack extensions required:**

- `@visx/scale`, `@visx/shape`, `@visx/axis`, `@visx/group` (+ `@visx/responsive`/`@visx/grid`
  as needed) — MIT, the ADR-0086-decided charting primitive layer, within the SPDX allowlist (0071).

## Why this over alternatives

- Variant 2 (one composite `kind`-discriminated function, rejected): a union-shaped result is
  awkward to type via `gen:types` and to consume, breaks ADR 0084's "the function _is_ the
  contract" clarity, and makes each widget over-fetch the other's rows.
- Variant 3 (sparse SQL + gap-fill/top-N in the TanStack hook, rejected): pushes
  reduction/shaping into application code — the exact ADR 0084/0013 anti-pattern — and weakens
  the demo's "aggregations are real SQL" success criterion.

## Test Plan

- Harness: Vitest (`npm run test` — unit jsdom + Storybook browser projects; coverage via
  `npm run test:coverage`, ≥80%); Playwright for the SQL functions (`npm run test:e2e`,
  builds the app + runs against local Supabase).
- Test locations: colocated `*.test.ts(x)` beside source (entity rpc-shape tests, nuqs
  url-state tests, the TrendsExplorer component test); colocated `*.stories.tsx` for widget
  states (stories double as the a11y/axe + render tests, ADR 0035/0039); `e2e/trends.spec.ts`
  for the in-DB function behavior + cross-tenant RLS.
- Conventions: the recording query-builder mock from
  [entities/event/api/queries.test.ts](src/entities/event/api/queries.test.ts) (assert the
  call shape, not just the value) — extended with an `.rpc(name, args)` recorder; the
  sign-in-as-seeded-user + assert-exact-outcome shape from
  [e2e/rls-events.spec.ts](e2e/rls-events.spec.ts) (data rows + zero-row RLS denials);
  deterministic fixtures in stories (no time/random) for Chromatic stability.

## Definition of Done

- [ ] `npm run test:coverage` green (≥80%), including the new unit + story tests
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run format:check` green
- [ ] `npm run check:fsd` + `npm run check:boundaries` + `npm run check:design-system`
      (incl. `check:tokens` now covering `src/widgets/**`, `check:contrast`, `check:i18n`) green
- [ ] `npm run build` green; `npm run test:e2e` green locally (DEV-001 deferred in CI)
- [ ] `gen:types` committed with the migration (no type drift); `supabase-rls-reviewer` run
      over the migration before the PR (ADR 0083 confirmation)
- [ ] `docs/capcom/PROGRESS.md` handoff updated (merge obligation); Conventional Commits, no AI attribution

## Non-goals

- No funnels, retention, or segmentation (PR-5/6/7) — only trends.
- No saved reports / dashboards / Server-Action persistence (PR-8); a report is shareable only
  via its nuqs URL.
- No new ingest path or SDK — data is the existing seed (`seed:events`); the RPCs read it.
- No Realtime/live updates — refresh by poll/refetch (ADR 0012/0079).
- No multi-event overlay in one query — a trends query targets one `event_name` (with optional
  property breakdown into multiple series); multi-event comparison is deferred.
- No Figma/design import this slice — code-first from tokens; `check:seals` stays inert (ADR 0063).
- No light/dark toggle (ADR 0079); the chart uses the dark value layer only.

## Assumptions

- Code-first data-viz language (user-confirmed): the chart vocabulary is derived from the
  mission-control viz tokens; a Figma source can be layered later per ADR 0063.
- Full roadmap scope (user-confirmed): breakdown-by-property and the secondary top-events bar
  widget are both in this slice.
- The token gate is extended to `src/widgets/**` via **both** `eslint.config.mjs` (the rule's
  `files` glob, F20) **and** the `check:tokens` npm script (F24) — the config glob alone does
  not lint widgets because the script only passes `src/components` to eslint. Treated as
  completing ADR 0086's confirmation, not a new decision, so no superseding ADR.
- Default trends window is the last 30 days at `day` interval; intervals offered are
  hour|day|week|month. Date ranges are relative presets encoded in the URL; the seed clock is
  anchored (PR-3) so the demo window has signal. The **e2e** does not rely on this relative
  default — it queries an explicit window over the pinned `SEED_EVENTS_ANCHOR` range so its
  assertions are wall-clock-independent.
- Breakdown collapses to the top 8 property values (matching the categorical palette size) plus
  an `'Other'` series.

## Open Questions

none

## Security / NFR

- **Auth/isolation:** the RPCs are `SECURITY INVOKER` and read `events`/`profiles` under the
  caller's RLS, so the ADR 0083 membership-join scope is inherited — a non-member sees zero
  rows (AC3). `EXECUTE` is granted only to `authenticated`; `search_path` is pinned to `''` to
  prevent search-path injection, matching the tenancy helpers. `supabase-rls-reviewer` runs
  over the migration before the PR.
- **Input:** function arguments are typed; `p_interval` is constrained to a known set in SQL;
  `p_breakdown_key` indexes a jsonb property and cannot reach beyond the row's `properties`.
  URL state is Zod-validated at the nuqs boundary (ADR 0017).
- **NFR:** scans ride the existing `(project_id, ts)` / `(project_id, event_name)` indexes;
  set-based SQL over the seed volume. Determinism for Chromatic (no time/random in render).
  a11y: SVG roles/labels + axe gate (ADR 0039/0052). i18n: all copy via next-intl (ADR 0030).
  No PII beyond the seeded `distinct_id`/traits already in scope.

## Critic Verdict & Overrides

`marvin-tm-spec-critic`: **BLOCK** on the first pass — three blockers, all resolved in this
revision (none would have tripped the mechanical gate):

1. **AC7 oracle could not fail on widgets.** `check:tokens` is hardcoded to `eslint src/components`
   (`package.json`), so extending only the eslint-config glob (F20) never lints widgets. → Fixed:
   F24 also widens the `check:tokens` script to `eslint src/components src/widgets`; AC7 now
   `implemented_by` F24.
2. **Trends route not coverage-excluded.** `vitest.config.mts` globs stop at
   `src/app/[locale]/*/p/*/page.tsx`, one segment shallower than the trends route, so the
   Next-runtime-only RSC page would sit uncovered in the ≥80% denominator. → Fixed: added F27
   (`vitest.config.mts` exclusion).
3. **Breakdown path had no data.** `test_command` ran only `db:reset` (the ~5-event static
   `seed.sql`), never the breakdown-rich `seed:events`. → Fixed: `test_command` now runs
   `SEED_EVENTS_ANCHOR=… npm run seed:events` before `test:e2e`; F25/AC1 assert against the
   generator's properties over an explicit anchored window.

Warnings addressed: AC6 reworded so a missing state is a missing story export (not a silent
pass); F28 (`keys.test.ts`) added so F7's rewrite of the shared `queryKeys` factory doesn't
break its existing test; AC3 now asserts `error === null` + empty rows (not a permission error),
matching the existing `events` cross-tenant behavior. Scope warning (29 files, one vertical
slice) consciously accepted. Critic confirmations carried forward: the token-gate seam does not
over-reach widgets into component governance; `SECURITY INVOKER` vs `DEFINER` reasoning is
correct; no new ADR required; rejected variants are not strawmen.

## Design Notes

- The migration filename timestamp (`20260625120000_…`) is representative; the executor stamps
  the real `supabase migration new` timestamp at implementation time and keeps the
  `create_event_trends` slug. `contract_sha: authored-with-implementation` follows the repo's
  established convention (see `tenancy-foundation.md`).
- `SECURITY INVOKER` here is deliberate and the opposite of the PR-2 membership helpers
  (`SECURITY DEFINER`): those must bypass RLS to answer "is this user a member" without
  recursion; the aggregations must run _as_ the member so RLS scopes what they read.
- Keep the two functions independent and narrow so PR-5 (funnels) and PR-6 (retention) add
  sibling functions in the same idiom rather than overloading these.
- Write the widgets so a Figma-led restyle later changes only token mappings, not structure
  (ADR 0063 per-component approval remains possible).

## Future Considerations

- PR-5 funnels and PR-6 retention reuse this `SECURITY INVOKER` RPC + token-visx-widget
  pattern; the retention heatmap (ADR 0086 signature infographic) builds on the sequential viz
  scale already tokenized.
- Multi-event trend overlays and absolute custom date ranges are deliberately deferred.
- Saved/known reports (PR-8) will persist the same nuqs query state that this slice already
  makes shareable by URL.

## Delivery

- **PR:** [capcom#8](https://github.com/real-case/capcom/pull/8) (`feat/trends-explorer` → `dev`).
- **Verification:** all gates green — `tsc` · `lint` · `format:check` · `check:fsd` ·
  `check:boundaries` · `check:design-system` · `check:spelling` · `check:citations` ·
  `check:licenses` · `build` · `test:coverage` 97.05% (163 tests) · `test:e2e` 35 passed.
  Self-review `marvin-tm-diff-critic`: PASS (one blocker found and fixed pre-PR — AC4's
  rpc-shape oracle had been omitted; added).
- **⚠️ SPEC GAP — FSD slice structure (deviation from the contract `files`).** The contract
  listed `features/trends-explorer` + separate `widgets/trends-chart` + `widgets/top-events-bar`.
  FSD forbids that shape (`widgets` is a higher layer than `features` → a feature cannot import a
  widget; sibling widgets cannot import each other), and `check:fsd` (Steiger) rejected it.
  Decision: consolidated into one `widgets/trends-explorer` slice with the charts as internal
  `ui/` segments — the only FSD-legal shape; charts stay under `src/widgets/**` so the token gate
  still enforces AC7; public API exposes only `TrendsExplorer`; each chart keeps colocated
  stories. Rationale: minimal reasonable choice, no scope expansion; the diff-critic confirmed it
  correct and complete.
- **Conscious demo-scope (non-blocking, from the diff-critic):** a breakdown value literally
  named `'Other'` would merge with the rollup; the event picker lists the top-10 events (others
  URL-editable); a trailing zero bucket can render at the window edge.
- **Before merge (human):** run `supabase-rls-reviewer` over the migration (ADR 0083
  confirmation; CI e2e deferred under DEV-001).

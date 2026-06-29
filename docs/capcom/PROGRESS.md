# CAPCOM — build progress & handoff

> Resume point for a fresh session. The PR-by-PR backlog lives in
> [`roadmap.md`](./roadmap.md); this file records **what is done, the live
> environment gotchas, and the next concrete step**. Update it at the end of each PR.

## Status

| PR    | Theme                                           | State                      |
| ----- | ----------------------------------------------- | -------------------------- |
| PR-0  | Bootstrap                                       | ✅ merged                  |
| PR-DS | Design-system token foundation (0081–0082)      | ✅ merged                  |
| PR-1  | Foundational domain ADRs (0083–0086)            | ✅ merged                  |
| PR-2  | Tenancy: org/project/membership RLS + RBAC      | ✅ **merged (PR #6)**      |
| PR-3  | Events + profiles + ingest + seed generator     | ✅ **merged (PR #7)**      |
| PR-4  | Trends (in-DB aggregation → visx charts)        | ✅ **merged (PR #8)**      |
| PR-5  | Funnels (ordered-step conversion, ADR 0087)     | ✅ **merged (PR #9)**      |
| PR-6  | Retention cohort grid (ADR 0088)                | ✅ **merged (PR #10/#11)** |
| PR-7  | Segmentation (ADR 0089)                         | ✅ **merged (PR #12)**     |
| PR-8  | Dashboards & saved reports (ADR 0090)           | ✅ **merged (PR #13)**     |
| PR-9  | AI natural-language query (ADR 0091)            | ✅ **merged (PR #14)**     |
| PR-10 | Public landing + i18n/SEO + README              | ✅ **merged (PR #15)**     |
| REL   | First `dev → main` promotion — `v0.1.0` genesis | 🔧 **release PR prepared** |

Accepted ADRs now run **0001–0091, all accepted** (the corpus has no open `proposed` record).
PR-9 drafted **ADR 0091** (AI NL→query-spec contract) — `app.adr-review` READY → **human-accepted**
→ CLAUDE.md synced (1 Stack + 1 Conventions + 1 Restrictions line).
PR-8 drafted **ADR 0090** (saved-analysis persistence + member-write RBAC) — `app.adr-review`
READY → **human-accepted** → CLAUDE.md synced. The same human step also cleared the PR-6 tail:
**ADR 0088** (retention cohort semantics) was **accepted** alongside 0090, and the one CLAUDE.md
sync covered both. 0083 identity/event model, 0084 aggregation, 0085 ingestion contract, 0086
charting, 0087 funnel semantics, 0088 retention semantics, and 0089 segment model remain the
accepted foundation. **Numbering:** the roadmap pencilled 0088 for segmentation, but retention
took 0088, segmentation became 0089, and dashboards-persistence took **0090** (the roadmap had
no ADR for PR-8 — but the first writable-table RBAC decision warranted one, matching how PR-5/6/7
each recorded their semantics). PR-9 AI takes the next free id from `adr.py next` **if** it needs one.

## How to resume (environment — read first)

- **Node 24 is required** (`engines.node >=24 <25`). The default shell `node` is
  **v22** — prepend Node 24 before any `npm`/`npx`:

  ```bash
  export PATH="$(ls -d ~/.nvm/versions/node/v24.*/bin | tail -1):$PATH"
  ```

- **Local Supabase needs Docker running**, then `npx supabase start` (first boot pulls
  images). The DB container is `supabase_db_capcom`; direct psql:
  `docker exec -i supabase_db_capcom psql -U postgres -d postgres`.
- Core loop: edit migration → `npm run db:reset` (replays migrations + `supabase/seed.sql`)
  → `npm run gen:types` (regenerates `src/lib/supabase/database.types.ts`; stage with the
  migration). Seed users all share password `password123`.
- **Ingest route + seed generator + ingest e2e need the service-role secret.** The ingest
  write path (`/api/ingest`) and `npm run seed:events` run under `SUPABASE_SECRET_KEY`
  (the local `SECRET_KEY` from `npx supabase status`). For local e2e, put it in `.env.local`
  (gitignored) so `next start` picks it up; the seed generator auto-detects it from
  `supabase status` if the env var is unset. CI e2e is deferred (DEV-001), so this is a
  local-only setup step.
- **Dense demo data:** after `db:reset`, run `npm run seed:events` to generate ~6.8k events /
  360 profiles across the 3 seeded projects (deterministic; idempotent). `db:reset` alone
  loads only the small `seed.sql` fixtures (enough for the RLS e2e tests).
- **PostgREST multi-row insert gotcha:** a key absent from _some_ rows of a bulk insert is sent
  as `NULL`, not the column `DEFAULT` — so the ingest route stamps `ts` server-side on every
  row rather than relying on `events.ts`'s `default now()`. Keep per-row keys uniform in any
  future bulk write, or stamp the value explicitly.
- Gates (all must be green before a PR): `npx tsc --noEmit`, `npm run lint`,
  `npm run format:check`, `npm run check:fsd`, `npm run check:boundaries`,
  `npm run check:design-system`, `npm run check:i18n`, `npm run check:citations`,
  `npm run check:claude`, `npm run test:coverage` (≥80%), `npm run build`,
  `npm run test:e2e` (Playwright builds the app + runs against local Supabase).
- **Coverage policy:** Next-runtime-only files (RSC route files, Server Actions, the
  Supabase client factories) are excluded in `vitest.config.mts` and covered by
  `next build` + e2e; everything unit-testable is tested. Route-group dirs `(app)`/
  `(auth)` aren't glob-matchable in the exclude list — use `*` for that segment.

## What PR-2 left in place (PR-3 builds on this)

- **Schema:** `organizations → projects → memberships` (+ `app_role` enum
  `owner|admin|analyst|viewer`). Migration `supabase/migrations/20260623115135_create_tenancy.sql`.
- **RLS helpers (the public API for every domain table):** `SECURITY DEFINER`,
  search-path-pinned, execute granted to `authenticated`:
  - `public.is_member(p_project_id uuid) → boolean`
  - `public.has_role(p_project_id uuid, p_min_role app_role) → boolean`
  - (org-scoped `is_org_member` / `has_org_role` back the tenancy tables.)
    → **PR-3 domain tables (`events`, `profiles`) carry `project_id` and use
    `using (public.is_member(project_id))` for read, `has_role(project_id, …)` for writes.**
- **Identity split is law:** `auth.users` (member) ≠ `profiles` (tracked end-user, keyed
  by `distinct_id`). No FK from a domain row to `auth.users`.
- **Entities:** `src/entities/{organization,project,membership}` (types + RLS-scoped
  fetchers + role ladder) behind public `index.ts`. Auth shell + `(app)` route group +
  `widgets/workspace-switcher` exist. Seed: 2 orgs, 3 projects, members across roles
  (alice owner@Aurora+admin@Globex, bob viewer@Aurora, carol owner@Globex).
- **RLS test pattern:** `e2e/rls-tenancy.spec.ts` signs in as seeded users and asserts
  outcomes (data + `error.code` `42501` for RLS denials, zero-rows for USING filters).
  Copy this shape for PR-3 isolation tests.

## What PR-3 shipped (PR-4 builds on this)

- **Schema:** `profiles`, `events`, `project_ingest_keys` — migration
  `supabase/migrations/20260624045654_create_events_profiles.sql`.
  - `profiles` — tracked end-user keyed by `(project_id, distinct_id)`, `traits jsonb`,
    `first_seen_at`/`last_seen_at`; **never a FK to `auth.users`**. RLS read via
    `is_member(project_id)`.
  - `events` — immutable append-only: `project_id, event_name, distinct_id,
properties jsonb, ts`; three `project_id`-leading indexes (`ts`, `event_name`,
    `distinct_id`). RLS read via `is_member(project_id)`.
  - `project_ingest_keys` — per-project credential stored **hashed** (`key_hash`,
    sha-256 hex); RLS-on/**zero-policy**, no member/anon GRANT → service-role-only.
  - **Two write paths (ADR 0083/0085):** members get **SELECT only**; all writes go
    through the **service-role** (RLS-bypassing) ingest path, confined to the resolved
    `project_id`. `supabase-rls-reviewer` ran clean (live impersonation probes, no
    blockers).
- **Ingest:** `POST /api/ingest` (`src/app/api/ingest/route.ts`, Node runtime). Bearer
  ingest key → sha-256 → resolve to one `project_id` → Zod `[ingest]` batch → confined
  service-role insert of events + profile upsert. Structured `401/403/422` (ADR 0019).
  Pure pieces (`src/lib/ingest/{key,schema}.ts`) are unit-tested; the route is
  coverage-excluded (Next-runtime-only) and proven by `e2e/ingest.spec.ts`.
- **Seed generator:** `scripts/seed-events.mjs` (`npm run seed:events`) — deterministic,
  idempotent, ~6.8k events / 360 profiles across the 3 projects via direct service-role
  bulk insert (ADR 0085: generator = volume, route = contract).
- **Entities:** `src/entities/event` (`AnalyticsEvent`, `fetchRecentEvents`) and
  `src/entities/profile` (`Profile`, `fetchProfiles`/`fetchProfile`) — read-only,
  RLS-scoped, mirroring the PR-2 entity pattern. (Steiger flags them `insignificant-slice`
  — a warning, expected until PR-4 widgets consume them.)
- **Tests:** `e2e/rls-events.spec.ts` (cross-tenant event/profile/ingest-key isolation)
  - `e2e/ingest.spec.ts` (the 202/401/403/422 contract + project-scoped write). seed.sql
    carries a small deterministic fixture set so the RLS e2e is hermetic without the bulk
    generator.

## What PR-4 shipped (PR-5 builds on this)

First aggregation surface (ADR 0084) + first charts (ADR 0086), end-to-end on real RLS.

- **Migration `create_event_trends`:** two `SECURITY INVOKER`, `search_path`-pinned
  set-returning functions — `fn_event_trends(p_project_id, p_event_name, p_from, p_to,
p_interval, p_breakdown_key?, p_breakdown_limit?)` (zero-filled buckets via
  `generate_series`; single series, or top-N `properties->>key` + an `'Other'` rollup) and
  `fn_top_events(p_project_id, p_from, p_to, p_limit?)` (ranked desc). `INVOKER` (not the
  PR-2 helpers' `DEFINER`) so the membership-join RLS scopes what they read; `EXECUTE`
  granted to `authenticated` only. `#variable_conflict use_column` resolves the
  RETURNS-TABLE column/variable clash. `gen:types` regenerated.
- **Entities:** `entities/event` gained `EventTrendBucket` / `TopEvent` / `*Args` types
  (from the generated RPC `Returns`/`Args`) and `fetchEventTrends` / `fetchTopEvents` —
  thin `.rpc()` calls, no client-side reduction (ADR 0084).
- **Widget `trends-explorer`:** the first client-side `useQuery` consumer. nuqs URL-state
  (event / range / interval / breakdown — a shareable link, ADR 0027) drives TanStack
  hooks over the RPCs; internal visx chart segments (`TrendsChart` line, `TopEventsBar`
  bar) are presentational, token-only SVG (ADR 0086). **FSD note:** the roadmap's
  "feature + two chart widgets" split is invalid under FSD (a feature cannot import the
  higher `widgets` layer; sibling widgets cannot import each other) — so it is **one
  widget slice** with the charts as internal `ui/` segments. Steiger (`check:fsd`) is the
  gate that caught it.
- **Token gate now covers widgets:** `eslint.config.mjs` token block + the `check:tokens`
  script both extended to `src/widgets/**` (ADR 0086 confirmation made operative). Both
  the config glob AND the script are required — the glob alone never runs eslint over
  widgets.
- **Page:** `/(app)/p/[projectId]/trends` (RLS-404 like the overview), linked from the
  overview. `Trends` i18n namespace added. Coverage excludes the new route in
  `vitest.config.mts` (one segment deeper than the overview glob).
- **Tests:** `e2e/trends.spec.ts` proves zero-fill, breakdown top-N+`'Other'`, ranking,
  the interval guard, and cross-tenant **empty-not-error** (non-member RPC → `[]`,
  `error === null`) — query an **explicit** window over a pinned
  `SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z` so assertions don't drift with the clock.
  Unit: RPC fetcher shapes, nuqs url-state round-trip, the `TrendsExplorer` component
  (real hooks via `NuqsTestingAdapter`), and widget stories (empty/loading/error/overflow
  under axe). Coverage 94.85%. No new ADR (0084/0086 accepted).

## What PR-5 shipped (PR-6 builds on this)

Second aggregation surface — ordered-step funnel conversion — reusing the PR-4
`SECURITY INVOKER` RPC + token-visx-widget pattern, end-to-end on real RLS.

- **ADR 0087 (accepted):** the funnel **conversion semantics** 0084 left open — ordered,
  non-strict, **first-touch entry**, **single total conversion window from step 1**,
  counting **distinct users**, steps matched by `event_name`. Drafted `proposed` →
  `app.adr-review` (READY) → **human-accepted** → `CLAUDE.md` synced (one Conventions
  line). Per-step property filters / breakdowns / multi-attempt counting are stated scope
  boundaries.
- **Migration `create_funnel`:** `fn_funnel(p_project_id, p_steps text[], p_from, p_to,
p_window interval)` → `setof (step_index, step_event, users)`. A `with recursive` walk
  over the step index with a lateral `min(ts)` per step; first-touch entry in `[from, to)`,
  each later step the earliest at-or-after occurrence within `t1 + p_window`; counts
  non-increasing **by construction**. `SECURITY INVOKER` + pinned `search_path` +
  `#variable_conflict use_column`; guards reject `<2`/`>10` steps and a non-positive window;
  `EXECUTE` to `authenticated` only. `gen:types` regenerated. **`supabase-rls-reviewer`
  ran clean** (live non-member/member/anon probes; no SQL change).
- **Entity:** `entities/event` gained `FunnelStep` / `FunnelArgs` (generated RPC types) and
  `fetchFunnel` — a thin `.rpc()` call, no client-side reduction (ADR 0084).
- **Widget `funnel-builder`:** nuqs URL-state (ordered `steps` array + entry `range` +
  conversion `window` — a shareable link, ADR 0027) drives a TanStack hook over the RPC;
  internal visx `FunnelChart` segment is presentational, token-only SVG (ADR 0086), and
  derives the conversion **percentages** in the widget (display, not SQL reduction — ADR
  0087). One widget slice (FSD: a feature can't import widgets), same as trends.
- **Page:** `/(app)/p/[projectId]/funnels` (RLS-404), linked from the overview alongside
  trends. `Funnels` i18n namespace added; coverage excludes the new route in
  `vitest.config.mts` (mirrors trends).
- **Seed refinement (`scripts/seed-events.mjs`):** the entry pair now emits `sign_up`
  **strictly after** the landing `page_view` (minutes later, same session) instead of with
  independent intra-day jitter — so the canonical funnel measures genuine ordered
  conversion. Before: `160 → 59 → 58 → 15` (≈half of sign-ups lost to jitter ordering);
  after: **`160 → 114 → 111 → 35`** (71% sign-up / 97% activation / 31% purchase). Trends
  e2e is property-based, so it stays green.
- **Tests:** `e2e/funnels.spec.ts` proves monotonic non-increase, distinct-user entry
  counting, window-monotonicity (1h ⊆ 90d), order-sensitivity (entry = step 1), the guards,
  and cross-tenant **empty-not-error** (non-member → zero-count rows, `error === null`) —
  same pinned `SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z` window discipline as trends.
  Unit: `fetchFunnel` shape, nuqs url-state round-trip, the `FunnelBuilder` component (real
  hooks via `NuqsTestingAdapter`, incl. add/remove/edit step), and `FunnelChart` stories
  (empty/loading/error/overflow under axe). **Coverage 94.81%.** All gates green; build via
  the e2e webServer.

## What PR-6 shipped (PR-7 builds on this)

Third aggregation surface — acquisition-cohort retention — the signature dense heatmap,
reusing the PR-4/PR-5 `SECURITY INVOKER` RPC + token-visx-widget pattern, end-to-end on real
RLS.

- **ADR 0088 (proposed — awaits human acceptance):** the retention **cohort semantics** 0084
  left open — **acquisition cohorts** (calendar period of a user's global first-touch, included
  only if that first-touch is in `[from, to)`; pre-existing users not re-counted),
  **calendar-aligned** week/month periods, **classic active-in-period** retention (active in
  that exact period; reappearance allowed; curve not necessarily monotonic), counting
  **distinct users**, any event as a return. Drafted `proposed` → `adr.py lint`/`index` green.
  Rolling "through-N", per-user rolling windows, a specific return event, and daily granularity
  are stated scope boundaries. **The `proposed → accepted` flip + the CLAUDE.md sync are the
  outstanding human steps before merge** (mirrors the PR-5 0087 flow).
- **Migration `create_retention`:** `fn_retention(p_project_id, p_from, p_to, p_period text)` →
  `setof (cohort_period, cohort_size, period_offset, retained_users)`. Per-user `min(ts)` cohort
  - distinct `(user, active_period)` set + a generated triangular offset **spine** (zero-filled,
    like the PR-4 trend spine). Week offsets use date subtraction (`/7`), month offsets the
    `year*12+month` index diff — both DST-robust (no epoch arithmetic). `SECURITY INVOKER` +
    pinned `search_path` + `set timezone = 'UTC'` (deterministic calendar buckets) +
    `#variable_conflict use_column`; guards reject NULL arguments, a non-week/month period, and
    an empty/inverted date range (`p_to ≤ p_from`); `EXECUTE` to `authenticated` only.
    `gen:types` regenerated.
    **`supabase-rls-reviewer` ran clean** (live non-member/member/anon probes; injection probe on
    `p_period`; no SQL change).
- **Entity:** `entities/event` gained `RetentionCell` / `RetentionArgs` (generated RPC types)
  and `fetchRetention` — a thin `.rpc()` call, no client-side reduction (ADR 0084).
- **Widget `retention-grid`:** nuqs URL-state (analysis `range` + cohort `period` — a shareable
  link, ADR 0027) drives a TanStack hook over the RPC; internal visx-token `CohortGrid` segment
  is presentational, token-only SVG (ADR 0086), and derives the cell **percentage**
  (`retained/cohort_size`) in the widget (display, not SQL reduction — ADR 0088) with the
  **sequential** data-viz palette (`--color-viz-sequential-*`, ADR 0081) bucketed to 5 bins and
  per-bin text contrast. One widget slice (FSD: a feature can't import widgets), same as
  trends/funnels. **Naming:** slice `retention-grid` → `<RetentionGrid>` (wiring) →
  `<CohortGrid>` (heatmap); the roadmap's `widgets/cohort-grid` + separate `feature retention`
  split is invalid under FSD, identical to the PR-4/PR-5 reconciliation.
- **Page:** `/(app)/p/[projectId]/retention` (RLS-404), linked from the overview alongside
  trends/funnels. `Retention` i18n namespace + `ProjectOverview.openRetention` added; coverage
  excludes the new route in `vitest.config.mts` (mirrors funnels).
- **Tests:** `e2e/retention.spec.ts` proves the offset-0 = cohort-size baseline, the subset
  bound, the triangular+contiguous shape, distinct-user cohorting (via exact `profiles`/`events`
  head counts — no PostgREST page-cap trap) and first-touch exclusion (narrowing the window
  shrinks the cohort population), the week/month + guard behaviour, and cross-tenant
  **empty-not-error** (non-member → zero rows, `error === null`) — same pinned
  `SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z` window discipline as trends/funnels. Unit:
  `fetchRetention` shape, nuqs url-state round-trip, the `RetentionGrid` component (real hooks
  via `NuqsTestingAdapter`), and `CohortGrid` stories (empty/loading/error/overflow/monthly/dark
  under axe). **Coverage 95.64%.** All gates green; the heatmap was visually verified (dense
  triangle, light + dark) before handoff.

## What PR-7 shipped (PR-8 builds on this)

Fourth aggregation surface — user-authored segmentation — the first to take a **user-authored
rule** as input, reusing the PR-4/5/6 `SECURITY INVOKER` RPC + token-visx-widget pattern,
end-to-end on real RLS.

- **ADR 0089 (accepted):** the **segment-definition model** 0084 left open — a closed `jsonb`
  rule of **attribute** predicates over `profiles.traits` (`eq | neq | in`) + **behavioural**
  predicates over `events` (`at_least | at_most` a count in the window), **AND-composition only**
  (`match: "all"`). Drafted `proposed` → `app.adr-review` (READY) → **human-accepted** →
  `CLAUDE.md` synced (one Conventions + one Restrictions line). OR/nested logic, per-predicate
  windows, numeric `properties` predicates, and **saved/named segment persistence (deferred to
  PR-8)** are stated scope boundaries.
- **Migration `create_segments`:** `fn_segment_size(project, rule jsonb, from, to) → bigint`
  and `fn_segment_distribution(project, rule jsonb, dimension, from, to) → setof (bucket, users)`.
  A closed `case <op>` interpreter walks the rule with `jsonb_array_elements` — **no dynamic
  SQL**, rule values compared as `jsonb`/text literals, so the grammar's closure is the injection
  boundary. Three-valued logic is explicit (`not exists (… where not coalesce(<pred>, false))`):
  a NULL predicate (absent trait) is a failure, excluding the user. Guards reject non-object
  rules, non-array predicate lists, **non-numeric counts**, and an inverted window with `22023`;
  `SECURITY INVOKER` + pinned `search_path` + `EXECUTE` to `authenticated` only. `gen:types`
  regenerated. **`supabase-rls-reviewer` ran clean** (live cross-tenant + injection probes on
  both `profiles` and `events`; confirmed no dynamic SQL; invoker posture is the inverse of the
  PR-2 definer helpers).
- **Entity `entities/segment`:** the `[segment]` Zod rule schema (the ADR 0017 validation
  authority + ADR 0089 definition, with `TRAIT_KEYS` / `SEGMENT_EVENTS` vocabularies), the
  generated RPC types, and the `fetchSegmentSize` / `fetchSegmentDistribution` fetchers — a
  **first-class domain entity** (Steiger flags `insignificant-slice` until PR-8 persistence
  consumes it, exactly as `entities/event` was flagged in PR-3). The rule shape fixed here is
  what a PR-8 `segments.definition` column will store.
- **Widget `segment-builder`:** nuqs URL-state (the whole rule as one json-encodable value +
  dimension + range — a shareable segment link, ADR 0027) drives TanStack hooks over the RPCs;
  `SegmentBuilder` authors the rule with **always-valid** select/checkbox controls (no
  transient-invalid state that would revert a shared link), and the internal visx
  `SegmentDistribution` segment paints a token-only **categorical** bar chart (ADR 0086/0081)
  with the share-of-segment percentage derived in the widget (display, not SQL — ADR 0089). One
  widget slice (FSD: a feature can't import widgets), same as trends/funnels/retention.
- **Page:** `/(app)/p/[projectId]/segments` (RLS-404), linked from the overview alongside
  trends/funnels/retention. `Segments` i18n namespace + `ProjectOverview.openSegments` added;
  coverage excludes the new route in `vitest.config.mts` (mirrors retention).
- **Tests:** `e2e/segments.spec.ts` proves the empty/eq/neq/in/at_least/at_most **partitions**
  (eq+neq and performed+never each sum to the population; `in` = union of disjoint eq),
  **AND-intersection monotonicity**, **distribution-sums-to-size**, the **injection boundary**
  (a value carrying SQL metacharacters matches 0, raises nothing, tables intact), and cross-tenant
  **empty-not-error** — same pinned `SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z` discipline.
  Unit: the `[segment]` rule schema (discriminated union, defaults, bounds), both fetchers, the
  nuqs url-state round-trip, the `SegmentBuilder` component (real hooks via `NuqsTestingAdapter`,
  incl. the `in`-checkbox toggle seeded via initial `searchParams`), and `SegmentDistribution`
  stories (empty/loading/error/overflow/dark under axe). **Coverage 94.74%.** All gates green;
  build emits the segments route. `.cspell` gained `behavioural`, `metacharacters`.

## What PR-8 shipped (PR-9 builds on this)

The first member-**writable** surface — saved reports composed onto dashboards — proving Server
Actions + the optimistic-mutation default on real RLS, end to end. Code-first (no Figma; the 🎨
checkpoint was declined). All gates green; coverage 87% statements / 89% lines (≥80, ADR 0008).

- **ADR 0090 (accepted):** the **saved-analysis persistence model + write-RBAC** the roadmap left
  unrecorded. A **report** is one `reports(kind, config jsonb)` row storing the originating widget's
  URL-state (ADR 0027), validated by that widget's Zod schema (ADR 0017) and stored **opaque** at
  rest; a **dashboard** composes reports through an ordered `dashboard_reports` join (a "simple
  layout" — ordering only); writes are RBAC-gated. Drafted `proposed` → `app.adr-review` READY →
  **human-accepted** → CLAUDE.md synced (2 Conventions + 1 Restrictions line; the retention 0088
  line landed in the same sync). **Refines 0089**: the deferred segment persistence lands as a
  `kind='segment'` report's config, not a dedicated `segments.definition` column (no extra table).
- **Migration `create_reports_dashboards`:** `reports`, `dashboards`, `dashboard_reports` (+ the
  `report_kind` enum). **First member-writable tables** — the inverse of events/profiles: members
  WRITE directly, gated by RLS over the isolation (ADR 0090): `select` = `is_member(project_id)`,
  `insert/update/delete` = `has_role(project_id,'analyst')` so **viewer is read-only**; `owner_id`
  defaults to and is `with check`-pinned to `auth.uid()` (unspoofable); **no service-role write
  path**. Same-project composition is a **structural** guarantee — `dashboard_reports` carries
  `project_id` with composite FKs to `dashboards(id,project_id)` / `reports(id,project_id)`, so a
  board can never compose another tenant's report. `gen:types` regenerated. **`supabase-rls-reviewer`
  ran clean** (11 live impersonation probes as alice/bob/carol/dave/anon, all rolled back).
- **Entities:** `entities/report` (the config contract — `[report]` envelope, `reportKindRoute`,
  the `config → URLSearchParams` reopen serializer mirroring each widget's nuqs encoding, per-kind
  defaults, RLS-scoped fetchers) and `entities/dashboard` (composed `DashboardWithReports` fetch +
  position sort). **FSD note:** config stays **opaque jsonb** at the entity (the owning surface
  widget validates its grammar on reopen, exactly as ADR 0090 specifies) — so the entity never
  imports the higher `widgets` layer; `entities/dashboard` derives its row types from
  `@/lib/supabase`, not the sibling `entities/report` (same-layer isolation).
- **Server Actions (`features/report-actions`):** `"use server"` create/rename/delete report +
  dashboard, add/remove/reorder — the first UI write path. Zod-validated (uuid-**shape** regex, not
  strict v4 — the seed uses uuid-shaped ids), request-scoped `createClient()` under the caller's
  RLS, discriminated `{ ok }` results (never throws); 42501 → `forbidden`, an RLS-filtered 0-row
  update/delete → `not_found`. Coverage-excluded (Node-runtime); its input schemas are unit-tested.
- **Widget `widgets/dashboard`:** `DashboardManager` (container) wires the reads + **optimistic
  mutation hooks** (`onMutate` cache update → rollback on error → `onSettled` invalidate, ADR 0025)
  to a presentational `DashboardBoard` (RHF create forms, token-only, a11y; the `status-critical`
  tokens for the rejected-write banner so it clears AA contrast). **Self-contained write surface:**
  the four analysis widgets are **untouched** — reports reopen by deep-linking `/<surface>?<config>`
  which they already hydrate from URL-state. A per-surface "Save this analysis" button is a noted
  follow-up boundary. One widget slice (FSD), like trends/funnels/retention/segments.
- **Page:** `/(app)/p/[projectId]/dashboards` (RLS-404), linked from the overview; `Dashboards`
  i18n namespace + `ProjectOverview.openDashboards` (and the overview placeholder copy refreshed);
  coverage excludes the route + the actions in `vitest.config.mts`.
- **Tests:** `e2e/dashboards.spec.ts` (7) proves write-RBAC (analyst `dave` writes; viewer `bob`
  INSERT → 42501, UPDATE/DELETE → 0 rows, seed intact), owner-spoof rejection, cross-tenant
  isolation (`carol` sees no Aurora rows / 42501), composition + **reorder** persistence, and
  cross-project composition rejected — same seeded-impersonation discipline as the RLS specs. Unit:
  the config serializer + `[report]`/action/form schemas, both entity fetchers, the query keys, and
  the `DashboardManager` container (real optimistic hooks via mocked actions/fetchers, incl. the
  rejected-write rollback). Stories (empty/loading/error/action-error/overflow/dark + create/delete
  & reorder **play** functions) under axe. **Seed:** added `dave` (analyst@Aurora) + 3 saved reports
  - an "Acquisition overview" dashboard. `.cspell` gained spoofable/unspoofable/unvalidated/introspectable.

## What PR-9 shipped (PR-10 builds on this)

The AI natural-language query surface — a free-text prompt translated **server-side** into a closed,
Zod-validated query-spec that **deep-links** to an existing analysis surface. No migration, no new
SQL, no new chart code: PR-9 is purely the NL→spec translation layer over PR-4–8's surfaces. All
gates green; coverage 90.88% statements / 93.43% lines (≥80, ADR 0008). Code-first (no Figma).

- **ADR 0091 (accepted):** the **NL→query-spec contract** — the model returns a closed `{ kind, config }`
  discriminated union (a report minus its name, reusing 0090's shape), validated by one `[ai-query]`
  Zod schema that is the **injection boundary** (0089 extended to model output): bad output is
  **rejected, never coerced**. Interpretation = **deep-link** via 0090's `reportKindRoute` +
  `reportConfigToSearchParams`, so the slice never calls an RPC or renders a chart (FSD downward-only —
  the deep-link sidesteps the `feature → widgets` tension). No-key fallback = a **deterministic offline
  interpreter**. Drafted `proposed` → `app.adr-review` READY → **human-accepted** → CLAUDE.md synced.
- **Runtime AI client (`src/lib/ai`):** the app-side sibling of `scripts/ai/lib.mjs` (ADR 0075) — a
  provider-neutral, OpenAI-compatible `fetch` client, **server-only** (the `AI_*` vars live behind the
  `env.server.ts` fence, ADR 0018); `isAiConfigured()` gates the live path. `AI_API_KEY`/`AI_BASE_URL`/
  `AI_MODEL`/`AI_MAX_TOKENS` added to `env.server.ts`; `.env.example` notes the runtime use. No provider
  is hardwired (the chosen "fully neutral" option).
- **Feature `features/ai-query`:** `model/` holds the closed `[ai-query]` spec (discriminated union
  reusing `entities/segment`'s rule + mirroring the three small trends/funnel/retention enums — the
  0090 `defaultConfigForKind` mirror posture), the **deterministic offline interpreter** (a bounded
  keyword mapper, NOT NLU — returns null on no intent), the model prompt + **safe parser**
  (`safeParse`, drops extra keys), and the **pure `translate` orchestration** (the AI client is
  **injected**, so it's unit-tested without server-only — the stubbed-AI happy path + the no-key happy
  path). `api/actions.ts` is the `"use server"` translateQuery action (auth-gated token spend, no DB
  work, coverage-excluded). `ui/` is the container + presentational panel (offline banner, prompt box,
  example chips, interpreted-spec summary + "Open analysis →" deep-link). One feature slice; imports
  only downward (`entities/report`, `entities/segment`, `@/lib/ai`) — `check:boundaries` clean.
- **Page:** `/(app)/p/[projectId]/ask` (RLS-404 like the surfaces), linked from the overview; `AiQuery`
  i18n namespace + `ProjectOverview.openAiQuery`; coverage excludes the route + the action + `src/lib/ai/**`.
- **Tests:** `e2e/ai-query.spec.ts` — the **first browser UI journey beyond smoke**: UI sign-in →
  `/ask` → server-side translate (offline interpreter, keyless) → follow the deep-link onto the trends
  surface; robust to whether a key is provisioned (both engines map the fixture prompts the same).
  Unit: the spec schema (accept/round-trip/reject — the injection-boundary shape), the interpreter
  (the four example intents + the canonical fixture + unrecognized→null), the prompt safe-parser, the
  translate orchestration (no-key + stubbed-model + fallback paths), and the panel + manager (real
  hook, action mocked). Stories (default/offline/pending/trends/segment/unrecognized/dark + an Ask
  play) under axe. `.cspell` gained `parameterizes`.

## What PR-10 shipped (first `dev → main` promotion next)

The lead-gen front door + the re-armed CI safety net — the last roadmap unit before the first
production promotion. **No new ADR** (the landing rides 0030/0031, the CI re-enable rides
0007/0010/0008, the closure is a `deviations.md` status flip). All gates green; coverage stays
≥80% (ADR 0008). Single-locale (en); code-first (no Figma). Three workstreams, clean commits.

- **Public landing (`widgets/landing`):** the placeholder home is replaced by a real marketing
  landing built as an **FSD widget slice** so the design-token gate covers its markup (`src/app`
  is not token-gated, ADR 0058). The home route is a thin RSC container that reads the `Landing`/
  `Roles` namespaces (ADR 0030), assembles a typed copy object, and mounts the pure presentational
  `<LandingPage>` (Hero, SurfaceShowcase over the six surfaces, DemoAccess with the seeded creds +
  sign-in CTA, MethodologyStrip, SiteFooter). Props-in, zero client JS, a11y landmarks; `/en`
  prerenders as **static SSG**. **Token-palette gotcha:** the mission-control `surface-*`/`text-text-*`
  tokens are a fixed dark-first set; pairing them with the shadcn `foreground`/`card` set (which
  flips light/dark) fails AA contrast — the landing uses the shadcn palette throughout (what the
  existing widgets use). The axe gate caught it in the dark story.
- **i18n / SEO polish (ADR 0030/0031):** new `Landing` namespace (repurposed from `HomePage`, its
  only caller); `generateMetadata` adds a landing description + canonical/`hreflang`; the layout
  gains a shared OG/Twitter card; the home route emits **JSON-LD** (WebSite + SoftwareApplication).
  The OG image is a committed static 1200×630 asset (`public/og.png`), regenerated by
  `scripts/gen-og-image.mjs` (Playwright, dev-only) — **not** a dynamic `next/og` route (0031 defers
  that to its own ADR). `check:i18n` parity is vacuous at one locale; ICU is checked.
- **CI re-enable (DEV-001 + DEV-002, resolved):** `ci.yml` gains an **e2e** job (supabase start →
  `db:reset` → `gen:types` drift → export the local dev service key to `GITHUB_ENV` → `seed:events`
  at the pinned `2026-06-24` anchor → `npm run test:e2e`) and a **storybook-smoke** job
  (build-storybook → serve → `test:storybook`). Verified locally: the full **65-spec** e2e suite is
  green against the seeded stack (incl. `ai-query.spec.ts` UI sign-in + the new `landing.spec.ts`),
  and the storybook smoke passes **11 suites / 81 stories**. Both deviations moved to **Resolved**;
  every workflow action ref stays SHA-pinned (ADR 0044/0070). Marking the two jobs **required** is the
  remaining human branch-protection step (ADR 0046), after one observed-green cycle.
- **README case study:** the PR-0 stub is replaced by the behind-the-scenes write-up (domain model +
  identity split, in-DB SQL aggregation, RLS isolation, member-write path, AI NL→spec, token/FSD
  governance, the test pyramid, the decisions-first method) + a "Try the live demo" table with the
  seeded accounts.
- **Tests:** `LandingPage.test.tsx` renders the real composed page (coverage denominator) — h1, six
  surface cards, demo creds, the locale-prefixed CTA, the landmarks; `jsonld.test.ts` covers the
  builder; a CSF3 story (light + dark) carries the axe gate; `e2e/landing.spec.ts` is the public
  journey and `smoke.spec.ts` now guards the landing's zero-console-error contract.

## REL — first `dev → main` promotion (`v0.1.0` genesis)

The roadmap is complete (PR-0…PR-10 all merged). The next stage is the first `dev → main`
**production promotion** — the release ritual of ADR 0080. `main` sits at the PR-0 bootstrap
(`bc7b723`); `dev` is **89 commits ahead** carrying the whole CAPCOM platform, so this one
promotion is the genesis.

**Version decision (human-confirmed at the release PR, ADR 0080):** cut as **`v0.1.0`
genesis**, not `0.2.0`. The CHANGELOG was carrying the _template's_ `[0.1.0]` baseline entry
(verbatim from the fork, "no demonstration application", link refs → `claude-code-nextjs-starter`).
That entry was **rewritten** as CAPCOM's genesis baseline (the full platform), `[Unreleased]`
reset to empty subheads, link refs now pointing to `real-case/capcom`, dated `2026-06-29`. The
genesis CHANGELOG is **hand-authored**, not a machine draft, exactly as ADR 0080's genesis case
anticipates. `package.json` stays at `0.1.0` (no bump — genesis ships `0.1.0`).

**Prepared by the agent (this release PR):** the rewritten `CHANGELOG.md` genesis entry + this
handoff update, on branch `release/v0.1.0` → PR into `dev`.

**Remaining — human-only steps (ADR 0046), in order:**

1. Review + merge the `release/v0.1.0` PR into `dev` (lands the genesis CHANGELOG on `dev`).
2. Open + merge the `dev → main` promotion PR (the 89-commit genesis promotion).
3. On the resulting `main` HEAD, place the **annotated** tag `v0.1.0`
   (`git tag -a v0.1.0 -m "CAPCOM v0.1.0 — genesis"`), push it.
4. Publish the **GitHub Release** `v0.1.0` with the `[0.1.0]` CHANGELOG section as its body.
5. Branch-protection: mark the `e2e` + `storybook-smoke` CI jobs **required** after one
   observed-green cycle (the deferred DEV-001/DEV-002 closure, ADR 0046).

## Conventions (don't re-derive)

- Branch off `dev` → PR into `dev` → human merges (`dev`/`main` protected, ADR 0011/0046).
  **Never push directly to `dev`.**
- Commits: Conventional Commits (commitlint gate). **No AI attribution** (no
  `Co-Authored-By`, no footer).
- ADR-first for any decision no ADR covers; accepted ADRs change only by a superseding
  record. Migration = schema + RLS in one file (ADR 0014); types generated (ADR 0015).
- Run `supabase-rls-reviewer` over any new migration before the PR (ADR 0083 confirmation).

## Open housekeeping

- None outstanding. The PR-2 handoff (this file + the `tenancy-foundation.md` Delivery
  section) was committed at the head of the PR-3 branch.

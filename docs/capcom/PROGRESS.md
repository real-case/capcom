# CAPCOM — build progress & handoff

> Resume point for a fresh session. The PR-by-PR backlog lives in
> [`roadmap.md`](./roadmap.md); this file records **what is done, the live
> environment gotchas, and the next concrete step**. Update it at the end of each PR.

## Status

| PR    | Theme                                       | State                               |
| ----- | ------------------------------------------- | ----------------------------------- |
| PR-0  | Bootstrap                                   | ✅ merged                           |
| PR-DS | Design-system token foundation (0081–0082)  | ✅ merged                           |
| PR-1  | Foundational domain ADRs (0083–0086)        | ✅ merged                           |
| PR-2  | Tenancy: org/project/membership RLS + RBAC  | ✅ **merged (PR #6)**               |
| PR-3  | Events + profiles + ingest + seed generator | ✅ **merged (PR #7)**               |
| PR-4  | Trends (in-DB aggregation → visx charts)    | ✅ **merged (PR #8)**               |
| PR-5  | Funnels (ordered-step conversion, ADR 0087) | ✅ **merged (PR #9)**               |
| PR-6  | Retention cohort grid (ADR 0088)            | ✅ **merged (PR #10/#11)**          |
| PR-7  | Segmentation (ADR 0089)                     | 🔧 **ready on `feat/segmentation`** |
| PR-8+ | Dashboards → AI → Landing                   | ⏳                                  |

Accepted ADRs run 0001–**0087** and **0089**. PR-7 drafted **ADR 0089** (segment-definition
model) and it was **human-accepted** (CLAUDE.md synced). **ADR 0088** (retention cohort
semantics) remains **`proposed`** — its acceptance was deliberately deferred, so 0089 was
accepted ahead of it; 0088's `proposed → accepted` flip + its CLAUDE.md sync are still
outstanding human steps (the retention code merged in PR #10/#11 already depends on it). 0083
identity/event model, 0084 aggregation, 0085 ingestion contract, 0086 charting, and 0087 funnel
semantics remain the accepted foundation. **Note the numbering shift:** the roadmap pencilled
0088 for segmentation, but retention's semantics took 0088 first — so segmentation is **0089**,
and PR-9 AI will be the next free ID from `adr.py next`, not the roadmap's indicative mapping.

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

## Next: PR-8 — Dashboards & saved reports

Migration for `reports` / `dashboards` (saved chart configs + a simple layout) — **the home for
the deferred `segments` persistence (ADR 0089)**. **Server Actions** (ADR 0020) persist reports
and segments with the optimistic-mutation default (ADR 0025). Feature `dashboard` + a layout
widget; reports reopen straight from their nuqs URL state. 🎨 Design checkpoint (the dashboard
composition) — the latest point to provide a Figma source (read-only, token-conformant).

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

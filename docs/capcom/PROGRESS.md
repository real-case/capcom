# CAPCOM — build progress & handoff

> Resume point for a fresh session. The PR-by-PR backlog lives in
> [`roadmap.md`](./roadmap.md); this file records **what is done, the live
> environment gotchas, and the next concrete step**. Update it at the end of each PR.

## Status

| PR    | Theme                                       | State                          |
| ----- | ------------------------------------------- | ------------------------------ |
| PR-0  | Bootstrap                                   | ✅ merged                      |
| PR-DS | Design-system token foundation (0081–0082)  | ✅ merged                      |
| PR-1  | Foundational domain ADRs (0083–0086)        | ✅ merged                      |
| PR-2  | Tenancy: org/project/membership RLS + RBAC  | ✅ **merged (PR #6)**          |
| PR-3  | Events + profiles + ingest + seed generator | ✅ **merged (PR #7)**          |
| PR-4  | Trends (in-DB aggregation → visx charts)    | ✅ **merged (PR #8)**          |
| PR-5  | Funnels (ordered-step conversion, ADR 0087) | 🔧 **ready on `feat/funnels`** |
| PR-6  | Retention cohort grid                       | ⬅️ **next**                    |
| PR-7+ | Segmentation → Dashboards → AI → Landing    | ⏳                             |

Accepted ADRs run 0001–**0087**. PR-5 added **ADR 0087** (funnel conversion semantics,
accepted) — the residual decision 0084 left open. 0083 identity/event model, 0084
aggregation, 0085 ingestion contract, 0086 charting remain the accepted foundation.

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

## Next: PR-6 — Retention cohort grid

SQL function for cohort retention (cohort by first-seen period; retained in period _N_),
reusing the `SECURITY INVOKER` RPC + token-visx-widget pattern. `widgets/cohort-grid`
renders the **heatmap** — the densest infographic in the demo — with a token-driven
sequential color scale (`--color-viz-sequential-*`). Feature/widget `retention`. No new ADR
expected (0084/0086 cover it) unless the cohort/period semantics warrant one (then ADR 0088).

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

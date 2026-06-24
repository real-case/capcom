# CAPCOM — build progress & handoff

> Resume point for a fresh session. The PR-by-PR backlog lives in
> [`roadmap.md`](./roadmap.md); this file records **what is done, the live
> environment gotchas, and the next concrete step**. Update it at the end of each PR.

## Status

| PR    | Theme                                                                   | State                 |
| ----- | ----------------------------------------------------------------------- | --------------------- |
| PR-0  | Bootstrap                                                               | ✅ merged             |
| PR-DS | Design-system token foundation (0081–0082)                              | ✅ merged             |
| PR-1  | Foundational domain ADRs (0083–0086)                                    | ✅ merged             |
| PR-2  | Tenancy: org/project/membership RLS + RBAC                              | ✅ **merged (PR #6)** |
| PR-3  | Events + profiles + ingest + seed generator                             | ⬅️ **next**           |
| PR-4+ | Trends → Funnels → Retention → Segmentation → Dashboards → AI → Landing | ⏳                    |

Accepted ADRs run 0001–0086. PR-3 needs **no new ADR** (0083 identity/event model,
0084 aggregation, 0085 ingestion contract are all accepted).

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

## Next: PR-3 — events, profiles, ingest, seed generator

Decisions-first is satisfied (ADRs accepted). Work, following the per-PR rhythm:

1. **Migration `create_events_profiles`** (`create-migration` skill):
   - `profiles` — tracked end-user keyed by `distinct_id` **within a project**
     (`project_id`, `distinct_id`, attributes `jsonb`, timestamps); never a FK to
     `auth.users`. RLS via `is_member(project_id)`.
   - `events` — `project_id`, `event_name text`, `distinct_id text`,
     `properties jsonb`, `ts timestamptz`. Indexes `(project_id, ts)`, `event_name`,
     `distinct_id`. RLS via `is_member(project_id)` (read); inserts come through the
     ingest path, not client RLS (see step 2).
   - `gen:types`; extend `e2e/rls-tenancy.spec.ts` (or a new spec) with cross-tenant
     event/profile isolation.
2. **Ingest route `POST /api/ingest`** (ADR 0085, Node runtime route handler):
   - Zod `[ingest]` batch; authenticated by a **per-project ingest key hashed at rest**
     that resolves server-side to one `project_id`; structured `401/403/422` contract
     (ADR 0019). Server-only write path (service-role / confined trusted context),
     **never reaches client code**; the key is compared against a hash, never logged.
   - This is the **one** demonstration intake — no SDK/queue/pipeline (recorded scope
     boundary, ADR 0085).
3. **Seed generator `scripts/seed-events.mjs`** — realistic multi-project event volume so
   later visualizations (PR-4+) have dense data.
4. **Entities** `src/entities/event`, `src/entities/profile` (`new-slice`).
5. Gates green → PR into `dev` → **human review + merge** (ADR 0046).

## Conventions (don't re-derive)

- Branch off `dev` → PR into `dev` → human merges (`dev`/`main` protected, ADR 0011/0046).
  **Never push directly to `dev`.**
- Commits: Conventional Commits (commitlint gate). **No AI attribution** (no
  `Co-Authored-By`, no footer).
- ADR-first for any decision no ADR covers; accepted ADRs change only by a superseding
  record. Migration = schema + RLS in one file (ADR 0014); types generated (ADR 0015).
- Run `supabase-rls-reviewer` over any new migration before the PR (ADR 0083 confirmation).

## Open housekeeping (fold into PR-3)

- This file + the finalized `.marvin/task/tenancy-foundation.md` Delivery section are
  **written but not yet committed** (can't push to protected `dev`). Stage them on the
  PR-3 branch.

# CLAUDE.md

> **Stage.** The template's infrastructure and scaffolding are in place under `src/`
> (the env / Supabase / i18n / logging / state / SEO layers); feature code is built on
> top. The **Stack / Commands / Conventions / Restrictions** sections below are synced
> from the **accepted** ADRs via the `adr-sync-claude-md` skill and describe the shipped
> code. Architectural decisions are still recorded as ADRs under `docs/decisions/`
> **before** any code depends on them; the **ADR Process** section is authoritative.
> These sections track the **accepted** ADRs; the full Phase-3 baseline is now accepted, so
> nothing below is flagged as still-proposed pending the acceptance gate.

## ADR Process

All architectural decisions are recorded as ADRs before any code depends on them.

- **Location:** `docs/decisions/`.
- **File naming:** `NNNN-kebab-case-title.md`, zero-padded sequential number; numbers
  are permanent IDs and never change, even under supersession.
- **Template (pinned):** **MADR full template** — `Context and Problem Statement`,
  `Decision Drivers`, `Considered Options` (≥2), `Decision Outcome` (`Chosen option …
  because …`), `Consequences` (Good/Bad), `Confirmation`, `Pros and Cons of the
  Options` (per option), `More Information`. The canonical source is
  `.claude/skills/adr/assets/adr-template.md`.
- **Lifecycle:** `proposed → accepted`. A record is edited freely while `proposed`;
  once `accepted`, changes are made only by a **new superseding record**, never by
  editing in place. The `proposed → accepted` transition is **human-confirmed** — an
  agent never sets `accepted`.
- **Status values:** `proposed | accepted | rejected | deprecated | superseded`.
- **Superseding:** set paired links `supersedes NNNN` / `superseded by NNNN` and move
  the replaced record to `superseded` — done via `adr-supersede`, not by hand.
- **Constraints:** externally fixed, client-mandated stack choices (no alternatives)
  live as `CON-00x` rows in `docs/decisions/constraints.md`, not as ADRs. ADRs cite
  them by ID; the registry back-links to the ADR that resolves any residual choice.
- **Tooling** (`.claude/skills/adr/scripts/adr.py`):
  - `adr.py next` — next zero-padded number.
  - `adr.py index` — regenerate `docs/decisions/README.md` (run after every create or
    status change).
  - `adr.py lint` — corpus integrity (numbering, references, required sections, index
    freshness). Also exposed as the `adr-audit` skill.
  - `adr.py accept NNNN` — the human acceptance gate (`adr-accept` skill).
  - `adr.py supersede --old --new` — paired link-flip (`adr-supersede` skill).
- **Skills:** `adr` (create), `adr-accept`, `adr-audit`, `adr-coverage` (gap
  analysis), `adr-supersede`, `adr-sync-claude-md`. Guided creation/review via the
  `app.adr-create` / `app.adr-review` commands.

When a change needs a decision no ADR covers, record the ADR first (or, for an
externally fixed client mandate, a `CON-00x` row in `constraints.md`), then implement.

## Stack

_Derived from the accepted ADRs via `adr-sync-claude-md`. The full Phase-3 baseline is now
accepted — design tokens (0033), Feature-Sliced Design (0065/0066), the security & integrity
gates (0067–0074), the advisory-AI client (0075), and the guardrail meta-layer (0076–0078),
plus the CAPCOM analytics-domain foundation (0083–0086) — so nothing below is flagged as
still-proposed._

- **Next.js (App Router)** on **React 19** (`^19` pinned) — Server Components by
  default (0002; CON-001/CON-002).
- **TypeScript** — `strict: true` + `noUncheckedIndexedAccess` + `noImplicitOverride`
  (0003).
- **Node.js 24 LTS** (`engines.node >=24 <25`, `.nvmrc` `24`); Node-first route
  runtime (0004).
- **npm** — package manager of record, `package-lock.json` (0005).
- **ESLint (flat config) + Prettier** via `eslint-config-prettier`; composes
  `eslint-config-next` + typescript-eslint (0006).
- **Vitest + React Testing Library** (unit/component), **Playwright** (e2e) (0007).
- **Supabase**, scoped to Postgres + RLS + Auth (0012): `@supabase/ssr` data access
  (0013), Supabase CLI migrations (0014), generated DB types (0015), Supabase Auth
  with email/password baseline (0016).
- **Vercel** hosting — Git-integrated per-PR preview + production deploys (0009); CI
  on **GitHub Actions** (0010). Local dev builds on the official platform CLIs
  (0021): `next dev` + `vercel env pull` (0023), local Supabase via CLI (0022).
- **Zod** as the single validation authority (0017); **React Hook Form** +
  `zodResolver` (0020); Zod-validated env modules with a `server-only` secret fence
  (0018).
- **TanStack Query** — server state (0025); **Zustand** — ephemeral client state
  (0026); **nuqs** + Next.js typed routes — URL state (0027).
- **Tailwind CSS, CSS-first** (0032); design tokens as CSS custom properties in
  `@theme` — this template ships a **neutral shadcn baseline**: a value layer (`:root` +
  `.dark`) bridged to the shadcn names via `@theme inline`. The layered design-export
  architecture (primitive + semantic + component `--color-c-*` layers) is documented in
  ADR 0033 for when a real design export is wired; **shadcn/ui** is
  copied into the repo (0034).
- **Mission-control design tokens** (0081): a dark-first vocabulary on a re-introduced
  `--c-*` **primitive layer** under `:root` — surface hierarchy, `status-{nominal|caution|`
  `warning|critical}-{fg|bg|border}`, an 8–12-hue colorblind-safe data-viz palette
  (categorical + sequential + diverging), hairline/divider, elevation, motion, and the
  `metric-hero|metric|label|body|caption|mono-data` type-scale roles; semantic vars reference
  primitives via `var()`, bridged to utilities through `@theme inline`, with geist-mono as the
  technical/numeric face (extends 0033). **Multi-tenant + density runtime theming** (0082):
  `[data-tenant]` re-composes the palette and `[data-density="comfortable"|"dense"]` swaps the
  dimension tokens by overriding the `--c-*` primitive layer **only** — pure CSS, no theme
  provider. **Runtime light/dark theming** (0092) adds theme as a **third such primitive-swap
  axis** on the same mechanism: a cookie-persisted choice applied by a pre-paint resolver over a
  static SSR default (no hydration flash, no client theme-provider dependency, public routes stay
  statically generated), with the mission-control `--c-*` layer gaining a light composition so chrome
  and charts flip as one unit.
- **next-intl** for i18n (0030); App Router Metadata API for SEO (0031).
- **React Compiler** — automatic memoization (0029).
- **Storybook 10** on `@storybook/nextjs-vite`, stories double as tests via
  `@storybook/addon-vitest` (0035): CSF 3 (0036), Vitest addon +
  test-runner smoke engines (0037), `storybook/test` play functions (0038),
  `addon-a11y`/axe gate at WCAG 2.2 AA (0039), scoped DOM-snapshot policy (0040),
  **Chromatic** visual regression with TurboSnap (0043).
- App Router error boundaries + structured stdout JSON logger `src/lib/logger.ts`
  (0019).
- **MCP toolchain** (CON-003): committed `.mcp.json` with env-reference secrets —
  context7, vercel, supabase, chromatic, github (0044). Design tooling is **Claude Design**
  (claude.ai/design) as the design source + living catalog (0094) — login-based via the
  `DesignSync` MCP + `/design-sync` skill, **not** a `.mcp.json` server.
- **Design-system AI-tooling governance** (decided 0058–0062, 0064, 0095; enforcement lands
  with Phase 12 / Stages 0–6): single-source token codegen + a stylelint/ESLint token-usage gate
  (0058); a top-down composition graph (0059) reconciled against a **dependency-cruiser**
  import graph (0060); human-authored controlled vocabularies/state registries under
  `src/design-system/` (0061); per-component typed `design-intent.ts` specs (0062);
  anti-hallucination **Claude Design** approval with a drift seal (0095); a Defect Log driving
  reactive fitness-function growth (0064).
- **Feature-Sliced Design** application architecture (0065): layers `src/shared`,
  `src/entities`, `src/features`, `src/widgets` under canonical FSD names, added
  **additively** beside `src/app` (App Router, the app/pages role), the `src/components/ui`
  shadcn kit, and `src/design-system`. Boundaries are a gate, not a convention — **Steiger**
  (`check:fsd`, 0066).
- **Security & supply-chain gates**: `gitleaks` secret scan (0056) and **CodeQL** SAST
  (`security-extended`; analysis inert until a 👤 enables code scanning, 0068); `npm audit`
  (0069), GitHub Actions SHA-pinning (0070), an SPDX license allowlist (0071), Conventional
  Commits via **commitlint** (0072), offline `lychee` docs link-integrity (0073), and `cspell`
  spell-check (0074).
- **Reference-integrity gates** (0067): every `ADR NNNN` / `CON-00x` citation on operative
  surfaces resolves (`check:citations`), alongside the Claude-infra gates (`check:claude` /
  `check:claude-md`).
- **Provider-agnostic advisory-AI client** (0075): OpenAI-compatible Chat Completions over
  `fetch` (zero-dep), reaching any compatible key (Gemini, OpenAI, OpenRouter, …); inert until
  `AI_API_KEY` is provisioned.
- **AI natural-language query** (0091): a runtime sibling of the 0075 client under `src/lib/ai`
  (provider-neutral, OpenAI-compatible `fetch`, server-only, inert without `AI_API_KEY`) translates a
  free-text prompt **server-side** into a **closed, Zod-validated `{ kind, config }` query-spec** —
  a discriminated union over the four analysis kinds reusing the report shape (0090) — which is
  **interpreted by deep-linking** through 0090's `reportConfigToSearchParams` to the existing
  `SECURITY INVOKER` surface (no new SQL / aggregation / chart renderer), with a **deterministic
  offline interpreter** as the no-key fallback so the demo never crashes.
- **Guardrail layers** (the three-layer control model): edit-time **Claude Code hooks**
  (`PreToolUse` guard + `PostToolUse` checks, 0076); **skills + review-subagents** as the
  structural/recall layer (advisory, never a gate's source of truth, 0077); **self-testing
  gates** (`check:gates`) + the **technical-debt escape-hatch** gate (`check:debt`) as the
  meta-integrity layer (0078).
- **CAPCOM analytics domain** (0083–0086): a multi-tenant `organization → project` model with
  RBAC roles `owner | admin | analyst | viewer`, the deliberate auth-user ≠ profile split, and
  the event shape `event_name | distinct_id | properties jsonb | ts`, isolated by **RLS scoped
  through a membership join** (0083); **in-database aggregation** — trends / funnels / retention /
  segments as Postgres views + `SECURITY INVOKER` set-returning functions run under the caller's
  RLS and refreshed by poll (0084); a single `POST /api/ingest` route — a Zod-validated batch
  behind a per-project ingest key — as the **seeded-data** intake contract (0085); and **visx**
  unstyled charting primitives so every chart value comes from the generated token allowlist
  (0086).
- **Chart interaction layer** (0093): a shared, visx-based interaction sub-primitive layer over
  0086 — tooltip, crosshair/focus line, series hover-highlight, gradient/area fill, a
  reduced-motion-guarded `MotionIn` wrapper, an interactive legend, and a time brush — fed only
  token values (`@visx/tooltip`/`@visx/gradient`/`@visx/brush`/`@visx/event`, no baked palette),
  theme-aware (0092), deterministic under Chromatic, and keyboard/AT-accessible; interaction is
  local view-state and a window-changing brush round-trips through nuqs, so widgets stay
  presentational (extends 0086).

## Commands

- `npm run dev` — orchestrated startup: Supabase up → `gen:types` → env sync
  (`vercel env pull` when linked) → `next dev` (0023, 0024).
- `npx supabase start` / `npx supabase stop` — local Supabase stack, requires Docker
  (0022).
- `npm run db:reset` — rebuild the local database from `supabase/` migrations
  (0014, 0022).
- `npm run gen:types` — regenerate `src/lib/supabase/database.types.ts`; run after
  every migration; CI fails on drift (0015).
- `npm run lint` — ESLint; `npm run format:check` — Prettier check mode (0006).
- `npm run test` — Vitest, both projects (unit jsdom + Storybook browser-mode);
  `npm run test:unit` — fast jsdom-only loop; `npm run test:coverage` —
  merged-workspace coverage run, fails below 80% (0010, 0008, 0041).
- `npm run storybook` — component workbench dev server; `npm run build-storybook` —
  static build (0035). `npm run test:storybook` — test-runner build-integrity smoke
  over the built Storybook (0037); `npm run check:stories` — every `src/components/**`
  module has colocated stories (0042).
- `tsc --noEmit` — typecheck, part of the CI gate (0003, 0010).
- CI (`.github/workflows/ci.yml`, Node 24, `npm ci`) runs parallel required jobs. The
  **quality gate** (ordered): typecheck → lint → format:check → check:audit → check:licenses
  → check:spelling → check:stories → check:boundaries → check:fsd → check:graph →
  check:design-intent → check:seals → check:i18n → check:gates → token-drift → build →
  test:coverage (≥80%). Alongside it: a **secret scan** (gitleaks, 0056), a **Claude-infra
  integrity** job (check:claude / check:claude-md / check:citations / check:action-pins /
  check:debt — each custom gate self-tests via `-- --self-test`, P6/0078), and a PR-only
  **commitlint** job (check:commits, 0072). **CodeQL** (0068), **Chromatic** (0043), and the
  **docs link check** (0073) run as separate workflows. The Playwright e2e + migration-replay
  job and the Storybook test-runner smoke are **deferred during bootstrap** — they run locally
  (`npm run test:e2e`, `npm run test:storybook`) and return before the first production
  promotion; tracked in `docs/deviations.md` (0010, 0024, 0041, 0042).
- Design-system gates (Stages 0–3, wired in CI): `npm run gen:tokens` — regenerate the
  semantic-token union + lint allowlist + agent-rules reference from the `@theme`/`:root`
  layer, CI drift-checked like `gen:types` (0058); it splits the `--c-*` primitive layer into
  `PRIMITIVE_VARIABLES` and enforces the tenant/density/theme **swap-only invariant** — throws on
  a non-primitive override, proven by `--self-test` (0081/0082/0092); `npm run check:contrast` —
  computed WCAG 2.2 AA contrast over the mission-control status fg/bg + text/surface pairs in both
  the light and dark compositions (oklch→sRGB→luminance), in `check:design-system` and the CI gate
  (0081/0092); `npm run
  check:boundaries`
  (`depcruise`) — module-boundary gate (0060); `npm run check:graph` —
  composition↔import reconciliation (0059/0060); `npm run check:design-intent` —
  `design-intent.ts` fitness functions (api↔props, state coverage by subtraction,
  states↔stories contract-expansion, meta↔graph) (0062); `npm run check:seals` — Claude Design
  drift-seal shape/presence gate, inert until a Claude Design project exists (0095); `npm run
  check:tokens` — token-usage lint over `src/components/**` (0058); `npm run check:i18n` —
  key-parity + ICU (0055); `npm run check:gates` — gate self-test (every custom rule
  rejects its violator, P6); `npm run check:design-system` runs the bundle.
- Security & integrity gates: `npm run check:audit` (`npm audit --audit-level=high
  --omit=dev`, 0069); `npm run check:action-pins` — every workflow `uses:` pinned to a commit
  SHA (0044/0070); `npm run check:licenses` — production deps against an SPDX allowlist (0071);
  `npm run check:spelling` — `cspell` over `**/*.md` (0074); `npm run check:commits` —
  commitlint over the PR range (0072); `npm run check:citations` — ADR/CON citations resolve on
  operative surfaces (0067); `npm run check:fsd` — Feature-Sliced Design boundaries via Steiger
  (0066).
- Design-system agent-loop helpers (advisory — run before/while building a component):
  `npm run ds:signature` — composition-signature duplicate check before creating a
  component (0059, P2); `npm run ds:states` — the mandatory state set for an archetype,
  coverage by subtraction (0061/0062, P8); `npm run ds:escalations` — the Stage-4
  escalation surfacer (usageRole collisions + state-set deviations + the rubber-stamp
  metric, 0061/0062, P3/P8); `npm run ds:tokens-table` — the end-of-wave token-consistency
  table (0058, Stage 6, P1). Surfaced as the `component-signature`, `state-coverage`, and
  `check-tokens` skills. The allowed-token list is the **generated**
  `src/design-system/tokens.agent-rules.md` — never re-list tokens in prose (0058, P6).
- Phase-12 advisory AI jobs (`scripts/ai/*`, ADRs 0048–0057, 0075) — provider-agnostic via the
  OpenAI-compatible client (0075), inert until a 👤 provisions `AI_API_KEY`: AI PR review (0048),
  CI-failure triage (0049), changelog draft
  (0050), security Layer 2 (0056), via `.github/workflows/ai-advisory.yml` /
  `ai-ci-triage.yml`, plus the Renovate config `renovate.json` (0057). Each is advisory
  (never a required check) and self-activates when the key lands.

## Conventions

- Server Components by default; `"use client"` only at interactive leaves; mutations
  via Server Actions (route handlers for webhook-style endpoints); app code in
  `src/app/` (0002).
- Application code is placed by Feature-Sliced Design (0065): the `new-slice` skill's decision
  tree picks the layer (`shared`/`entities`/`features`/`widgets`); imports go downward only,
  same-layer slices are isolated, and each slice is reached through its public `index.ts`. A
  reusable shadcn primitive goes in `src/components/ui` via `new-component` (a kit outside FSD);
  `src/design-system`, `src/lib`, and `src/i18n` also stay outside the FSD area (0065/0066).
- Types are inferred from Zod schemas (`z.infer`), never written separately; boundary
  schemas carry origin markers (`[env]`, `[form:signup]`, …) (0017); the same schema
  validates on the client and re-validates on the server (0020).
- Data access through request-scoped `@supabase/ssr` clients under
  `src/lib/supabase/`; all user-facing access runs as the user under RLS
  (`auth.uid()`); session refresh in middleware (0013, 0016).
- Migrations are plain SQL (including RLS policies) under `supabase/` (0014).
- Env: `NEXT_PUBLIC_*` in `src/lib/env.ts`; secrets in `src/lib/env.server.ts`
  importing `server-only`; values stored per environment in Vercel (0018).
- Errors: `error.tsx` / `global-error.tsx` / `not-found.tsx` boundaries; structured
  JSON logs to stdout; client-facing messages stay generic (0019).
- State buckets: server-derived → TanStack Query; ephemeral UI → Zustand;
  shareable/bookmarkable (search, filters, sort, pagination, tab) → URL via nuqs
  (0025, 0026, 0027).
- Optimistic UI is the default mutation pattern (`onMutate` → rollback on error →
  invalidate); a non-optimistic mutation needs an objective reason, justified in
  review (0025).
- For render-bound jank reach for `useTransition` / `useDeferredValue` first;
  debounce/throttle for network costs, virtualization for huge DOM (0028).
- Styling: Tailwind utilities against the semantic tokens — the neutral shadcn names
  (`--color-primary`, `--color-muted-foreground`, …) exposed via the `@theme inline`
  bridge; light/dark = `.dark` value-layer overrides; shadcn components live in
  `src/components/ui` (0032, 0033, 0034).
- i18n: routes under `src/app/[locale]/`; catalogs in `messages/<locale>.json`;
  middleware composes next-intl with the Supabase session refresh (0030). Metadata
  via `metadata` / `generateMetadata`, `app/sitemap.ts`, `app/robots.ts` (0031).
- Git: feature branches → PR into `dev` (integration); `dev` is promoted to `main`
  (production, always deployable); both protected, CI check required (0011);
  production deploys from `main`, every PR gets a preview URL (0009).
- Commits follow Conventional Commits (commitlint); the machine-readable history feeds the
  AI changelog draft at the `dev`→`main` release (0072, 0050).
- Versioning is template-adapted SemVer (0080): the number signals migration cost for an
  upstream-tracking adopter, not an npm contract — a superseding ADR / structural change /
  removed-or-renamed gate · script · skill / dropped Node · Next major is MAJOR; an additive
  accepted ADR is MINOR; in-range dependency bumps and doc fixes are PATCH; stay on `0.x`
  until the governance surface is stable enough for `1.0.0`. A release promotes `dev`→`main`,
  bumps `package.json`, carries the human-edited `CHANGELOG.md` entry (0050), and is marked
  by an annotated `vX.Y.Z` tag + GitHub Release.
- Tests are colocated (`src/**/*.test.tsx`), e2e lives in `e2e/`; coverage is
  risk-weighted — auth/RLS/critical flows get e2e first (0007).
- Every exported component in `src/components/**` ships colocated CSF 3 stories
  covering its meaningful states (variants, interactive, data-edge, theme/locale);
  interactive components require `play` functions with `@storybook/test`; purely
  presentational ones are exempt (0036, 0038, 0042).
- The AI agent is the primary implementer (0046); commit/PR attribution convention is
  left to the consuming project, not mandated by the template. AI assistance is advisory
  and ADR-grounded: PR
  review citing record numbers (0048), CI-failure triage (0049), changelog drafting
  at `dev`→`main` release (0050), story matrices/play drafts under the 0042 human
  judgment (0051), semantic a11y pass (0052), diff-scoped security review atop a
  blocking secret scan (0056), dependency-update triage on bot PRs (0057),
  translations drafted from the canonical source locale with key parity enforced in
  CI (0055). A scheduled drift audit checks code against accepted ADR Confirmations
  (0054).
- Design tokens: in tokenizable CSS properties only `var(--token)` is allowed and the token
  must exist in the generated registry; components never use raw color/size literals,
  inline-`style` raw values, raw SVG `fill`/`stroke`, or Tailwind's numbered palette; a
  primitive owns no external margin; the token union, lint allowlist, and agent rules are all
  generated from the `@theme` layer, never hand-maintained (0058).
- Mission-control tokens sit on a two-layer split (0081): the `--c-*` **primitive layer** holds
  raw `oklch` values; role-named semantic vars (`--surface-*`, `--status-*`, `--viz-*`, the
  type-scale roles) reference primitives via `var()` and are bridged to Tailwind utilities by
  `@theme inline`. A tenant (`[data-tenant]`) and a density mode (`[data-density]`) re-compose by
  overriding the **primitive layer only** — the semantic layer and components never change per
  tenant or density (0082).
- Components are governed top-down by a composition graph (`composedOf`/`usedIn`, exact-set
  `compositionSignature` v1), checked before a new component is created (0059); imports obey
  primitive↛composite + public-API-only (`index.ts`) + no-circular/no-orphans, reconciled
  against the dependency-cruiser import graph (0060). Roles/classes come from human-authored
  controlled vocabularies under `src/design-system/` — `usage-roles.ts`, `archetypes.ts`, the
  archetype→states registry, the state-precedence matrix (0061).
- Each component ships a typed `design-intent.ts` at Definition-of-Ready: API derived from the
  `usedIn` union (not guessed), slot-vs-variant boundary recorded with rationale, state
  coverage by subtraction from the 0061 archetype set (`applicable:false` requires a rationale)
  (0062). API approval uses an ephemeral reconciliation artifact against a **render of the
  human-authored Claude Design preview** (render the pixels, never read the preview's source HTML,
  never the agent's own render) sealed by `renderHash` + a Claude Design version identifier as a
  drift detector (0095); a Defect Log of missing/ambiguous rules is
  filled in review, and invariants graduate into Stage-1 checks on first violation (0064).
- Multitenancy & identity (0083): every domain row carries `project_id` under
  `organization → project`; isolation is **RLS scoped by a membership join** via
  `search_path`-pinned `is_member(project)` / `has_role(project, role)` helpers, with RBAC roles
  `owner | admin | analyst | viewer` composing **over** isolation. The authenticated member
  (`auth.users`) and the tracked end-user (`profiles`, keyed by `distinct_id`) are distinct
  entities and never collapse into one table; the client never asserts tenancy.
- Aggregations live in the database (0084): trends, funnels, retention, and segment
  distributions are Postgres views / `SECURITY INVOKER` set-returning functions invoked as RPC
  under the caller's RLS — never reduced in application code; results are typed via `gen:types`
  and refreshed by poll (no realtime). Features and widgets consume already-reduced rows.
- Funnel conversion semantics are fixed (0087, refining 0084): a funnel is an ordered list of
  `event_name` steps counted over **distinct users** (`distinct_id`), entered at each user's
  **first-touch** step-1 occurrence in `[from, to)`, each later step the **earliest at-or-after**
  occurrence (ordered, non-strict), with the whole path inside a **single total conversion window**
  measured from step 1. Step counts are non-increasing by construction; conversion **rates** are
  presentation (a ratio of two already-reduced counts), not SQL reduction. Per-step property
  filters, breakdowns, and multi-attempt counting are stated scope boundaries.
- Retention cohort semantics are fixed (0088, refining 0084): **acquisition cohorts** (the calendar
  period of a user's **global first-touch**, counted only if that first-touch falls in `[from, to)`;
  pre-existing users are not re-counted), **calendar-aligned** week/month periods, **classic
  active-in-period** retention (active in that exact period; reappearance allowed, so the curve is
  not necessarily monotonic), counting **distinct users**, any event a return. Cells are zero-filled
  over a triangular offset spine; the **percentage** (`retained/cohort_size`) is presentation, not
  SQL reduction. Rolling through-N, per-user rolling windows, a specific return event, and daily
  granularity are stated scope boundaries.
- The segment-definition model is fixed (0089, refining 0084): a segment is a closed `jsonb` rule
  of **attribute** predicates over `profiles.traits` (`key` with `eq | neq | in`) and
  **behavioural** predicates over `events` (`event` with `at_least | at_most` a count in the
  analysis window — `at_most 0` expresses "never"), combined by **AND only** (`match: "all"`).
  It is evaluated in-database by `SECURITY INVOKER` `fn_segment_size` / `fn_segment_distribution`
  functions with **no dynamic SQL** — the closed grammar is the injection boundary; rule values are
  compared as `jsonb`/parameters, never concatenated. Output is a distinct-user **size** + a
  **distribution** by one trait dimension (absent traits folded into `(unknown)`); percentages are
  presentation, not SQL reduction. The rule is one nuqs-encodable value (a shareable segment link,
  0027). OR/nested logic, per-predicate windows, and numeric `properties` predicates are stated
  scope boundaries; **saved/named segment persistence**, deferred here, is realized in PR-8 as a
  `kind='segment'` report (0090).
- Event ingestion is a single `POST /api/ingest` route handler on the Node runtime (0085): a Zod
  `[ingest]` batch authenticated by a per-project ingest key (hashed at rest) that resolves
  server-side to one `project_id`; the write runs in a confined trusted server-only context
  stamped with the resolved project, with a structured `401/403/422` error contract. It is the
  one demonstration intake — data is otherwise seeded.
- Charts are built from **visx** unstyled primitives (0086): scale ranges and sizes come only
  from the generated token allowlist (0058) and the mission-control data-viz palette (0081);
  chart widgets are presentational — they receive reduced rows as props (TanStack Query over the
  0084 RPCs) and own no fetching or aggregation; SVG carries explicit a11y roles and renders
  deterministically for Chromatic.
- Saved analyses are persisted data (0090): a **report** is one `reports(kind, config jsonb)` row
  storing the originating widget's **URL-state** (0027) validated by that widget's Zod schema (0017)
  — `kind ∈ trends | funnel | retention | segment`, opened by hydrating nuqs state; a **dashboard**
  composes reports through an ordered `dashboard_reports` join (a **simple layout** — ordering only,
  no grid geometry); a **saved segment** persists as a `kind='segment'` report, realizing 0089's
  deferred persistence with no extra table. Persistence is written through **Server Actions under
  the caller's RLS** (0013/0020) returning a discriminated result, with the **optimistic-mutation
  default** (0025) — the first member write path. Owner-scoped editing, rich grid layout, and a
  reusable cross-analysis segment table are stated scope boundaries.
- The AI natural-language query is an NL→spec translation, not a new query surface (0091): a
  **server-only Server Action** over the `src/lib/ai` client (0075/0018) returns a **closed,
  Zod-validated `[ai-query]` `{ kind, config }` spec** (a report minus its name, 0090) — a
  discriminated union over `trends | funnel | retention | segment` reusing each surface's URL-state
  grammar (0017/0027). Model output is **rejected, never coerced** on any mismatch — the closed spec
  is the injection boundary (0089 extended to model output) — and a valid spec **deep-links** to the
  existing surface via `reportKindRoute` + `reportConfigToSearchParams` (0090), so the slice never
  calls an RPC, builds a query, or renders a chart (no aggregation in app code, 0084; FSD
  downward-only, no `widgets` import, 0065/0066). Without `AI_API_KEY` (or on an AI error) a
  **deterministic offline interpreter** produces the same spec for curated demo intents (labeled
  offline-demo mode) so the surface never crashes (0075). Conversational refinement, multi-analysis
  output, streaming, and model-driven save-as-report are stated scope boundaries.

## Restrictions

- `any` is disallowed (`@typescript-eslint/no-explicit-any`) — use `unknown` +
  narrowing (0003).
- The Edge runtime is per-route opt-in, never the default (0004). pnpm / yarn / bun
  are not used (0024).
- The service-role key never reaches the client and is confined to trusted
  server-only contexts (0013). Secrets are never importable into client code
  (`server-only` fence, 0018). Credentials in `.mcp.json` are env-references, never
  literals; servers pinned, official/first-party, least-privilege tokens (0044).
- Server data is never mirrored into Zustand; optimistic state lives in the Query
  cache, not Zustand; Server Components never import stores (0026).
- No manual `useMemo` / `useCallback` / `React.memo` — the React Compiler owns
  memoization; exceptions are rare and documented (`"use no memo"`) (0029).
- No `tailwind.config.js` — CSS-first configuration only (0032). Token values are
  code-canonical (0033): **Claude Design** conforms to the token scale and never forks a value —
  a design-originated change is a reviewed round-trip into `globals.css`, never a silent fork; the
  implementing agent consumes Claude Design read-only in the approval loop (0094).
- CSF 2 (`Template.bind({})`) and `storiesOf` fail lint; MDX never defines stories
  (0036). Snapshot baselines update only as a reviewed action (0040). The
  test-runner contributes no coverage and duplicates no assertion suite
  (0037, 0041). a11y opt-outs only as explicit, reviewed per-story `a11y` parameters
  with a stated reason (0039).
- Coverage below 80% blocks merge; only `hotfix/*` / `hotfix`-labeled PRs bypass the
  threshold — and nothing else of the gate (0008).
- No global CI retry policy; flaky tests are quarantined explicitly (annotated skip
  + tracked issue, time-boxed), never papered over with retries (0049).
- Human-only actions: accepting ADRs, repo/branch-protection settings, production
  promotion/rollback, provisioning/rotating/revealing secrets, editing
  `constraints.md`, merging into `dev`/`main` (0046). Every PR requires human
  approval — AI review never substitutes (0047, 0048).
- Accepted ADRs are never edited in place — changes go through a superseding record
  (0001).
- Supabase usage stays within the Postgres + RLS + Auth baseline; Storage / Edge
  Functions / Realtime each need their own ADR first (0012). External error tracking
  (e.g. Sentry) is deferred to its own ADR (0019).
- In `src/components/**`: no raw color/size literals, inline-`style` raw values, raw SVG
  `fill`/`stroke`, or Tailwind numbered-palette classes; the token allowlist + agent rules are
  generated, never hand-written (0058). Primitives never import composites; cross-component
  imports go through `index.ts`; no import cycles or orphan modules (0060).
- Application code obeys FSD direction: no upward imports, no imports between same-layer slices,
  no sidestep of a slice's public `index.ts` — enforced by Steiger (`check:fsd`, 0066).
- GitHub Actions `uses:` are pinned to a full commit SHA (0044/0070); production dependencies
  stay within the SPDX license allowlist (0071); commits violating Conventional Commits fail CI
  (0072).
- Runtime light/dark theme switching ships via a **cookie-persisted theme class applied by a
  pre-paint resolver over a static SSR default** (0092) — no client theme-provider dependency, no
  hydration flash, and the public routes stay statically generated; a `ThemeToggle` (a client leaf)
  writes the cookie and the pre-paint script applies the class. Theme is a **third governed swap
  selector** on the same primitive-layer mechanism as tenant and density (0082): `[data-tenant]` /
  `[data-density]` / the theme selector may redefine **only** existing `--c-*` primitives — never
  introduce a token or touch a semantic `--color-*` name; `gen:tokens` throws on violation
  (swap-only invariant, self-tested across all three selectors). Mission-control status fg/bg and
  text/surface token pairs must clear WCAG 2.2 AA in **both** the light and dark compositions —
  enforced by `check:contrast` (0081/0092). A theming mechanism beyond this cookie-SSR toggle (e.g.
  adopting a client theme provider) still needs its own ADR.
- The template is never published to npm — `private: true` is retained permanently; the
  release artifacts are the git tag + GitHub Release + `CHANGELOG.md`, not an npm package
  (0080).
- The agent never approves its own visual baseline (Chromatic UI, human-only) and is never
  shown its own implementation during API approval — the proof is **human-authored Claude Design**
  pixels it does not control (0095, 0047). Because `DesignSync` is bidirectional, the implementing
  agent uses its **read** methods only in the approval loop and never approves against a design it
  authored or synced up (the code→design catalog publish is a separate, human-initiated act, 0094).
  Controlled-vocabulary entries are human-authored; a rename/merge/split
  is a governed migration with an owner, and a component fitting no archetype escalates to a
  human (0061, 0064).
- Tenant isolation is a database invariant: every domain table has RLS enabled and
  deny-by-default, scoped by the membership join; the client never supplies its own tenant id,
  and `auth.users` (member) is never conflated with `profiles` (tracked end-user) (0083).
  Aggregation/reduction logic never lives in application code, and no second datastore / external
  OLAP is introduced — aggregations stay in Postgres (0084).
- Segment rules are user-authored data evaluated by a closed in-database interpreter — **never**
  built into SQL with dynamic-SQL/`EXECUTE`; the bounded predicate grammar is the injection
  boundary, evaluation stays `SECURITY INVOKER` under the caller's RLS, and segment composition is
  AND-only (genuine OR/nesting is a deferred boundary). No `segments` table or write path in PR-7 —
  persistence is deferred to PR-8, where it lands as a `kind='segment'` report (0089, 0090).
- The `reports` / `dashboards` / `dashboard_reports` tables are the first member-writable domain
  tables (0090): RLS deny-by-default, `SELECT` scoped by `is_member(project_id)`, and
  `INSERT/UPDATE/DELETE` gated at `has_role(project_id, 'analyst')` so **viewer is read-only**;
  `owner_id` is stamped from `auth.uid()` and never asserted by the client, `project_id` is checked
  through the membership join, and there is **no service-role write path** — writes are Server
  Actions under the caller's RLS (0013/0020/0025). Edit is role-based (not owner-scoped), the layout
  is ordering-only, and a reusable cross-analysis segment table are stated scope boundaries.
- The ingest-key write path is server-only and never reaches client code; it is confined to the
  resolved `project_id`, the key is compared against a hash (never logged), and its rotation is a
  human-only action (0085, 0013/0046). No ingestion SDK, queue, or high-volume pipeline — the
  seeded-data posture is a recorded scope boundary (0085).
- Chart widgets carry no baked palette and no raw SVG `fill`/`stroke` — visx primitives are fed
  token values only and stay presentational (no data fetching or aggregation) (0086, 0058).
- The AI model never emits SQL, an RPC name, a table/column, or a raw URL — only values inside the
  closed `[ai-query]` spec grammar, which is the injection boundary (0091, extending 0089); output
  outside it is rejected (`safeParse`), never coerced into a query. The AI call and `AI_API_KEY` are
  **server-only** and never reach client code (0018/0075); the translation adds no SQL, no aggregation
  in application code, and no chart renderer — it **deep-links** to the existing surfaces (0084/0090).
  The deployed demo stays inert-but-alive without a key via the bounded deterministic interpreter;
  provisioning a key upgrades to live translation with no code change (0075).

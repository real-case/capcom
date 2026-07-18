# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and
this project uses a **template-adapted** form of [Semantic Versioning](https://semver.org/spec/v2.0.0.html)
defined in [ADR 0080](docs/decisions/0080-versioning-and-release-policy.md): because the
template is adopted by forking rather than installed as a dependency, the version signals
**migration cost for an adopter tracking upstream**, not an npm API contract —

- **MAJOR** — forces migration in an existing fork (a superseding ADR, a structural move,
  a removed/renamed gate · script · skill, a dropped Node/Next major);
- **MINOR** — additive, backward-compatible capability (a new accepted ADR adding a gate ·
  skill · script, a new kit, a new locale);
- **PATCH** — no contract change (in-range dependency bumps, doc fixes, gate bugfixes).

Each release is the promotion of `dev` to `main` (ADR 0011), tagged `vX.Y.Z`; entries are
drafted from the merge history and human-edited before release (ADR 0050).

<!--
  Authoring guide (delete nothing below this comment when releasing — edit in place):
  - Keep an `[Unreleased]` section at the top; move its contents into a new versioned
    section at release time, then reset `[Unreleased]` to empty subheads.
  - Use these subheads as needed, in this order:
    Added · Changed · Deprecated · Removed · Fixed · Security.
  - Update the link-reference definitions at the bottom on every release.
-->

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [0.3.0] - 2026-07-18

The mission-control console. The authenticated product surface — app shell, every
analytics widget, and a new curated Overview home — is re-skinned onto the
instrument-panel surface vocabulary so chrome and data-viz read as one instrument,
**without adding a single design token or loosening a governance invariant**. It
consumes the existing semantic layer, flips light/dark as one unit under
`check:contrast`, and rides the tenant/density swaps. The one genuinely new decision —
a governed archetype for value leaves — lands as a human-accepted ADR before its code;
the console re-skin and the reference bento are additive under the existing records.

### Added

- **Mission-control product console** (ADR 0099, extends 0081/0092). The authenticated
  console — `widgets/app-shell` plus the events-explorer, funnel-builder, retention-grid,
  segment-builder, and trends widgets — wears the mission-control surface as its chrome,
  so chrome and charts stop reading as two different products. It consumes **only** the
  existing semantic tokens (surface / text / status / `border-hairline` / `viz` and the
  `mono-data` type role, ADR 0081) — **no new tokens**, no `bg-card` / `bg-background` in
  the console, no per-theme semantic overrides — and is **dark-first but theme-aware**, so
  `check:contrast` gates both compositions. Where a shadcn primitive is reused it is themed
  **through** the console surface at the call site, never forked. Delivered as a clean
  surface swap in phases A–E (surface primitives → app-shell → events-explorer →
  Overview → the remaining analytics widgets + the chart-interaction layer that renders
  inside their Panels). The statically-generated marketing/landing (ADR 0031/0096) and
  auth screens deliberately stay on the shadcn value layer — a **documented palette seam**
  (`docs/capcom/palette-seam.md`): the two vocabularies pair only with themselves for AA,
  so they are never cross-paired.
- **Curated Overview home — the reference six-cell bento** (ADR 0099, Phase D + fidelity
  pass). A **first-class, curated** Overview — distinct from the **user-composed**
  dashboards of ADR 0090 — rebuilt to the frozen design reference as an asymmetric
  six-cell bento: a hero multi-series area (active users by plan), a stack of KPI minis
  carrying sparklines (new sign-ups · conversion · ARPU), a goal-pacing radial with
  target-free rows (honest "vs the previous period", never a fabricated target), weekly
  sign-ups stacked bars, an activation-funnel preview, and a frequency × LTV segment
  scatter. The asymmetric CSS-grid geometry is proven by a **browser-mode `getComputedStyle`
  test** (real Tailwind CSS, not jsdom) and collapses via a **container query**. New KPI
  aggregations ship as `SECURITY INVOKER` RPCs (`fn_overview_kpis` / `fn_overview_signal`
  with a per-bucket `purchasers` column / `fn_segment_scatter`, ADR 0084) and the charts
  are token-governed **visx** presentational primitives (ADR 0086/0093); every derived
  ratio (conversion, ARPU) is a same-row presentation calculation, never an app-code
  reduction (ADR 0084/0087).
- **`data-display` component archetype** (ADR 0100, extends 0061). A new archetype for the
  console's value leaves — `MetricHero` (a large KPI value) and `MonoData` (an inline
  tabular value) — that fit none of the ten ratified classes. It mandates **only** the
  `contentBounds` axis (how a _present_ value renders across min/max width and script) and
  deliberately mandates no data/process axis, because a metric's empty/loading/error is the
  composing widget's job (FSD + ADR 0084). This brings the value leaves under governed
  coverage-by-subtraction (ADR 0062), closing the silent-gap risk of the interim
  `archetype: null`; `Hairline` stays `null` (a structural rule renders no value). Added via
  ADR 0061's sanctioned "adding an entry is trivial" path — additive, no 0064 migration, no
  supersession.

### Changed

- **Chart-interaction primitives re-skinned to the console surface** (ADR 0099 Phase E).
  The shared visx interaction layer (tooltip, legend, crosshair, brush, gradient) is themed
  onto the mission-control surface where it renders inside the re-skinned Panels, so
  interaction chrome matches its host — token values only, no baked palette (ADR 0086/0058).
- **Overview signal RPC gains a `purchasers` column** (ADR 0084). `fn_overview_signal` adds
  a per-bucket distinct-purchaser count so the conversion mini's sparkline is a real
  DB-reduced series; the function is re-created (drop-then-create) with its `revoke`/`grant`
  re-issued so no `EXECUTE` leaks to `anon`.

## [0.2.0] - 2026-07-11

The premium product surface. PR-0…PR-10 delivered a functionally complete analytics
platform on real RLS, real SQL aggregation, and token-governed visx charts; this release
raises that surface to the demo's actual purpose — a visually premium, production-grade
product — without loosening a governance invariant, and adds a raw-event explorer as a new
first-class surface beside the aggregation charts. The genuinely new decisions land as
human-accepted ADRs before their code (theme, chart interaction, design source, motion, the
events explorer); the rest is additive under existing records (shadcn primitives, FSD widgets).

### Added

- **Runtime light/dark theming** (ADR 0092, supersedes 0079). The `--c-*` primitive layer
  gains a **light** composition, so theme becomes a third primitive-swap axis alongside
  tenant and density (ADR 0082) — the semantic layer and components never change. The active
  theme is a cookie-persisted choice applied by a **pre-paint resolver over a static SSR
  default**: no hydration flash, no client theme-provider, and public routes stay statically
  generated. Ships a polished `ThemeToggle` client leaf; `check:contrast` (ADR 0081) now
  gates **both** compositions and Storybook renders both.
- **Chart interaction layer** (ADR 0093, extends 0086). A shared, token-fed, theme-aware
  visx interaction sub-primitive layer — tooltip, crosshair / focus line, series
  hover-highlight, gradient / area fill, a reduced-motion-guarded entrance-motion wrapper, an
  interactive legend, and a time brush. Interaction stays local view-state; a window-changing
  brush round-trips through nuqs (ADR 0027). Applied to the trends, funnel, retention, and
  segment widgets, deterministic under Chromatic and keyboard/AT-accessible (ADR 0039/0052).
  New dependencies: `@visx/tooltip`, `@visx/gradient`, `@visx/brush`, `@visx/event`.
- **Premium primitive kit** (ADR 0034, additive). Twelve shadcn primitives —
  `card`, `dialog`, `popover`, `tooltip`, `tabs`, `dropdown-menu`, `command`, `combobox`,
  `calendar` + `date-range-picker`, `skeleton`, `scroll-area`, and `sonner` toasts — each
  with a `design-intent.ts`, CSF-3 stories over its meaningful states, and the axe gate
  (ADR 0036/0038/0039/0062). New dependencies: `cmdk`, `date-fns`, `react-day-picker`,
  `sonner`.
- **App shell & navigation IA** (ADR 0065/0066). A real `widgets/app-shell` — a sidebar of
  the analysis sections, brand / project / tenant context, breadcrumbs, and a **⌘K command
  palette** — replaces the placeholder project hub; **skeletons** replace the "Loading…"
  text and **designed empty states** replace the dashed-border placeholders.
- **Rich controls rollout** (PR-15). The native `<select>` controls are swapped for
  **comboboxes / date-range pickers** across trends, funnels, retention, and segments — the
  URL-state contracts (ADR 0027) are unchanged, only the control is. Shared `ComboField` +
  `selectCombo` extracted to `src/shared`.
- **Premium immersive landing** (ADR 0096). The MIT **Motion** library (`motion/react`)
  animates the premium landing as **client islands**: `LandingPage` stays a Server Component
  (its copy in the SSR HTML, crawlable), only thin animated wrappers are `"use client"`.
  Motion animates `opacity`/`transform` only, honors `prefers-reduced-motion` globally,
  resolves to its final state under Chromatic, and ships via `LazyMotion`. New dependency:
  `motion`.
- **Claude Design as design source** (ADR 0094/0095). Adopts **Claude Design**
  (claude.ai/design) as the design source + living catalog — login-based via the `DesignSync`
  MCP and the `/design-sync` skill — with an anti-hallucination API-approval loop sealed by a
  `renderHash` + version drift seal (`check:seals`, inert until a project exists).
- **Events explorer** (ADR 0097/0098). A raw-event data-table surface at
  `/(app)/p/[projectId]/events` — the append-only `events` stream a user inspects to answer
  "what happened, to whom, just now" — built on headless **TanStack Table**, additive beside the
  visx chart surfaces. Filtering runs over a **closed AND-only Zod grammar** (the injection
  boundary, reusing ADR 0089's discipline) with DB-computed facet counts from a `SECURITY INVOKER`
  RPC (no client-side reduction, ADR 0084); plus free-text search, multi-column sort, and row
  selection with **read-only** bulk actions (CSV export + deep-links into the analysis surfaces,
  ADR 0090 — events stay immutable, ADR 0083). All control state serializes to nuqs URL-state so
  any view is a shareable link (ADR 0027). Completion (ADR 0098) adds **saved views** persisted as
  a `kind='events'` report (reusing the ADR 0090 model — no new table), **in-database group-by
  roll-ups**, **column configuration**, a **density** toggle on the ratified `[data-density]` axis
  (ADR 0082), and a DB-reduced **live rate** indicator. New dependency: `@tanstack/react-table`.

### Changed

- **Token-usage gate widened** (ADR 0058). `check:tokens` now lints `src/shared` in addition
  to `src/components` and `src/widgets`, following the `ComboField`/`selectCombo` extraction.
- **Local dev ports** moved to the project's 20000 block (Storybook `6006` → `20010`, and the
  test-runner URL follows) to avoid cross-project collisions.
- **ADR 0092 amended** to specify the pre-paint-resolver mechanism (while still `proposed`).

### Removed

- **Figma dropped from the MCP toolchain** (ADR 0094). Replaced by Claude Design as the
  design source; `.mcp.json` no longer carries a Figma server.

### Fixed

- **Chart a11y double-announcement** (ADR 0093). Dropped a redundant live region on the
  focusable bar widgets — a focusable per-datum `aria-label` plus a live region made assistive
  tech read each value twice.

## [0.1.0] - 2026-06-29

Genesis release — the first `dev → main` promotion (ADR 0011/0080). CAPCOM is a
multi-tenant product-analytics platform — events → trends → funnels → retention →
segmentation → dashboards → AI query — built to demonstrate the decisions-first
methodology of the `claude-code-nextjs-starter` template: every architectural choice is
recorded as an accepted ADR before the code depends on it, `CLAUDE.md` is generated from
the accepted corpus, and all code lands under the deterministic gates. The data is seeded,
but multitenancy, RBAC, and the SQL aggregations are real (Postgres RLS). This baseline is
hand-authored rather than machine-derived from merge history, as the genesis case in
ADR 0080 anticipates.

### Added

- **Governed foundation** (template baseline, ADR 0001–0080). The MADR ADR corpus under
  `docs/decisions/` with the `adr*` create/accept/supersede/audit/index tooling and a
  `CLAUDE.md` generated from the accepted records; Next.js (App Router) on React 19,
  TypeScript `strict`, Node 24, npm; ESLint (flat) + Prettier; Vitest + React Testing
  Library + Playwright; Supabase (Postgres + RLS + Auth) via `@supabase/ssr` with CLI
  migrations and generated DB types; Zod as the single validation authority behind a
  `server-only` env fence; TanStack Query / Zustand / nuqs state buckets; Feature-Sliced
  Design with Steiger and the module-boundary / composition-graph gates; the security,
  supply-chain, and integrity gates (gitleaks, CodeQL, `npm audit`, Action SHA-pinning, an
  SPDX allowlist, commitlint, offline link integrity, cspell, and the ADR/CON citation
  checks); the guardrail layers (edit-time hooks, review-subagents, self-testing gates);
  provider-agnostic advisory-AI CI jobs; CI on GitHub Actions and Vercel hosting.
- **Mission-control design system** (ADR 0081–0082). A dark-first design-token vocabulary
  on a `--c-*` primitive layer — surface hierarchy, nominal/caution/warning/critical
  status, a colorblind-safe data-viz palette, and the metric/label/mono type scale —
  bridged to Tailwind via `@theme inline`, with multi-tenant (`[data-tenant]`) and density
  (`[data-density]`) runtime re-composition under a swap-only invariant and a computed
  WCAG-AA `check:contrast` gate.
- **Multi-tenant domain & identity** (ADR 0083). An `organization → project` model with
  RBAC roles `owner | admin | analyst | viewer`, the deliberate auth-user ≠ profile split,
  and tenant isolation enforced as a Postgres RLS membership join (`is_member` /
  `has_role` helpers); Supabase email/password auth, an `(app)` shell, and a workspace
  switcher.
- **Events, profiles & ingestion** (ADR 0085). The append-only `events`
  (`event_name`, `distinct_id`, `properties jsonb`, `ts`) and `profiles` tables; a single
  Zod-validated `POST /api/ingest` route authenticated by a per-project hashed ingest key;
  and a deterministic seed generator (~6.8k events / 360 profiles across three projects).
- **In-database aggregation surfaces** (ADR 0084). Every reduction runs as a
  `SECURITY INVOKER` Postgres function under the caller's RLS — never in application code:
  - **Trends** — time-bucketed event counts with an optional top-N property breakdown.
  - **Funnels** (ADR 0087) — ordered-step, first-touch, distinct-user conversion within a
    single total window.
  - **Retention** (ADR 0088) — acquisition-cohort, calendar-aligned, active-in-period
    retention rendered as the signature cohort heatmap.
  - **Segmentation** (ADR 0089) — a closed `jsonb` rule of attribute + behavioural
    predicates evaluated with no dynamic SQL (the grammar is the injection boundary).

  Each surface is a Feature-Sliced widget driving its state through nuqs URL-state (so every
  analysis is a shareable link) over TanStack Query, charted with token-governed **visx**
  primitives (ADR 0086).

- **Saved reports & dashboards** (ADR 0090). The first member-writable tables —
  `reports` / `dashboards` / `dashboard_reports` — written through Server Actions under the
  caller's RLS with the optimistic-mutation default; writes are RBAC-gated (`analyst` and
  up) so viewers are read-only, and a saved segment persists as a `kind='segment'` report.
- **AI natural-language query** (ADR 0091). A free-text prompt is translated server-side
  into a closed, Zod-validated `{ kind, config }` query-spec — model output is rejected,
  never coerced, so the spec is the injection boundary — which deep-links to an existing
  surface; a deterministic offline interpreter keeps it alive without `AI_API_KEY`.
- **Public landing, i18n & SEO** (ADR 0030/0031). A static marketing landing built as a
  Feature-Sliced widget (so the design-token gate covers it), localized via next-intl with
  the App Router Metadata API, JSON-LD, and a committed Open Graph image; plus a
  behind-the-scenes README case study.
- **CI safety net** (ADR 0007/0010). The Playwright e2e + migration-replay job and the
  Storybook smoke — the template's bootstrap deviations DEV-001 / DEV-002 — re-enabled in
  `ci.yml` ahead of this first production promotion.

[Unreleased]: https://github.com/real-case/capcom/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/real-case/capcom/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/real-case/capcom/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/real-case/capcom/releases/tag/v0.1.0

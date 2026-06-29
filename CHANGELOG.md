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

[Unreleased]: https://github.com/real-case/capcom/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/real-case/capcom/releases/tag/v0.1.0

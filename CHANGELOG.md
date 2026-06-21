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

## [0.1.0] - 2026-06-21

Initial public release. The template ships as infrastructure and scaffolding under `src/`
with no demonstration application (`src/components/**` is empty; the design-system
governance gates activate on the first component added).

### Added

- ADR-governed methodology: the MADR ADR corpus under `docs/decisions/`, the constraints
  registry, and the `adr*` skills/scripts that create, accept, supersede, audit, and index
  decisions; `CLAUDE.md` generated from the accepted ADRs.
- Application baseline: Next.js (App Router) on React 19, TypeScript `strict`, Node 24,
  npm; ESLint (flat) + Prettier; Vitest + React Testing Library and Playwright.
- Data and validation: Supabase (Postgres + RLS + Auth) access via `@supabase/ssr`, CLI
  migrations, and generated DB types; Zod as the single validation authority with
  `server-only` env fences; React Hook Form.
- State, styling, i18n, SEO: TanStack Query / Zustand / nuqs; Tailwind (CSS-first) with
  design tokens and the shadcn/ui kit; next-intl; the App Router Metadata API.
- Component workbench: Storybook 10 with the Vitest addon, the a11y/axe gate, and
  Chromatic visual regression.
- Architecture and design-system governance: Feature-Sliced Design with Steiger, the
  module-boundary and composition-graph gates, single-source token codegen, and the
  per-component `design-intent.ts` fitness functions.
- Security, supply-chain, and integrity gates: gitleaks, CodeQL, `npm audit`, GitHub
  Actions SHA-pinning, an SPDX license allowlist, commitlint (Conventional Commits),
  offline link integrity, cspell, and the ADR/CON citation checks.
- Guardrail layers: edit-time Claude Code hooks, skills and review-subagents, self-testing
  gates, and the technical-debt escape-hatch gate.
- A provider-agnostic, OpenAI-compatible advisory-AI client and advisory CI jobs (PR
  review, CI-failure triage, changelog draft, second-layer security), inert until
  `AI_API_KEY` is provisioned.
- CI on GitHub Actions and Vercel hosting with per-PR previews and production deploys
  from `main`.

[Unreleased]: https://github.com/real-case/claude-code-nextjs-starter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/real-case/claude-code-nextjs-starter/releases/tag/v0.1.0

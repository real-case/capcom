# CAPCOM — Product Analytics Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node >=24](https://img.shields.io/badge/node-%3E%3D24-339933?logo=node.js&logoColor=white)](.nvmrc)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Built for Claude Code](https://img.shields.io/badge/built%20for-Claude%20Code-d97757)](https://claude.com/claude-code)
[![On the starter](https://img.shields.io/badge/on-claude--code--nextjs--starter-444)](https://github.com/real-case/claude-code-nextjs-starter)

**A Mixpanel/Amplitude-lite product-analytics platform — events, funnels, retention
cohorts, and segmentation over a multitenant `org → project` model — built as a live
demonstration of [claude-code-nextjs-starter](https://github.com/real-case/claude-code-nextjs-starter).**

CAPCOM is a portfolio / lead-generation demo. Its point is not only the product, but _how_
the product is built: the starter's **decisions-first methodology** — an ADR for every
non-trivial choice, a human-only acceptance gate, `CLAUDE.md` regenerated from the accepted
corpus, then code under deterministic gates — applied to the real, sequential development of
a non-trivial data product. The data is **seeded**, but the multitenancy and role-based
access are **real**, enforced by Postgres Row-Level Security; the funnel / retention / trends
aggregations are **real SQL** functions, not application-side loops.

## What the demo proves

- **Event-data modelling** with the deliberate **auth-user ≠ tracked-profile** split.
- **Performant aggregations** (funnels, retention cohorts, trends) as Postgres
  views/functions on a non-trivial seeded volume.
- **Flexible segmentation** by attribute and behaviour.
- **Multitenancy + RBAC** (`owner | admin | analyst | viewer`) over RLS, plus the engineering
  discipline — ADRs, tests, machine gates — that the starter enforces.

## Status & roadmap

This repository is at **PR-0: bootstrap** — scaffolded from the starter, renamed, baseline
gates green, local Supabase verified. The product itself lands incrementally, one PR per
coherent decisions-first unit. The full plan is the backlog:

➡️ **[docs/capcom/roadmap.md](docs/capcom/roadmap.md)** — the PR-by-PR roadmap (events →
funnels → retention → segmentation → dashboards → AI), each step mapping to a future PR.

## Stack

Next.js 16 (App Router, React Server Components) · React 19 · TypeScript strict · Supabase
(Postgres + RLS + Auth) · TanStack Query · nuqs (URL state) · Zustand (ephemeral UI) · Zod ·
Tailwind + design tokens · shadcn/ui · **visx** (token-governed charts) · next-intl ·
Storybook · Vitest + Playwright. The full rationale is one ADR per choice under
[`docs/decisions/`](docs/decisions/).

## Quick start

Requires **Node 24** (`.nvmrc`) and **Docker** (for the local Supabase stack).

```bash
nvm use            # Node 24
npm ci
npm run dev        # boots local Supabase → gen:types → next dev (http://localhost:3000)
```

`npm run dev` orchestrates the whole local environment (ADR 0024): the Supabase stack, type
generation from the schema, and the Next dev server. No `.env.local` is needed — the public
Supabase vars default to the local stack.

## The methodology (why this repo looks the way it does)

CAPCOM inherits the starter's full guardrail system. The authoritative sources all live in
the repo:

- [`CLAUDE.md`](CLAUDE.md) — the agent's standing instruction, **generated** from the
  accepted ADRs (never hand-edited).
- [`docs/decisions/`](docs/decisions/) — the ADR corpus (MADR format) and the constraints
  registry. CAPCOM's domain decisions continue the corpus past the template's final
  record (ADR 0080).
- [`docs/deviations.md`](docs/deviations.md) — the deviation journal: temporary,
  on-the-record departures from an accepted ADR.

A companion overview set explains the approach itself:

| #   | Document                                                      | Subject                                                                           |
| --- | ------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| 01  | [Problems and advantages](docs/01-problems-and-advantages.md) | The problems the approach solves and the advantages that follow                   |
| 02  | [Defense mechanisms](docs/02-defense-mechanisms.md)           | The control mechanisms: hooks, deterministic gates, code generation, CI           |
| 03  | [Methodology](docs/03-methodology.md)                         | The ADR lifecycle, human and agent roles, and the feedback loops                  |

## License

MIT — see [LICENSE](LICENSE).

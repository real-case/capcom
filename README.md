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

## Try the live demo

The public landing links straight into the app. Sign in with any seeded account (all share
the password `password123`) and the role determines what you can see and do:

| Account            | Role in Aurora | Notes                                        |
| ------------------ | -------------- | -------------------------------------------- |
| `alice@capcom.dev` | owner          | also admin of a second organization (Globex) |
| `dave@capcom.dev`  | analyst        | can save reports and compose dashboards      |
| `bob@capcom.dev`   | viewer         | read-only — write attempts are RLS-denied    |

Every account sees only its own tenants' data — that boundary is a database invariant, not a
UI check (see [RLS isolation](#multitenancy--rbac-over-row-level-security) below).

---

## Behind the scenes — the case study

The interesting part of CAPCOM is the engineering underneath the charts. Each section below
is a real, shipped slice of the system.

### Domain model & the auth-user ≠ profile split

```
Organization (tenant)
  └── Project
        ├── Event    (event_name, distinct_id, properties jsonb, ts)
        ├── Profile  (a tracked end-user — keyed by distinct_id)
        ├── Report / Dashboard (saved analyses + a simple layout)
Membership / Role: owner | admin | analyst | viewer   (RBAC enforced over RLS)
```

A **member** of an organization (who logs in — an `auth.users` row) is a different entity
from a **profile** (an end-user the product tracks — keyed by `distinct_id`). The two never
collapse into one table: there is no foreign key from a domain row to `auth.users`. This is
the single most important modelling decision in a product-analytics system, and it is enforced
structurally rather than by convention.

### Multitenancy & RBAC over Row-Level Security

Tenant isolation is a **database invariant**, not application logic. Every domain table has
RLS enabled and deny-by-default; reads are scoped through a membership join, and writes compose
role checks _over_ that isolation, via two `search_path`-pinned helper functions:

- `is_member(project_id)` — is the caller a member of the project's tenant?
- `has_role(project_id, min_role)` — does the caller hold at least the given role?

A `viewer` reading another tenant's rows gets **zero rows, not an error** (deny-by-default); a
`viewer` attempting a write is **hard-denied** by RLS. The client never supplies its own tenant
id. This boundary is exercised directly by the e2e suite, which signs in as seeded members and
asserts both the allowed and the denied outcomes (including the `42501` RLS error code).

### In-database aggregation

Trends, funnels, retention, and segmentation are computed **in Postgres**, never reduced in
application code — each is a `SECURITY INVOKER` set-returning function that runs under the
**caller's** RLS, invoked as an RPC and typed end-to-end via generated database types:

| Surface      | Function(s)                                  | Shape                                               |
| ------------ | -------------------------------------------- | --------------------------------------------------- |
| Trends       | `fn_event_trends`, `fn_top_events`           | zero-filled time buckets + optional breakdown       |
| Funnels      | `fn_funnel`                                  | ordered-step conversion, distinct-user first touch  |
| Retention    | `fn_retention`                               | acquisition cohorts × period offsets (the heatmap)  |
| Segmentation | `fn_segment_size`, `fn_segment_distribution` | closed `jsonb` rule interpreter, **no dynamic SQL** |

Because aggregation lives under `SECURITY INVOKER`, a tenant can never aggregate across data it
cannot read — the isolation boundary is inherited for free. The segmentation interpreter is
especially deliberate: a user-authored rule is evaluated by a closed grammar with no `EXECUTE`
/ string concatenation, so the grammar's closure _is_ the injection boundary.

### Ingestion, saved analyses & the first member-write path

A single `POST /api/ingest` route is the one demonstration of event intake: a Zod-validated
batch authenticated by a per-project ingest key (stored hashed), whose write is confined to the
resolved `project_id` under a trusted server-only context. Bulk demo volume is generated by a
deterministic seed script.

Saved analyses are the **first member-writable** surface: a _report_ stores a widget's URL-state
(so a report _is_ a shareable link), and a _dashboard_ composes reports through an ordered join.
These are written through **Server Actions under the caller's RLS**, with the optimistic-mutation
default — `INSERT/UPDATE/DELETE` gated at `analyst`, so `viewer` is read-only, and `owner_id`
stamped from `auth.uid()` (never asserted by the client). There is no service-role write path.

### AI natural-language query

A free-text question ("registrations by channel over 30 days") is translated **server-side**
into a closed, Zod-validated `{ kind, config }` query-spec — a discriminated union over the four
analysis kinds — which is then **deep-linked** to the existing surface. The model never emits
SQL, an RPC name, a table, or a raw URL: it only fills values inside the closed spec, and any
output outside that grammar is **rejected, never coerced**. Without an API key the surface falls
back to a deterministic offline interpreter, so the demo never crashes; provisioning a key
upgrades it to live model translation with no code change.

### Design-token & Feature-Sliced governance

Every color in the UI comes from a **generated** design-token allowlist — components and chart
widgets may use only semantic token utilities, never raw hex, CSS color functions, inline-style
raw values, raw SVG `fill`/`stroke`, or Tailwind's numbered palette. The allowlist, the lint
rule, and the agent rules are all generated from one `@theme` source and drift-checked in CI.
Charts are built from unstyled **visx** primitives fed token values only.

Application code is placed by **Feature-Sliced Design** (`shared` → `entities` → `features` →
`widgets`), with imports flowing downward only and each slice reached through its public
`index.ts`. The landing page itself is a `widgets/landing` slice — placed there precisely so the
token gate covers its markup — composed of pure, props-in presentational sections. Both the
layer boundaries (Steiger) and the import graph (dependency-cruiser) are CI gates.

### The test pyramid

| Layer                 | Tooling                                    | What it guards                                      |
| --------------------- | ------------------------------------------ | --------------------------------------------------- |
| Unit / component      | Vitest + React Testing Library             | pure logic, URL-state round-trips, component states |
| Story / accessibility | Storybook browser-mode + axe (WCAG 2.2 AA) | every meaningful state renders + is a11y-clean      |
| End-to-end            | Playwright against a production build      | auth/RLS isolation, the SQL functions, UI journeys  |

Coverage is merged across the unit and story projects and gated at **≥80%**. The risk-weighted
critical path — auth and RLS — gets e2e first: the suite signs in as real seeded members and
asserts row-isolation outcomes directly against the database.

### The decisions-first method

Nothing in the list above was built before the decision that governs it was **recorded as an
ADR and accepted by a human**. The corpus is 95 records — every one human-accepted, a handful
already replaced by superseding records as the design evolved; `CLAUDE.md` is regenerated from
the accepted set (never hand-edited); citations, link integrity, and the `.claude/`
infrastructure itself are CI-gated. The git history mirrors the roadmap one reviewable PR at a
time. That discipline — not any single feature — is what the demo is really showing.

---

## Status & roadmap

The analytics platform is **built end-to-end**: tenancy + RBAC, events + ingest, and the trends,
funnels, retention, segmentation, dashboards, and AI-query surfaces have all shipped, each as a
decisions-first PR. The public landing, i18n/SEO polish, and the re-armed CI safety net land
ahead of the first `dev → main` production promotion.

➡️ **[docs/capcom/roadmap.md](docs/capcom/roadmap.md)** — the PR-by-PR roadmap; the git history
mirrors it.

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
npm run dev        # boots local Supabase → gen:types → next dev (http://localhost:20000)
npm run seed:events  # (optional) generate dense demo data across the seeded projects
```

`npm run dev` orchestrates the whole local environment (ADR 0024): the Supabase stack, type
generation from the schema, and the Next dev server. No `.env.local` is needed — the public
Supabase vars default to the local stack. Sign in with a seeded account (see
[Try the live demo](#try-the-live-demo)).

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

| #   | Document                                                      | Subject                                                                 |
| --- | ------------------------------------------------------------- | ----------------------------------------------------------------------- |
| 01  | [Problems and advantages](docs/01-problems-and-advantages.md) | The problems the approach solves and the advantages that follow         |
| 02  | [Defense mechanisms](docs/02-defense-mechanisms.md)           | The control mechanisms: hooks, deterministic gates, code generation, CI |
| 03  | [Methodology](docs/03-methodology.md)                         | The ADR lifecycle, human and agent roles, and the feedback loops        |

## License

MIT — see [LICENSE](LICENSE).

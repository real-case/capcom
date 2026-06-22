# CAPCOM — implementation roadmap

> **How to read this file.** Each `PR-N` section below is one coherent, reviewable unit of
> work — a single pull request. Together they tell the story of building a product-analytics
> platform _the way the [starter methodology](../03-methodology.md) prescribes_: a decision
> is recorded as an ADR and **accepted by a human** before the code it governs is written,
> `CLAUDE.md` is regenerated from the accepted corpus, and every change lands under the
> deterministic gates. The roadmap is the backlog; the git history will mirror it.

This is a **demo** (portfolio / lead-generation). The data is **seeded**, but the
multitenancy and RBAC are **real** (Postgres RLS), and the aggregations are **real SQL**.
Realtime is deliberately out of scope (ADR 0012 baseline; refresh/poll instead).

## The rhythm every PR follows

```
decision needed?  ──► ADR (proposed) ──► app.adr-review + adr-conformance-reviewer
                                              │
                                       human accepts  ◄── the one gate the agent cannot pass
                                              │
                                   adr-sync-claude-md  ──► CLAUDE.md regenerated
                                              │
   migration (create-migration skill: deny-by-default RLS + gen:types + RLS test)
   slice (new-slice skill: entities → features → widgets, public index.ts)
                                              │
                          gates green ──► human-reviewed PR ──► dev
```

State has exactly one home (ADR 0025/0026/0027): **server → TanStack Query**, **URL → nuqs**,
**ephemeral UI → Zustand**. Charts draw only from the generated design-token allowlist
(ADR 0033/0058), via **visx** primitives (ADR 0086, below).

**Design input is optional and code-canonical.** Figma never gates the pipeline (`check:seals`
stays inert until a Figma file exists) and never forks token values — it conforms to code
(ADR 0033/0045) and is consumed per-component as the ADR 0063 image API-approval artifact. So a
design is never strictly required; the slices proceed code-first from the token vocabulary and
each component's `design-intent.ts`. The two points where a design most changes the output are
flagged inline below as a **🎨 Design checkpoint**: **PR-4** (the data-viz visual language) and
**PR-8** (the dashboard composition).

## Domain model (the architectural showpiece)

```
Organization (tenant)
  └── Project
        ├── Event      (event_name, distinct_id, properties: jsonb, ts)
        ├── Profile    (a tracked end-user — deliberately ≠ the auth/member user)
        ├── Segment    (rules over attributes / behavior)
        ├── Funnel     (ordered sequence of steps)
        └── Report / Dashboard (saved charts + layout)

Membership / Role:  owner | admin | analyst | viewer        (RBAC enforced over RLS)
```

The **auth-user ≠ profile** split is a deliberate architectural signal: a _member_ of an
organization (who logs in) is not the same entity as a _profile_ (the end-user whose events
the product tracks). The two never collapse into one table.

## PR sequence at a glance

| PR    | Theme                              | New ADRs      | Proves                                            |
| ----- | ---------------------------------- | ------------- | ------------------------------------------------- |
| PR-0  | Bootstrap (this repo's start)      | —             | governed canvas, gates green                      |
| PR-DS | Design-system token foundation     | 0081–0082     | mission-control tokens, tenant/density, a11y gate |
| PR-1  | Foundational domain ADRs           | 0083–0086     | decisions-first, human gate                       |
| PR-2  | Tenancy: org/project/membership    | —             | multitenant RLS + RBAC                            |
| PR-3  | Events + profiles + ingest + seed  | —             | event modelling, ingest contract                  |
| PR-4  | Trends (first flagship slice)      | —             | SQL aggregation → nuqs → visx, end-to-end         |
| PR-5  | Funnels                            | 0087 (if any) | ordered-step conversion in SQL                    |
| PR-6  | Retention cohort grid              | —             | the signature dense infographic                   |
| PR-7  | Segmentation                       | 0088          | flexible attribute/behavior rules                 |
| PR-8  | Dashboards + saved reports         | —             | Server Actions, optimistic mutations              |
| PR-9  | AI natural-language query          | 0089 (if any) | provider-agnostic advisory AI                     |
| PR-10 | Public landing + i18n/SEO + README | —             | the lead-gen surface; CI suites re-enabled        |

---

## PR-0 — Bootstrap (done)

Scaffold from `claude-code-nextjs-starter`, rebrand to CAPCOM (`package.json`,
`supabase/config.toml`, `messages/`, README, cspell dictionary), fresh git history on
`main` with `dev` branched off (ADR 0011), `npm ci` on Node 24, **all baseline gates green**,
and the local Supabase stack verified to boot. The template's two managed deviations
(`DEV-001` e2e, `DEV-002` Storybook smoke — see [`../deviations.md`](../deviations.md)) carry
over unchanged. Output: a blank but fully-governed canvas plus this roadmap.

## PR-DS — Design-system token foundation

The mission-control design-token foundation, and the first records past the template's final ADR
(0080): **ADR 0081** (the mission-control token vocabulary on a re-introduced `--c-*` primitive
layer, extending ADR 0033) and **ADR 0082** (multi-tenant + density runtime theming via
`[data-tenant]` / `[data-density]` — the gating ADR ADR 0079 calls for). Ships the dark-first
token layer in `globals.css` (surface hierarchy, nominal/caution/warning/critical status, a
colorblind-safe data-viz palette, density + tenant swaps), a primitive-aware `gen:tokens` with a
swap-only invariant, and a computed WCAG-AA `check:contrast` gate. **No components** — those
follow as a sibling-spec backlog.

## PR-1 — Foundational domain ADRs

The purest decisions-first PR: **documentation only, no product code.** Four records continue the
corpus after the design-system foundation (0081–0082):

- **ADR 0083 — Event & identity model + multitenancy.** `org → project`; the `event` shape
  (`event_name`, `distinct_id`, `properties jsonb`, `ts`); the deliberate auth-user ≠ profile
  split; RBAC roles `owner | admin | analyst | viewer`; and **RLS via a membership join** as
  the isolation boundary (extends ADR 0013/0016 onto a per-tenant model).
- **ADR 0084 — Aggregation strategy.** Trends, funnels, and retention are computed by
  **Postgres views / `set`-returning functions**, inside the Supabase Postgres baseline
  (ADR 0012) — not in application code. Reports refresh by poll, not realtime (ADR 0012/0079).
- **ADR 0085 — Event ingestion contract.** A single demonstration `ingest` route: Zod-validated
  payload (ADR 0017), per-project ingest key, structured-error contract (ADR 0019). Records the
  **seeded-data posture** — no high-volume pipeline or SDK — as a conscious scope boundary.
- **ADR 0086 — Charting primitive layer: visx + design tokens.** Low-level visx primitives
  (scales/shapes), unstyled by default, so every color comes from the generated token
  allowlist (ADR 0033/0058); theme value layer per ADR 0079. The alternatives weighed:
  Recharts (faster, indirect theming) and hand-rolled SVG (zero-dep, tedious for axes).

Each follows the ADR lifecycle: drafted `proposed`, reviewed by `app.adr-review` +
`adr-conformance-reviewer`, **accepted by the human**, then `adr-sync-claude-md` regenerates
`CLAUDE.md`. `check:citations` stays green.

## PR-2 — Tenancy foundation

- **Migration `create_tenancy`** (`create-migration` skill): `organizations`, `projects`,
  `memberships` (with a `role` enum), `search_path`-pinned helper functions
  (`is_member(project)`, `has_role(project, role)`), **deny-by-default RLS** scoped by the
  membership join, and explicit table GRANTs. `gen:types` regenerates `database.types.ts`.
- **Entities** (`new-slice`): `entities/organization`, `entities/project`,
  `entities/membership` — types, TanStack Query keys, public `index.ts`.
- **Auth + shell:** minimal Supabase-Auth sign-in/up (ADR 0016) and an org/project switcher
  `widget`; an `(app)` route group.
- **Tests:** RLS isolation tests on the membership critical path (`supabase-rls-reviewer`).
- **Seed:** a couple of organizations, projects, and members across roles.

## PR-3 — Events, profiles, ingest, seed generator

- **Migration `create_events_profiles`:** `profiles` (the tracked end-user, keyed by
  `distinct_id`, never the auth user); `events` (`event_name`, `distinct_id`,
  `properties jsonb`, `ts`); indexes on `(project_id, ts)`, `event_name`, `distinct_id`; RLS
  through the project membership. `gen:types`.
- **Ingest route** (ADR 0085): `POST` an event batch, Zod-validated, authorized by a
  per-project ingest key — the single demonstration of event intake.
- **Seed generator** (`scripts/seed-events.mjs`): realistic multi-project event volume so the
  visualizations have something dense to render.
- **Entities:** `entities/event`, `entities/profile`.

## PR-4 — Trends (first flagship vertical slice)

> **🎨 Design checkpoint.** This is the first surface where a dashboard / data-viz design
> materially changes the output — chart styling, axis/legend treatment, widget composition. If
> the visualization language is to be **design-led rather than agent-led**, the Figma source
> lands **here, before the widgets**: read-only and token-conformant (ADR 0033/0045), consumed
> per-widget as the ADR 0063 image API-approval artifact (`renderHash` + `figmaFileVersion`
> seal). Absent a design, the slice proceeds code-first — `check:seals` stays inert.

- **Migration `fn_event_trends`:** a SQL function returning time-bucketed event counts with an
  optional breakdown by a property (ADR 0084).
- **Feature `trends-explorer`:** a TanStack Query hook over the RPC; **nuqs** URL-state for
  event / date-range / interval / breakdown — so a report is a shareable, bookmarkable link
  (ADR 0027).
- **Widgets:** `trends-chart` (visx line/area, token colors) and a top-events bar.
- **Page:** `/(app)/p/[projectId]/trends`.
- **Stories + tests:** Storybook states (empty / loading / error / overflow) with a11y
  (ADR 0039); a test for the SQL function.

This slice proves the whole spine end-to-end: **ingest → event model → SQL aggregation →
TanStack Query → nuqs → token-governed visx chart**, on real RLS.

## PR-5 — Funnels

SQL function for ordered-step conversion (with a conversion window); if the step semantics
warrant a recorded decision, **ADR 0087** precedes it. Feature `funnel-builder` +
`widgets/funnel-chart` (visx), with nuqs-encoded step configuration.

## PR-6 — Retention cohort grid

SQL function for cohort retention (cohort by first-seen period; retained in period _N_).
`widgets/cohort-grid` renders the **heatmap** — the densest, most striking infographic in the
demo — with a token-driven color scale. Feature `retention`.

## PR-7 — Segmentation

**ADR 0088** records the segment-definition model (attribute predicates + behavioral rules).
Migration `create_segments` stores the rule JSON; a SQL function computes segment size and
distribution. Feature `segment-builder` + `widgets/segment-distribution`.

## PR-8 — Dashboards & saved reports

> **🎨 Design checkpoint.** The dashboard _composition_ itself — grid, card layout, which charts
> sit where — first appears here. If only the overall dashboard look matters (not per-widget
> styling), this is the **latest** point to provide a design; same posture as PR-4 (read-only,
> token-conformant, ADR 0063 per-component approval).

Migration for `reports` / `dashboards` (saved chart configs + a simple layout). **Server
Actions** (ADR 0020) persist reports and segments, with the optimistic-mutation default
(ADR 0025). Feature `dashboard` + a layout widget. Reports are reopened straight from their
nuqs URL state.

## PR-9 — AI natural-language query

Feature `ai-query`: a natural-language prompt ("registrations by channel over 30 days") is
translated into a structured query spec (Zod), run through the existing aggregation RPCs, and
rendered as a chart. Built on the **provider-agnostic advisory-AI client** (ADR 0075); it
**sleeps without `AI_API_KEY`** with a graceful fallback. **ADR 0089** records the
NL → query-spec contract if the mapping needs one.

## PR-10 — Public landing, i18n/SEO, README case study

A public marketing route (next-intl + the Metadata API, ADR 0030/0031) with locale parity
(`check:i18n`); the README "behind the scenes" case study (data model, SQL aggregations, RLS,
tests, ADR discipline). Before the first `dev → main` promotion, **re-enable `DEV-001` and
`DEV-002`** (Playwright e2e + Storybook smoke in CI) per their re-enable triggers.

---

## Template strengths each PR flexes

| Capability              | Where it shows up                                             |
| ----------------------- | ------------------------------------------------------------- |
| Multitenant RLS         | PR-2 `org → project` isolation; every later query inherits it |
| RBAC                    | PR-2 roles `owner/admin/analyst/viewer`                       |
| URL-state via nuqs      | PR-4+ filters, ranges, breakdown — reports as links           |
| TanStack Query + RSC    | PR-4+ report cache; Server Components for heavy aggregations  |
| Server Actions          | PR-8 saving reports/segments                                  |
| Design-token governance | PR-4+ chart colors from tokens only (visx, ADR 0086)          |
| i18n / SEO              | PR-10 public landing + localized UI                           |
| Storybook / a11y        | PR-4+ chart states: empty / loading / error / overflow        |

## Scope — consciously OUT

Stated plainly, and that is fine for a demo: a real high-volume ingestion pipeline / SDK
(data is seeded; one demonstration ingest route); realtime streaming (deferred, ADR 0012/0079
— refresh/poll instead); a full SQL/query-builder UI beyond a few dimensions; billing, data
retention policies, and PII governance (real product concerns, out of demo scope).

## Success criteria

- A ≤30-second scan shows dense data-viz (cohort grid, funnel), multitenancy, and the AI query.
- Reports are shareable by link (nuqs) — visibly product-grade behavior.
- The README / case study exposes the behind-the-scenes: data model, SQL aggregations, RLS,
  tests, and ADR discipline.

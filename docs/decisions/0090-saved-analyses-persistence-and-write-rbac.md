---
status: "accepted"
date: 2026-06-28
decision-makers: Yurii Anichkin
---

# Saved analyses: report / dashboard persistence model and member-write RBAC

## Context and Problem Statement

PR-8 adds the first surface that **writes**. Every prior slice — trends (PR-4), funnels (PR-5),
retention (PR-6), segments (PR-7) — is a read-only vertical: a `SECURITY INVOKER` aggregation read
under the caller's RLS (**0084**), its configuration carried in URL-state (**0027**) and nothing
persisted. The only existing write path is the service-role ingest route (**0085**), which is
RLS-bypassing and confined to a resolved `project_id` — not a member action. PR-8's showcase is the
inverse: a **member** saving a named analysis, composing several onto a **dashboard**, and editing
them — the demo's one demonstration of **Server Actions with the optimistic-mutation default**
(**0020/0025**). This is also where **0089** deferred *saved, named segment* persistence.

That raises decisions no accepted ADR fixes — and, because these are the **first member-writable
domain tables**, they are squarely security decisions:

1. **What is persisted, and in what shape?** Every widget already serializes its *entire*
   configuration to a single nuqs value validated by a Zod schema (the `trendsQuerySchema`,
   `funnelQuerySchema`, `retentionQuerySchema`, `segmentQuerySchema`). Is a saved report exactly
   that config (a `kind` + a validated `jsonb` blob), or normalized columns per chart type, or the
   opaque encoded URL string?
2. **One table or four?** Trends, funnels, retention, and segments have different parameters. Do
   they share one `reports` table discriminated by `kind`, or get one table each?
3. **Where do saved segments land?** **0089** fixed the segment *rule* shape and promised "a PR-8
   `segments.definition jsonb` column will store" it. Is that a dedicated `segments` table, or is a
   saved segment just a `reports` row of `kind = 'segment'` whose config holds the rule?
4. **How does a dashboard compose reports?** A relational join (`dashboard → reports`, ordered), or
   an embedded layout `jsonb`? What is "a simple layout" (the roadmap's words)?
5. **Who may write?** Reads inherit the membership-join isolation (**0083**) — any member sees the
   project's saved analyses. But **writes** need an RBAC threshold over that isolation: which of
   `owner | admin | analyst | viewer` may create / edit / delete a report or dashboard? And how is
   the writer's identity stamped without letting the client assert it (**0083**)?

This record fixes the **persistence model and the write-authorization model** before the
`create_dashboards` migration, the `entities/report` + `entities/dashboard` slices, the Server
Actions, and the `dashboard` widget are built — so the SQL has a closed schema and RLS shape, the
Zod schemas have a definition, and the e2e assertions have an RBAC contract to prove.

Scope: this record decides *what is stored and who may write it*, not the mutation mechanism
(Server Actions under the caller's RLS — application of **0013/0020/0025**), the charts (**0086**),
or the URL-state encoding a saved report is hydrated back into (**0027**). It governs the PR-8
`reports` / `dashboards` / `dashboard_reports` tables and their RLS, and refines **0089**'s
deferred-persistence note.

## Decision Drivers

* **First member-writable tables — RLS write policy is the security boundary (0083).** The tables
  must be RLS-enabled, deny-by-default, scoped by the membership join, role-gated on every write,
  and the client must never assert its own tenancy or identity: `project_id` is checked against
  membership, `owner_id` is stamped from `auth.uid()`, never trusted from the payload.
* **Reuse URL-state as the stored config (0017/0027).** Each widget already validates its whole
  state with a Zod schema and serializes it to one nuqs value. Persisting *exactly that* means a
  saved report has **one** config format — opening it is hydrating URL-state — with no second
  schema to keep in lockstep, and the stored blob is validated by the same authority on the way in.
* **A composition substrate for dashboards.** Reports must be referenceable so a dashboard can
  arrange several, reorder them, and reflect a report's edits without copying its config.
* **Showcase Server Actions + optimistic mutations (0020/0025).** The persisted model exists to
  demonstrate the write path: create / rename / delete a report, compose and reorder a dashboard —
  each an optimistic mutation (`onMutate` → rollback → invalidate). The schema should make those
  mutations small and the optimistic cache update obvious.
* **No new datastore, no aggregation in app code (0012/0084).** Saved analyses are ordinary rows;
  reading them adds no reduction logic and introduces no second store. The aggregation still runs
  in the `SECURITY INVOKER` RPCs — a saved report only *remembers their arguments*.
* **Demo honesty.** Real RBAC writes on real RLS, with stated boundaries (owner-scoped editing,
  rich grid layout, reusable cross-analysis segments) over half-built richness — each widenable
  additively without reopening this model.

## Considered Options

* **A — Unified `reports(kind, config jsonb)` + `dashboards` + a `dashboard_reports` join, the
  config validated by the existing per-widget Zod schemas; saved segments are `kind = 'segment'`
  reports; write-RBAC = read `is_member`, write `has_role(project, 'analyst')`, `owner_id` stamped
  from `auth.uid()`.**
* **B — One normalized table per chart type** (`trend_reports`, `funnel_reports`, …) with typed
  columns for each parameter, plus `dashboards` referencing them polymorphically.
* **C — A dedicated `segments` table (per 0089's literal wording) separate from `reports`, with
  dashboards referencing either via a polymorphic link.**
* **D — Store the encoded nuqs URL string** as an opaque text blob per saved report.

For the write-authorization axis, the alternatives weighed inside the chosen model are an
**analyst-minimum role gate** (chosen) versus **owner-scoped editing** (each member edits only
their own rows) — discussed in the outcome and recorded as a boundary.

## Decision Outcome

Chosen option: **A — a unified, `kind`-discriminated `reports` table whose `config jsonb` is exactly
the originating widget's URL-state (validated by that widget's Zod schema), composed onto
`dashboards` through an ordered `dashboard_reports` join, with reads scoped by the membership join
and writes gated at `has_role(project, 'analyst')` and stamped with `owner_id = auth.uid()`** —
because it stores precisely the config the widgets already produce and validate (one format, opened
by hydrating URL-state), gives dashboards a clean relational composition substrate, keeps every
write a small optimistic mutation under the caller's RLS, and lands **0089**'s deferred segment
persistence as a `kind = 'segment'` report with no redundant table. B, C, and D each add schema or
paths the demo does not need — see below.

The model this record fixes — the contract the `create_dashboards` migration, the `entities/report`
+ `entities/dashboard` slices, the Server Actions, and the `dashboard` widget implement:

* **`reports`** — one saved analysis: `id`, `project_id`, `owner_id`, `name`, `kind`, `config jsonb`,
  `created_at`, `updated_at`. `kind` is a Postgres enum **`report_kind = trends | funnel | retention
  | segment`** — the four flagship surfaces. `config` is the *exact* URL-state of the matching
  widget — `{ event, range, interval, breakdown }` for `trends`, `{ steps, range, window }` for
  `funnel`, `{ range, period }` for `retention`, `{ rule, dimension, range }` for `segment` —
  validated by a discriminated Zod `[report]` schema that **reuses the existing per-widget query
  schemas** (**0017**), so a saved report's config and a shareable URL carry the same validated
  shape. Opening a saved report is hydrating the widget's nuqs state from `config`; there is no
  second config format. The database stores `config` as opaque `jsonb` (validated in the
  application by the Zod authority, not by a SQL check) — consistent with how the segment rule is
  carried (**0089**).
* **`dashboards`** — one named board: `id`, `project_id`, `owner_id`, `name`, `created_at`,
  `updated_at`.
* **`dashboard_reports`** — the ordered composition: `dashboard_id`, `report_id`, `position int`,
  with `on delete cascade` from both parents and a `unique (dashboard_id, report_id)` invariant (a
  report appears on a board at most once). **`position` is deliberately *not* unique** — a reorder
  rewrites positions row by row, so a unique-position constraint would trip on transient duplicates;
  ordering is by `position` (ties broken by `created_at`). A dashboard is its reports ordered by
  `position`; the widget renders them as a responsive grid in that order. **This is "a simple
  layout"**: ordering only — no `x/y/w/h`, no resize. A report can appear on multiple dashboards;
  editing the report updates everywhere it appears, because the board references it rather than
  copying its config.
* **Reads inherit isolation (0083).** Every table carries `project_id`; `select` policy is
  `using (public.is_member(project_id))` — any project member (viewer included) sees the project's
  saved analyses and never another tenant's. The `dashboard_reports` join is readable when the
  caller is a member of its dashboard's project.
* **Writes are RBAC-gated at `analyst` (0083).** `insert | update | delete` policies require
  `public.has_role(project_id, 'analyst')` — so `analyst`, `admin`, `owner` may author analyses and
  `viewer` is read-only. The threshold maps the role to its meaning: the *analyst* is the persona
  who builds analyses. The `analyst`-minimum check composes **over** the isolation, exactly as the
  PR-2 tenancy-table policies layer `has_org_role` over `is_org_member`.
* **The writer's identity is stamped, never asserted (0083).** `owner_id` defaults to
  `auth.uid()`; the `insert` `with check` requires `owner_id = (select auth.uid())` so the column
  cannot be spoofed, and `project_id` is validated through `has_role` so a member cannot write into
  a project they do not belong to. `owner_id` records provenance (a "created by" display and the
  seam for future owner-scoped editing); the demo's edit/delete policies are **role-based, not
  owner-scoped** — any `analyst+` may edit any saved analysis in their project, which is the more
  product-like collaborative default and keeps each write policy a single `has_role` check.
* **Explicit GRANTs, deny-by-default.** RLS enabled on all three tables; `select, insert, update,
  delete` granted to `authenticated` (the policies are the real gate); no `anon` grant. Unlike
  `events`/`profiles` (member `select` only, writes via service-role), these tables grant member
  writes — gated entirely by the RBAC policies above, with no service-role path.
* **Mutations are Server Actions under the caller's RLS (0013/0020/0025).** Persistence is written
  through `"use server"` actions using a request-scoped `createClient()` (the signed-in user's
  client), each validating input with the `[report]` / `[dashboard]` Zod schema and returning a
  discriminated `{ ok } | { ok:false, reason }` result (never throwing) — the `auth-by-email`
  action pattern. The RLS policies above are the authorization boundary; the action does not
  re-implement RBAC, it relies on the policy to reject an unauthorized write. The client wraps each
  action in a TanStack `useMutation` with the **optimistic default** (`onMutate` cache update →
  rollback on error → invalidate) (**0025**).

**This refines 0089's deferred-persistence note.** **0089** wrote that the rule "is exactly what a
PR-8 `segments.definition jsonb` column will store" — anticipating a dedicated table. This record
realizes that persistence as a `kind = 'segment'` row in the unified `reports` table whose `config`
holds the segment-builder URL-state (`{ rule, dimension, range }`, the rule inside it): the rule
*is* persisted and validated by its Zod schema, but in the composition substrate that lets a saved
segment sit on a dashboard beside a trend or funnel, with no redundant table or second write path.
A standalone, *reusable* segment entity referenced by other analyses (a funnel filtered to a saved
segment) is a stated boundary below — the demo does not cross-reference segments, so the unified
table is the simpler, non-reopening choice. This is the same kind of refinement prior PRs applied
to the roadmap (the 0088-vs-0089 numbering shift; the FSD single-widget reconciliation).

Stated scope boundaries (consciously OUT, widenable later without reopening this model):
**owner-scoped editing** (`update/delete` restricted to `owner_id = auth.uid()` for `analyst`,
project-wide for `admin+`) — an additive predicate on the existing policies, not a schema change;
**rich grid layout** (per-report `x/y/w/h`, drag-resize) — additive columns on `dashboard_reports`,
the current model stores ordering only; **a reusable cross-analysis segment** (a `segments` table a
funnel or trend can reference by id) — an additive sibling table and an optional FK, the rule today
lives in a `kind = 'segment'` report; **report versioning, sharing ACLs / permalinks beyond the
nuqs link, scheduled exports** — each its own resource, none reopening this one. Each boundary is an
additive column, policy predicate, or sibling table.

### Consequences

* Good, because a saved report stores **exactly** the widget's already-validated URL-state, so
  there is one config format (opened by hydrating nuqs state), validated by the same Zod authority
  (**0017/0027**) on the way in — no parallel persistence schema to drift.
* Good, because the **first member-writable tables** are deny-by-default, RLS-scoped by the
  membership join, role-gated at `analyst` on every write, and stamp `owner_id` from `auth.uid()` —
  the client asserts neither tenancy nor identity (**0083**), and there is no service-role write
  path.
* Good, because `dashboard_reports` is a clean relational composition: a board is its reports
  ordered by `position`, reorder is an `update`, a deleted report cascades out of every board, and
  a report shown on several boards stays single-sourced.
* Good, because every write is a small optimistic mutation (create / rename / delete a report,
  add / remove / reorder on a board) — a focused demonstration of the **0025** default on real RLS,
  which no prior read-only slice could show.
* Good, because **0089**'s deferred segment persistence lands with no redundant table: a saved
  segment is a `kind = 'segment'` report, composable onto a dashboard like any other analysis.
* Good, because nothing aggregates in application code (**0084**) and no new datastore appears
  (**0012**) — a saved report only remembers an RPC's arguments; the reduction still runs in the
  `SECURITY INVOKER` functions under the caller's RLS.
* Neutral, because `config` is stored as opaque `jsonb` with no SQL `check` constraint — the Zod
  `[report]` schema is the validation authority (as for the segment rule, **0089**); a malformed
  blob written outside the app would be caught on read by the schema, not by the database.
* Bad, because edit/delete is **role-based, not owner-scoped** — any `analyst+` can modify any saved
  analysis in their project. This is the collaborative default for a demo; per-owner editing is a
  stated additive boundary, not shipped.
* Bad, because the `kind`-discriminated `config jsonb` is not relationally queryable per chart-type
  parameter (you cannot `where config->>'interval' = 'day'` with a typed index) — an accepted
  trade for storing the validated URL-state verbatim, and a non-concern at the demo's handful of
  saved reports.

### Confirmation

* The `create_dashboards` migration ships an **e2e RLS/RBAC test** (`e2e/dashboards.spec.ts`, the
  PR-2 `e2e/rls-tenancy.spec.ts` impersonation discipline) proving on the seed: (1) **write-RBAC** —
  an `analyst`+ member (a seeded `analyst`, and `owner` `alice`) can `insert/update/delete` a
  report and dashboard in their project, while a **`viewer` (`bob`) is denied every write**
  (`error.code == '42501'`) yet can **read** the project's saved analyses; (2) **cross-tenant
  isolation inherited** — `carol` (Globex) sees none of Aurora's reports/dashboards and cannot
  write into Aurora (`42501` / zero rows); (3) **identity not spoofable** — an insert attempting to
  set `owner_id` to another user's id is rejected by the `with check`; (4) **composition + ordering**
  — `dashboard_reports` reorder persists the new `position` order, and deleting a report cascades it
  out of every board; (5) the `[report]` Zod schema round-trips each `kind`'s config against its
  originating widget's query schema (a `trends` report's `config` parses as `trendsQuerySchema`,
  etc.).
* The three tables are **RLS-enabled, deny-by-default**, `select` scoped by `is_member(project_id)`
  and `insert/update/delete` by `has_role(project_id, 'analyst')`, with `owner_id` defaulting to and
  `with check`-pinned to `auth.uid()`, no `anon` grant, and **no service-role write path** —
  `supabase-rls-reviewer` confirms the policies are deny-by-default, the membership join scopes
  reads, the role gate composes over it, and no policy lets the client assert tenancy or identity
  (the inverse of the **0085** service-role ingest posture, and the RBAC-over-isolation shape of the
  PR-2 tenancy tables).
* `gen:types` regenerates the `reports` / `dashboards` / `dashboard_reports` row and the
  `report_kind` enum types; CI fails on drift, so the typed write surface (**0015**) stays in
  lockstep with the SQL, and the Zod `[report]` / `[dashboard]` schemas (**0017**) are the single
  authority the Server Actions validate against.
* The diff-scoped reviewer confirms the mutation path is **Server Actions under the caller's RLS**
  (request-scoped `createClient()`, no service-role client, no `admin.ts` import) returning
  discriminated results, with the client using the **0025** optimistic default; no aggregation or
  authorization logic leaks into application code (the RLS policy is the gate), matching **0013 /
  0020 / 0025 / 0084**.

## Pros and Cons of the Options

### A — Unified `reports(kind, config jsonb)` + `dashboards` + `dashboard_reports` join

One `kind`-discriminated reports table storing each widget's validated URL-state, composed onto
dashboards through an ordered join; reads scoped by membership, writes gated at `analyst`, `owner_id`
stamped from `auth.uid()`; saved segments are `kind = 'segment'` reports.

* Good, because it persists exactly the config the widgets already produce and validate — one
  format, opened by hydrating nuqs state, validated by the same Zod authority.
* Good, because dashboards get a clean relational composition (ordered join, cascade delete,
  single-sourced reports).
* Good, because every write is a small optimistic mutation on real RLS — the PR's showcase.
* Good, because **0089**'s deferred segment persistence lands with no extra table or write path.
* Good, because the write-RBAC is one `has_role(project, 'analyst')` check per policy — trivial to
  reason about and prove, composing over the membership-join isolation.
* Neutral, because `config` is opaque `jsonb` validated in the app, not by a SQL check (as the
  segment rule already is).
* Bad, because per-chart-type parameters are not relationally queryable, and edit is role-based
  rather than owner-scoped — both accepted demo trade-offs, stated as boundaries.

### B — One normalized table per chart type

`trend_reports`, `funnel_reports`, `retention_reports`, `segment_reports`, each with typed columns,
dashboards referencing them polymorphically.

* Good, because each parameter is a typed, indexable column — relationally queryable.
* Neutral, because the RLS/RBAC shape is identical per table to option A.
* Bad, because every new chart type is a new table + migration + entity + policy set + a
  polymorphic dashboard reference — four times the surface for a demo whose configs are already
  validated URL-state blobs.
* Bad, because it duplicates, in SQL columns, the shape the Zod query schemas already define — two
  authorities for one config, exactly the drift **0017** exists to avoid.

### C — Dedicated `segments` table separate from `reports`

Honor **0089**'s literal "`segments.definition` column": a standalone `segments` table plus a
`reports` table, dashboards linking either polymorphically.

* Good, because a saved segment is a first-class, potentially reusable entity (a funnel could one
  day filter to it).
* Neutral, because it still reuses the same RLS/RBAC pattern.
* Bad, because nothing in the demo cross-references a saved segment, so the second table buys
  reuse that is never exercised — and a polymorphic dashboard link (report *or* segment) is more
  composition machinery than ordering a single `reports` table needs.
* Bad, because it splits the write path and the optimistic-mutation surface across two resources for
  no demo payoff. The reusable-segment table is the stated additive boundary if reuse ever lands.

### D — Store the encoded nuqs URL string

Persist each report's config as the opaque encoded querystring.

* Good, because "open this report" is literally "navigate to this URL".
* Bad, because the stored value is unvalidated at rest and couples persistence to nuqs encoding
  details — a serializer change silently invalidates every saved report.
* Bad, because it is not introspectable (no `kind` discriminator, no structured config) for a
  dashboard to render a saved report without first parsing the URL — option A's `jsonb` is the same
  data, structured and validated. Rejected as a strictly worse encoding of A.

## More Information

This record refines **0089** (it realizes the deferred segment persistence as a `kind = 'segment'`
report rather than a dedicated `segments.definition` column) and is consumed by the PR-8
`create_dashboards` migration, the `entities/report` + `entities/dashboard` slices, the
`features`-layer Server Actions, and the `dashboard` widget. It builds on the **0083** identity and
RBAC model (the membership-join isolation and the `is_member` / `has_role` helpers the write
policies compose over), stores each surface's **0027** URL-state validated by its **0017** Zod
schema, demonstrates the **0020 / 0025** Server-Action + optimistic-mutation patterns it does not
re-decide, adds no aggregation or datastore beyond the **0012 / 0084** baseline, and renders saved
analyses through the existing **0086** token-only chart widgets. It is the first member-writable
domain surface, which is why its central concern is the **write-authorization boundary** (deny-by-
default RLS, an `analyst` role gate over the isolation, an unspoofable `owner_id`) rather than a
read semantics. The model should be revisited only if the demo needs owner-scoped editing, a rich
grid layout, a reusable cross-analysis segment entity, or report versioning/sharing — all additive
(a policy predicate, columns, or a sibling table) and none reopening the schema or the RBAC fixed
here.

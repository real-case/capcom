---
status: "accepted"
date: 2026-06-22
decision-makers: Yurii Anichkin
---

# Aggregation strategy: in-database SQL functions

## Context and Problem Statement

CAPCOM's flagship surfaces — trends, funnels, retention cohorts, segment distributions — are
all *aggregations* over the event stream fixed by **0083** (`events(project_id, event_name,
distinct_id, properties jsonb, ts)`). The roadmap's whole thesis is that these aggregations are
**real SQL over real multi-tenant data**, not pre-baked numbers. Before the first aggregation
is written (PR-4 trends), this record decides **where the aggregation runs** and **how a result
is refreshed**: in the database, in application code, in a pre-computed rollup, or in an
external analytics engine.

The decision is load-bearing because every later vertical slice (PR-4 through PR-7) calls into
whatever is decided here, and because the **0083** isolation model only stays "free" if the
aggregation runs in a context where RLS already applies. Pulling raw events across the
application boundary to aggregate them in Node would mean re-deriving tenant scope by hand in
application code — exactly the posture **0083**/**0013** reject.

The Supabase baseline (**0012**) bounds the toolbox to Postgres + RLS + Auth: no external OLAP
store, no Realtime. Reports therefore refresh by **poll**, not by subscription (**0012**, and
the deferral recorded in **0079**).

## Decision Drivers

* **Isolation must stay implicit (0083/0013).** An aggregation that runs *as the user* inside
  Postgres inherits the RLS membership-join scope automatically; one that runs in application
  code must re-establish the tenant boundary itself.
* **Stay inside the Supabase Postgres baseline (0012).** No external analytics engine, no new
  infrastructure ADR.
* **Push computation to the data.** Set-based SQL over indexed columns beats shuttling
  thousands of raw event rows to Node to reduce them there — both for correctness and for the
  dense volumes the visualizations need.
* **Typed call surface.** Aggregations exposed as Postgres functions get generated TypeScript
  signatures via `gen:types` (**0015**), so the application calls them type-safely.
* **Demo honesty.** "Aggregations are real SQL" is a stated success criterion; the mechanism
  must be genuinely in-database, not simulated in the client.
* **Refresh by poll, not realtime (0012/0079).** Realtime is out of scope; results are
  recomputed on demand and cached client-side (TanStack Query).

## Considered Options

* **A — In-database SQL: views + set-returning functions**, invoked as Supabase RPC under the
  caller's RLS.
* **B — Application-layer aggregation:** fetch rows through the data client, reduce them in
  Node/TypeScript.
* **C — Pre-computed rollup tables / materialized views**, refreshed on a schedule (ETL).
* **D — External OLAP engine** (ClickHouse, DuckDB, a warehouse) alongside Postgres.

## Decision Outcome

Chosen option: **A — in-database SQL views and set-returning functions**, invoked as RPC under
the caller's RLS, because it is the only option that keeps the **0083** tenant isolation
implicit, stays wholly inside the **0012** baseline, and pushes set-based work to the data while
exposing a typed call surface via **0015**. B re-derives tenant scope in application code (the
**0013** anti-pattern) and moves large row sets across the boundary; C and D add refresh
machinery or an entire second datastore that the seeded-demo volume does not justify and that
**0012** would require a separate ADR to admit.

The strategy this record fixes:

* **Each aggregation is a Postgres object** — a `SQL`/`plpgsql` **set-returning function** (or a
  view where parameter-free) living in a `supabase/` migration: time-bucketed trend counts with
  an optional property breakdown, ordered-step funnel conversion with a window, cohort retention,
  and segment size/distribution. The function *is* the contract; the application never assembles
  aggregation SQL.
* **Run as the caller — `SECURITY INVOKER`, `search_path` pinned.** Aggregation functions
  execute under the invoking member's RLS, so the **0083** membership-join scope applies to the
  `events`/`profiles` they read. Tenant isolation is inherited, never re-stated.
* **Parameters are function arguments** — project, date range, interval, breakdown property,
  funnel steps, retention window, segment rules — so a slice's URL state (nuqs) maps directly to
  an RPC call. Results are typed through `gen:types` (**0015**).
* **Refresh by poll (0012/0079).** The application calls the RPC through `@supabase/ssr` and
  caches via TanStack Query; staleness is resolved by refetch/poll, never by a Realtime
  subscription.
* **Aggregation never lives in application code.** Widgets and features consume already-reduced
  rows; they own no reduction logic.

### Consequences

* Good, because tenant isolation is inherited from **0083** with zero per-query scoping code.
* Good, because set-based SQL over the PR-3 indexes handles dense volumes far better than
  Node-side reduction.
* Good, because the RPC signatures flow into `database.types.ts` (**0015**), giving the
  application a typed, drift-checked call surface.
* Good, because it stays entirely within the **0012** Supabase baseline — no second datastore,
  no new infrastructure decision.
* Good, because it delivers the "real SQL" showpiece honestly.
* Bad, because aggregation logic lives in SQL migrations — versioned and reviewed as SQL, and
  harder to unit-test than TypeScript; mitigated by per-function SQL tests (pgTAP or
  seeded-data assertions) on this record's call surface.
* Bad, because analytic expressivity is bounded by what is reasonable to express in SQL —
  acceptable for the demo's handful of dimensions, and a conscious limit rather than a defect.
* Bad, because results are recomputed per request (no materialized cache initially) — fine at
  seeded-demo volume; materialized rollups remain a future optimization that does **not** reopen
  the in-database-vs-application choice (it stays in Postgres).

### Confirmation

* Each aggregation function ships a **SQL test** (pgTAP or a seeded-fixture assertion) proving
  its math on known data; this is the risk-weighted coverage that replaces hand-written
  application aggregation.
* Functions are **`SECURITY INVOKER`** with a pinned `search_path`; the `supabase-rls-reviewer`
  confirms they read `events`/`profiles` under the caller's RLS and add no privilege-escalating
  path.
* `gen:types` regenerates the RPC signatures; CI fails on drift, continuously confirming the
  typed call surface.
* The diff-scoped reviewer confirms **no aggregation/reduction logic leaked into application
  code** (features/widgets consume reduced rows only).

## Pros and Cons of the Options

### A — In-database SQL: views + set-returning functions

Aggregations are Postgres functions/views, invoked as RPC under the caller's RLS.

* Good, because isolation is inherited from the **0083** RLS model — no application scoping.
* Good, because it stays inside the **0012** baseline with no new datastore.
* Good, because set-based computation is pushed to indexed data.
* Good, because the function signatures become typed via **0015**.
* Neutral, because the logic is SQL — powerful but a different test discipline (pgTAP).
* Bad, because there is no built-in materialized cache (recompute per call; acceptable here).

### B — Application-layer aggregation

Fetch event rows through the client and reduce them in Node/TypeScript.

* Good, because the logic is ordinary TypeScript, easy to unit-test.
* Bad, because it must re-derive tenant scope in application code — the **0013/0083**
  anti-pattern, one missed filter from a cross-tenant leak.
* Bad, because it moves large raw row sets across the boundary — slow and memory-heavy at the
  densities the demo needs.
* Bad, because it contradicts the "real SQL" thesis.

### C — Pre-computed rollup tables / materialized views

Aggregate ahead of time into rollup tables refreshed on a schedule.

* Good, because reads are cheap and constant-time.
* Neutral, because materialized views still live in Postgres (compatible with **0012**).
* Bad, because it adds refresh/ETL machinery and staleness semantics the seeded demo does not
  need, and a scheduler **0012** does not include.
* Bad, because it optimizes a problem (read latency at scale) the demo does not have yet — a
  premature complexity. Remains available later *within* option A.

### D — External OLAP engine

A dedicated analytics store (ClickHouse / DuckDB / warehouse) beside Postgres.

* Good, because it is purpose-built for high-volume analytical queries.
* Bad, because it leaves the **0012** baseline and demands its own infrastructure ADR, sync
  pipeline, and second isolation model.
* Bad, because it is wildly disproportionate to a seeded portfolio demo.

## More Information

This record builds directly on the **0083** event shape and isolation model and is consumed by
the PR-4 trends slice, the PR-5 funnel slice, the PR-6 retention cohort grid, and the PR-7
segmentation feature — each adds one SQL function under this strategy. The companion PR-1
records fix the ingestion contract (**0085**) that writes the events and the charting primitive (**0086**) that
renders the reduced rows. The refresh-by-poll posture follows **0012** and the realtime deferral
in **0079**; the typed call surface follows **0015**. The decision should be revisited only if
the demo adopts genuinely high-volume ingestion (which would reopen materialized rollups within
option A, or — at an extreme — option D under a new baseline ADR).

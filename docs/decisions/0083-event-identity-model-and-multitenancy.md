---
status: "accepted"
date: 2026-06-22
decision-makers: Yurii Anichkin
---

# Event & identity model and multitenancy

## Context and Problem Statement

CAPCOM is a multi-tenant product-analytics platform. Before any schema or RLS policy is
written (the PR-2 tenancy migration, the PR-3 events/profiles migration), the foundational
domain model must be decided: how tenants are structured, how isolation between them is
enforced, how role-based authorization layers on top, the identity model (the principal who
logs in versus the end-user whose behavior is tracked), and the canonical shape of an event.
Every later aggregation query, every chart, and every saved report inherits whatever is
decided here, so the cost of getting it wrong compounds across the whole roadmap.

The Supabase baseline (**0012**) fixes the toolbox: Postgres + RLS + Auth only — no Storage,
Edge Functions, or Realtime, and no external authorization service. **0013** already
established the security posture for single-tenant access: every user-facing query runs *as
the user* under RLS (`auth.uid()`), and the service-role key never reaches a user context.
**0016** established email/password authentication. This record extends those single-tenant
primitives onto a **per-tenant** model — it decides the isolation boundary, the authorization
model that composes over it, and the data shapes (`organization → project`, `membership`,
`profile`, `event`) the rest of the product is built from.

Two questions are genuinely contested and must be answered explicitly:

1. **What enforces tenant isolation?** A shared schema scoped by RLS, a schema or database per
   tenant, or application-layer filtering.
2. **Is the authenticated member the same entity as the tracked end-user?** Collapsing them
   into one table, or keeping `auth.users` (the member) and `profiles` (the tracked end-user)
   as distinct entities.

## Decision Drivers

* **Isolation enforced in the database, not the application.** Continue the **0013** posture:
  a tenant boundary that an application bug can cross is not a boundary. Defense in depth means
  the database is the authority on who may read what.
* **Stay inside the accepted Supabase baseline (0012).** No new infrastructure ADR: the model
  must be expressible in Postgres + RLS + Auth alone.
* **The domain genuinely separates two identities.** A *member* (who authenticates and reads
  dashboards) and a *profile* (the end-user whose events the product records) have different
  life cycles, key spaces, and access semantics. Conflating them is a category error that leaks
  into every later query.
* **RBAC composes over isolation, it does not replace it.** Four roles —
  `owner | admin | analyst | viewer` — gate *what a member may do* within a tenant they already
  belong to; they are a second predicate, not the isolation mechanism.
* **Later aggregations must inherit scope for free.** Trends, funnels, retention, and
  segmentation (later PRs) should never re-derive tenant scoping per query — the boundary must
  be ambient.
* **Demo honesty.** The architectural showpiece is *real* multitenancy and RBAC on real RLS;
  the mechanism must be production-shaped, not simulated.

## Considered Options

* **A — Shared schema, RLS scoped by a membership join** (every domain row carries
  `project_id`; policies read membership through a helper function).
* **B — Schema-per-tenant** (one Postgres schema per organization).
* **C — Database-per-tenant** (one database/project per organization).
* **D — Application-layer tenant filtering** (a `WHERE org_id = ?` discipline in application
  code; RLS off or permissive).

## Decision Outcome

Chosen option: **A — shared schema with RLS scoped through a membership join**, because it is
the only option that stays inside the **0012/0013** baseline, makes isolation a database
invariant rather than an application convention, scales to N tenants without a
migration-per-tenant, and lets every later aggregation inherit scope implicitly. Options B and C
multiply operational and migration cost per tenant for isolation the shared-schema option
already provides; option D puts the boundary in the one place **0013** forbids — application
code.

The composed model this record fixes:

* **Hierarchy — `organization (tenant) → project`.** Every domain entity (event, profile,
  segment, funnel, report, dashboard) belongs to a `project`; a `project` belongs to an
  `organization`. The organization is the tenant; the project is the analytics workspace.
* **Membership & RBAC — `membership(user_id, organization_id, role)`** with a Postgres `role`
  enum `owner | admin | analyst | viewer`. A member's access to a *project* derives from
  membership in that project's organization. Two `search_path`-pinned helper functions —
  `is_member(project_id)` and `has_role(project_id, role)` — encapsulate the
  project → organization → membership join so every RLS policy stays a readable one-liner
  (`USING (is_member(project_id))` for reads; `has_role(project_id, 'admin')` for privileged
  writes). The privilege check lives in exactly one place.
* **Identity split — `auth.users` (the member) ≠ `profiles` (the tracked end-user).** A
  `profile` is keyed by `distinct_id` *within a project* and is never a foreign key to
  `auth.users`. A member logs in and reads; a profile is a subject of analytics. The two never
  collapse into one table — this is the deliberate architectural signal, not an accident of
  normalization.
* **Event shape — `events(project_id, event_name text, distinct_id text, properties jsonb,
  ts timestamptz)`.** `distinct_id` is the conceptual link to a profile (not an `auth.users`
  FK); `properties` is schemaless `jsonb`, validated at the ingest boundary by Zod (**0017**,
  and the companion PR-1 ingestion-contract record), never trusted at rest. Concrete indexes
  (`(project_id, ts)`, `event_name`, `distinct_id`) are an implementation detail of the PR-3
  migration, not part of this decision.

Isolation is **deny-by-default**: RLS is enabled on every domain table, the `anon` role is
excluded, and the absence of a permissive policy means no access. The client never asserts
tenancy — the membership join, not a client-supplied `org_id`, is the authority.

### Consequences

* Good, because tenant isolation becomes a database invariant: an application-layer bug cannot
  read across tenants.
* Good, because every later query shares one mental model — scope is ambient via RLS, never
  re-derived per aggregation.
* Good, because RBAC and isolation are orthogonal and independently testable (a viewer in the
  right tenant ≠ any role in the wrong tenant).
* Good, because the identity split keeps analytics subjects free of authentication concerns and
  keeps `auth.uid()` meaning exactly one thing.
* Good, because it stays entirely within the accepted Supabase baseline — no new infrastructure
  decision is required.
* Bad, because every domain table must carry `project_id` and an explicit RLS policy; a
  forgotten policy is a silent leak — mitigated by deny-by-default, the RLS isolation tests on
  the membership critical path (PR-2), and the `supabase-rls-reviewer` pre-PR audit.
* Bad, because shared-schema carries per-row policy overhead and noisy-neighbor coupling —
  acceptable at seeded-demo volume and consciously outside the high-throughput-pipeline scope.
* Bad, because `jsonb properties` is schemaless at rest, so all typing and validation must
  happen at the ingest boundary (the companion ingestion-contract record), not in the database.
* Bad, because the helper functions are security-sensitive: `search_path` pinning is mandatory,
  a hardening obligation carried explicitly into the PR-2 migration.

### Confirmation

* **RLS isolation tests on the membership critical path** (PR-2) prove deny-by-default,
  cross-tenant denial, and role gating; reviewed by the `supabase-rls-reviewer` subagent before
  the PR — this is the risk-weighted path that loses CI e2e coverage during bootstrap, so it is
  audited here.
* **`gen:types`** regenerates `database.types.ts`; CI fails on drift, so the generated type
  surface continuously confirms the modeled shapes.
* **Structural proof of the identity split:** no foreign key from `events.distinct_id` or
  `profiles` to `auth.users`; the migration review checks this directly.
* **Helper hygiene:** the PR-2 migration pins `search_path` on `is_member` / `has_role`, and
  the reviewer confirms RLS is enabled with explicit table `GRANT`s and no `anon` access.

## Pros and Cons of the Options

### A — Shared schema, RLS scoped by a membership join

A single schema; every domain row carries `project_id`; RLS policies authorize through a
`search_path`-pinned membership-join helper. RBAC is a second predicate via `has_role`.

* Good, because isolation is enforced by the database, satisfying the **0013** posture.
* Good, because it stays wholly within the **0012** Postgres + RLS + Auth baseline.
* Good, because adding a tenant is a row insert, not a migration or a provisioning step.
* Good, because every later aggregation inherits scope implicitly — no per-query tenant logic.
* Good, because RBAC and isolation are orthogonal and independently testable.
* Neutral, because it requires discipline: every new table needs its `project_id` + policy.
* Bad, because a forgotten policy is a silent cross-tenant leak (mitigated by deny-by-default +
  isolation tests + reviewer).
* Bad, because per-row policy evaluation and shared-schema coupling cost more than physical
  separation at very high volume (out of demo scope).

### B — Schema-per-tenant

One Postgres schema per organization, tables duplicated per schema.

* Good, because isolation is physical and intuitive.
* Neutral, because RLS is still useful intra-schema for RBAC.
* Bad, because every schema change is a fan-out migration across all tenants.
* Bad, because cross-tenant analytics/ops queries become awkward, and connection/search_path
  juggling grows with tenant count.
* Bad, because adding a tenant is a DDL operation, not a row insert — operationally heavier than
  the demo (or most products at this stage) warrants.

### C — Database-per-tenant

A separate database (or Supabase project) per organization.

* Good, because isolation is maximal — a hard blast-radius boundary.
* Bad, because it leaves the single-project Supabase baseline (**0012**) and multiplies
  provisioning, connection, and migration cost per tenant.
* Bad, because shared product operations and the demo's single-deployment story become
  impractical.
* Bad, because it is wildly disproportionate to a seeded portfolio demo.

### D — Application-layer tenant filtering

No (or permissive) RLS; tenancy enforced by a `WHERE org_id = ?` convention in application code.

* Good, because it is the least up-front database work.
* Bad, because it puts the isolation boundary exactly where **0013** forbids it — in
  application code, one missed clause from a leak.
* Bad, because it cannot be confirmed by a database-level fitness function; correctness rests on
  reviewer vigilance over every query forever.
* Bad, because it contradicts the demo's whole thesis — *real* RLS multitenancy.

## More Information

This record fixes the data and isolation model that the three companion PR-1 records build on:
the aggregation-strategy record (trends/funnels/retention as Postgres views and set-returning
functions over this event shape), the ingestion-contract record (the Zod-validated `ingest`
route and per-project ingest key that writes these events), and the charting-primitive record.
It **extends 0013** (RLS-as-user) and **0016** (Supabase Auth) onto a per-tenant model and stays
within **0012** (the Postgres + RLS + Auth baseline) and **0017** (Zod as the validation
authority for `properties` at the ingest boundary). Structured-error semantics for the ingest
path are governed by **0019**.

It is realized by the PR-2 `create_tenancy` migration (`organizations`, `projects`,
`memberships`, the `role` enum, the `is_member` / `has_role` helpers, deny-by-default RLS, table
`GRANT`s) and the PR-3 `create_events_profiles` migration (`profiles`, `events`, indexes, RLS
through the project membership). The decision should be revisited if the demo ever needs
high-throughput ingestion (which would reopen the shared-schema-versus-partitioned trade-off) or
genuine per-tenant data residency (which would reopen options B/C).

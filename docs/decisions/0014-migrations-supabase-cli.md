---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Database migrations via the Supabase CLI

## Context and Problem Statement

With Supabase/Postgres adopted (**0012**) and authorization living in SQL Row-Level
Security policies (**0013**), the database schema is a first-class, security-relevant
artifact. The project must decide how schema changes are authored, versioned, applied, and
reproduced across local, CI, and production environments.

The choice also fixes the *source of truth* for the schema, which in turn feeds generated
types (**0015**). An ad-hoc approach — applying SQL by hand in a dashboard — would leave no
versioned history, no reproducible local database, and no way for CI to verify the schema,
so a disciplined migration workflow is required.

## Decision Drivers

* **Versioned schema in the repo** — every change reviewable and revertable via Git.
* **Reproducible environments** — a fresh local database must rebuild deterministically;
  CI must replay the same migrations.
* **Platform alignment** — the migration tool should be the one the Supabase platform
  (**0012**) natively understands, including RLS policies.
* **Single source of truth for types** — the schema produced here is what generates the
  TypeScript types in **0015**.

## Considered Options

* Supabase CLI migrations (timestamped SQL files under `supabase/`)
* Drizzle Kit migrations (schema-as-TypeScript)
* Prisma Migrate (Prisma schema DSL)

## Decision Outcome

Chosen option: "Supabase CLI migrations", because it is the platform-native workflow:
plain SQL migration files (including RLS policies) under `supabase/`, applied locally with a
database reset and replayed in CI. SQL keeps RLS and Postgres-specific constructs
first-class rather than abstracted behind an ORM DSL, and it leaves the SQL schema as the
unambiguous source of truth for type generation (**0015**). `npm run db:reset` rebuilds the
local database from migrations; CI replays them to verify reproducibility.

### Consequences

* Good, because schema changes are versioned, reviewable SQL with a deterministic replay
  path locally and in CI.
* Good, because RLS policies and Postgres features are expressed directly in SQL, with no
  ORM abstraction to fight.
* Good, because the SQL schema is a clean, single source of truth for generated types.
* Bad, because authors write SQL by hand rather than getting migrations inferred from a
  typed schema DSL.
* Bad, because there is no ORM-level type inference here — types come separately from the
  generation step (**0015**), not from the migration tool itself.

### Confirmation

Migration SQL lives under `supabase/migrations/`; `npm run db:reset` rebuilds the local
database; CI replays migrations and fails on error. RLS policies are present in migrations
and exercised by e2e tests (**0007**).

## Pros and Cons of the Options

### Supabase CLI migrations (chosen)

* Good, because it is platform-native and keeps RLS/SQL first-class.
* Good, because plain SQL is a clean source of truth for type generation.
* Bad, because migrations are authored as SQL, not inferred from a typed schema.

### Drizzle Kit

* Good, because schema-as-TypeScript gives end-to-end type inference and ergonomic queries.
* Neutral, because it can target Postgres and generate SQL migrations.
* Bad, because it introduces a second schema authority alongside Supabase's, and RLS/Postgres
  policy expression is less direct than hand-written SQL the platform already expects.

### Prisma Migrate

* Good, because the Prisma schema DSL and client are mature and well-documented.
* Bad, because Prisma's RLS and Supabase-auth integration is awkward, its runtime is heavier
  for serverless, and it competes with the platform's native migration model.

## More Information

Builds on **0012** (Supabase baseline) and **0013** (RLS policies expressed in these
migrations). The generated TypeScript types that consume this schema are decided in
**0015**; the local database tooling that runs `db:reset` is detailed in later
local-environment records.

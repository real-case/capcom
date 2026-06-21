---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Local Supabase stack via the Supabase CLI

## Context and Problem Statement

Following the official-CLI principle (**0021**), the project needs a local database to
develop and test against. The Supabase CLI can run the full Supabase stack locally in
Docker (Postgres, Auth, and the rest), or development could instead point at a shared remote
Supabase project.

The choice matters for isolation, reproducibility, and testing. End-to-end tests (**0007**)
need a database they can reset and seed without disturbing anyone else, and the migration
workflow (**0014**) is only reproducible if there is a local database to rebuild from
migrations. A shared remote, by contrast, means contributors mutate common state and cannot
work offline.

## Decision Drivers

* **Isolation** — each developer (and CI) needs a private database, not shared mutable
  state.
* **Reproducibility** — a local database must rebuild deterministically from migrations
  (**0014**).
* **Testability** — e2e tests (**0007**) need a resettable database with a known state.
* **Parity** — the local stack should match the production Supabase services it stands in
  for.

## Considered Options

* Local Supabase stack via the Supabase CLI (Docker)
* A shared remote Supabase development project

## Decision Outcome

Chosen option: "Local Supabase stack via the Supabase CLI", because it gives each developer
and CI an isolated, reproducible database that rebuilds from migrations and resets cleanly
for tests. The stack runs with `npx supabase start` / `npx supabase stop` (requires Docker);
`npm run db:reset` rebuilds it by applying migrations (**0014**). Local Supabase connection
values feed the app's environment in development (wired in **0024**), and e2e tests
(**0007**) run against this stack.

### Consequences

* Good, because development and tests run against an isolated database with no shared-state
  collisions.
* Good, because the local database is reproducible from migrations and resettable to a known
  state for tests.
* Good, because the same Supabase services run locally and in production, preserving parity.
* Bad, because it requires Docker locally, which is a non-trivial prerequisite and resource
  cost.
* Bad, because the local stack can lag the hosted platform's version, so the CLI must be kept
  reasonably current.

### Confirmation

`npx supabase start` brings the stack up; `npm run db:reset` applies migrations to it; e2e
tests (**0007**) connect to the local stack via `NEXT_PUBLIC_SUPABASE_*` set from `supabase
status`. CI runs migrations against this stack.

## Pros and Cons of the Options

### Local Supabase stack via CLI (chosen)

* Good, because it provides isolated, reproducible, resettable databases.
* Good, because it preserves local/production parity for Supabase services.
* Bad, because it requires Docker and CLI version upkeep.

### Shared remote development project

* Good, because there is nothing to install locally and no Docker requirement.
* Neutral, because it is quick to start using.
* Bad, because contributors share and can corrupt one database, offline development is
  impossible, and tests cannot freely reset state — undermining isolation, reproducibility,
  and testability all at once.

## More Information

Builds on **0012** (Supabase baseline), **0014** (migrations applied via `db:reset`), and
**0021** (official-CLI principle); it provides the database that e2e tests (**0007**) depend
on. The single entrypoint that starts this stack alongside the app and type generation is
decided in **0024**.

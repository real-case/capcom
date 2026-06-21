---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Generate TypeScript types from the Supabase schema

## Context and Problem Statement

The strict type policy (**0003**) is only as good as the types describing the data crossing
the app's most important boundary: the database. With migrations as SQL under the Supabase
CLI (**0014**), the schema is the source of truth — but TypeScript does not know about it
unless something bridges the two. The project must decide how database row, insert, and
update types reach the codebase, and how they stay in sync as the schema evolves.

The failure mode to avoid is *silent drift*: hand-maintained types that quietly diverge from
the real schema, so the compiler asserts guarantees that no longer hold. Whatever the
approach, it must make drift impossible to merge unnoticed.

## Decision Drivers

* **Single source of truth** — types must derive from the SQL schema (**0014**), not be
  maintained in parallel.
* **No silent drift** — divergence between types and schema must fail a check, not slip
  through.
* **Strict-typing payoff** — accurate DB types are what make the strict policy (**0003**)
  valuable at the data boundary.
* **Agent reliability** — generated, accurate types let an agent write correct queries
  without guessing column shapes.

## Considered Options

* Generate types via `supabase gen types typescript`, commit them, and drift-check in CI
* Hand-write database types alongside the schema
* Adopt an ORM (Drizzle/Prisma) and use its inferred types

## Decision Outcome

Chosen option: "Generate types with `supabase gen types typescript`, committed and
drift-checked", because it makes the SQL schema the single source of truth and turns drift
into a CI failure rather than a latent bug. An `npm run gen:types` script writes
`src/lib/supabase/database.types.ts`; the file is committed (so it is reviewable and
available without regenerating) and CI regenerates it and fails if the result differs from
what is checked in. The script is run after every migration (**0014**).

### Consequences

* Good, because database types always reflect the real schema, giving the strict policy
  (**0003**) real teeth at the data boundary.
* Good, because the committed file is reviewable in diffs and usable without a live database.
* Good, because the CI drift check makes stale types impossible to merge unnoticed.
* Bad, because contributors must remember to regenerate after a migration (mitigated by the
  CI check catching omissions).
* Bad, because a generated file in the repo produces sizable, occasionally noisy diffs.

### Confirmation

`npm run gen:types` produces `src/lib/supabase/database.types.ts`; the file is committed; CI
regenerates and fails on any difference. Query code imports these types rather than
redefining row shapes.

## Pros and Cons of the Options

### Generated, committed, drift-checked (chosen)

* Good, because types derive from the schema and drift fails CI.
* Good, because the committed artifact is reviewable and usable offline.
* Bad, because it relies on regeneration discipline (backstopped by CI) and adds diff noise.

### Hand-written types

* Good, because there is no generation step and full control over shapes.
* Bad, because hand types inevitably drift from the schema, asserting guarantees that have
  silently stopped being true — the exact failure this decision exists to prevent.

### ORM-inferred types (Drizzle/Prisma)

* Good, because the ORM infers query and row types end-to-end.
* Neutral, because it would give strong typing.
* Bad, because it conflicts with the chosen SQL-first migration model (**0014**) and would
  make the ORM, not the SQL schema, the type authority — re-opening a decision already made.

## More Information

Builds on **0003** (strict typing this serves), **0012** (Supabase), and **0014** (the SQL
schema that is the generation source). These generated types are consumed by the data-access
layer (**0013**) and by any feature querying the database.

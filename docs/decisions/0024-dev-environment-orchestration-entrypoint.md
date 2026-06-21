---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# A single `npm run dev` entrypoint orchestrating the local environment

## Context and Problem Statement

The local environment has several moving parts: the app via `next dev` (**0023**), the Supabase
stack via the CLI (**0022**), generated types from the schema (**0015**), and environment
variables that must be synced (`vercel env pull`) and resolved consistently (**0023**, **0018**).
Started ad hoc, in the wrong order, these parts disagree — the app boots before the database is
up, or against stale types, or with the wrong env. The project needs a single, deterministic
entrypoint that brings up a working, production-faithful environment in one command.

The package manager that runs this entrypoint is decided in **0005**; this record decides the
orchestration it performs.

## Decision Drivers

* **One command to a working environment** — contributors and the agent should reach a running,
  prod-faithful setup without remembering a sequence.
* **Deterministic startup order** — database up, then types generated, then env resolved, then
  the app — so nothing starts against stale or missing dependencies.
* **Production-faithful local dev** — the local stack mirrors what runs in CI and production.

## Considered Options

* A single orchestrated `npm run dev` entrypoint (e.g. `scripts/dev.mjs`)
* No orchestrator — a documented manual multi-step startup

## Decision Outcome

Chosen option: "a single orchestrated `npm run dev` entrypoint", because a single command removes
the ordering pitfalls of starting the parts by hand. The dev orchestrator (`scripts/dev.mjs`)
runs the sequence: bring up the local Supabase stack (**0022**) → generate types (**0015**) →
sync/resolve environment variables (`vercel env pull` when linked, **0023**; the env model is
**0018**) → start `next dev` (**0023**). It is run through the npm scripts established in
**0005**.

### Consequences

* Good, because a single command yields a deterministic, production-faithful local environment,
  lowering onboarding and agent friction.
* Good, because the fixed startup order means nothing boots against a missing database or stale
  types.
* Bad, because the orchestrator script is bespoke code that must be maintained as the
  environment evolves.

### Confirmation

`npm run dev` runs the orchestrator (Supabase up → `gen:types` → env sync/resolve → `next dev`),
verifiable in `scripts/dev.mjs` and `package.json`.

## Pros and Cons of the Options

### Orchestrated `npm run dev` entrypoint (chosen)

* Good, because it guarantees startup order and yields a one-command, prod-faithful setup.
* Bad, because the orchestrator is bespoke code to maintain.

### No orchestrator (manual steps)

* Good, because there is no bespoke script to maintain.
* Bad, because contributors must run several commands in the right order every time, which is
  error-prone and a frequent source of "it didn't work" — the exact friction this decision
  removes.

## More Information

Builds on **0005** (npm scripts), **0015** (the type-generation step), **0022** (the local
Supabase stack), **0023** (`next dev` + `vercel env pull`), and **0018** (the env/secrets model
the orchestrator resolves). The `npm ci` install and the gate commands this composes are consumed
by CI (**0010**).

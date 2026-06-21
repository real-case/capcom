---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Local development environment built on the official platform CLIs

## Context and Problem Statement

Developers — and the AI agent — need a local environment that faithfully reproduces
production: the Next.js app, the Supabase database, and the environment variables that wire
them together. The project depends on two managed platforms (Supabase for the backend
baseline, **0012**; Vercel for hosting), and each ships an official CLI that reproduces its
runtime locally.

The decision here is the *foundational principle*: do we build local parity on the
platforms' own maintained CLIs, or assemble a bespoke environment (hand-written
docker-compose, ad-hoc scripts), or skip local infrastructure and develop only against
shared cloud resources? The concrete pieces — how the app runs, how the database runs, how
they're orchestrated — follow in **0023**, **0022**, and **0024**.

## Decision Drivers

* **Production parity** — the local runtime should behave like the deployed one to avoid
  "works locally, breaks in prod."
* **Maintained, not bespoke** — platform CLIs track platform changes; hand-rolled
  environments rot and become a maintenance tax.
* **Reproducibility** — any contributor (or CI) must spin up the same environment
  deterministically.
* **Isolation** — local work must not mutate shared cloud state.

## Considered Options

* Build local dev on the official platform CLIs (Supabase CLI + Vercel CLI)
* Hand-rolled docker-compose and custom scripts
* Cloud-only development against shared remote resources (no local stack)

## Decision Outcome

Chosen option: "Build on the official platform CLIs", because they reproduce each
platform's runtime locally with tooling the platform vendor maintains, giving production
parity without bespoke infrastructure to keep alive. This record establishes the principle;
the specifics are decided in dependent records: running the app via `next dev` with the
environment synced through `vercel env pull` (**0023**), the local Supabase stack via the
Supabase CLI (**0022**), and the single entrypoint that orchestrates them with npm
(**0024**).

### Consequences

* Good, because local behavior closely matches production, since the same vendor tooling
  drives both.
* Good, because the platforms maintain their CLIs, so the environment tracks platform
  changes with little upkeep on our side.
* Good, because a local stack isolates development from shared cloud state.
* Bad, because the CLIs assume local prerequisites (notably Docker for Supabase), raising
  the baseline machine setup.
* Bad, because it ties the local workflow to two external tools whose versions must be kept
  reasonably current.

### Confirmation

The repository documents and scripts the Supabase and Vercel CLIs as the local toolchain;
**0023**, **0022**, and **0024** make the concrete commands real and reviewable. No bespoke
docker-compose is maintained for the app/database.

## Pros and Cons of the Options

### Official platform CLIs (chosen)

* Good, because they give vendor-maintained production parity.
* Good, because they isolate local from cloud state.
* Bad, because they require local prerequisites (Docker) and version upkeep.

### Hand-rolled docker-compose + scripts

* Good, because it offers full control over the local topology.
* Neutral, because it can approximate the platforms.
* Bad, because it must be hand-maintained to track platform behavior and drifts from
  production over time — exactly the maintenance tax the official CLIs avoid.

### Cloud-only against shared resources

* Good, because there is no local infrastructure to install.
* Bad, because contributors share and can corrupt the same database, offline work is
  impossible, and there is no isolated, reproducible environment for tests (**0007**).

## More Information

Builds on **0001** (ADR practice) and **0012** (the Supabase backend this environment runs
locally). The concrete app runtime, database stack, and orchestration entrypoint are decided
in **0023**, **0022**, and **0024**; the hosting platform whose CLI is used is recorded in
the hosting decision (**0009**).

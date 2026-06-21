---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# CI quality gate on GitHub Actions, with Vercel owning deploys

## Context and Problem Statement

The project needs an automated gate that runs the same checks locally and on every change
to a shared branch, so regressions are caught before merge rather than in production. Two
adjacent concerns must be separated: *continuous integration* (running type-checks, lint,
formatting, build, and tests) and *deployment* (building and serving the app to preview and
production URLs).

The hosting platform (Vercel, **0009**) provides Git-integrated build-and-
deploy on every push, so the open question is narrower: where do the *quality checks* run,
and how do they relate to the platform's own build? Duplicating the full build in two
places wastes time; skipping CI entirely leaves correctness unverified until deploy.

## Decision Drivers

* **Pre-merge correctness** — the gate must run before code lands on the integration
  branch, not only at deploy time.
* **Local/CI parity** — CI should run the *same* commands a developer runs locally, so
  green-local means green-CI.
* **Runtime parity** — CI must use the pinned Node 24 (**0004**) to match local and prod.
* **Clear ownership** — deployment is the hosting platform's job; CI should not duplicate
  it beyond a compile/build sanity check.

## Considered Options

* GitHub Actions quality gate; Vercel owns preview/production deploys
* Rely on Vercel's build as the only CI (no separate gate)
* A third-party CI (GitLab CI / CircleCI) running both checks and deploys

## Decision Outcome

Chosen option: "GitHub Actions quality gate; Vercel owns deploys", because it puts
correctness checks on the same platform as the source and pull requests while leaving
build-and-deploy to the platform that specializes in it. A `.github/workflows/ci.yml`
workflow runs on Node 24 and mirrors the local gate: `typecheck`, `lint`, `format:check`,
`build`, and `test:coverage` — the coverage-enforcing test run (**0008**), kept separate from
the fast `npm run test:unit` inner loop. Once the database tooling exists, the gate also replays
migrations, checks for generated-type drift, and runs Playwright e2e against a local Supabase
stack. Vercel
handles Git-integrated preview and production deploys. Requiring the CI status check before
merge is a human-configured branch-protection setting on the repository.

### Consequences

* Good, because regressions are caught on pull requests, before reaching the integration
  branch or production.
* Good, because the CI commands equal the local commands, so the gate is predictable and
  reproducible.
* Good, because deployment stays with Vercel, avoiding a duplicated, divergent deploy
  pipeline.
* Bad, because the build effectively runs twice (CI sanity build + Vercel deploy build),
  costing some minutes.
* Bad, because branch protection is a repo setting outside version control, so it must be
  configured and documented separately.

### Confirmation

`.github/workflows/ci.yml` exists, pins Node 24, and runs the gate commands. The local gate
`npm run typecheck && npm run lint && npm run format:check && npm run build && npm run test:coverage`
mirrors it. Coverage is enforced by the dedicated `npm run test:coverage` command — separate
from the fast `npm run test:unit` inner-loop runner (**0007**) — so sub-threshold coverage fails the
gate (**0008**). Branch protection requiring the CI check is verifiable in repository settings.

## Pros and Cons of the Options

### GitHub Actions gate + Vercel deploys (chosen)

* Good, because checks live next to code and PRs, with deploys handled by the specialist.
* Good, because local/CI command parity makes results predictable.
* Bad, because the build runs in both CI and Vercel.

### Vercel build as the only CI

* Good, because it is the least configuration — the platform already builds on push.
* Bad, because a successful build does not run type-checks, lint, or tests, so most
  regressions would pass unverified.
* Bad, because it gives no pre-merge gate on pull requests.

### Third-party CI doing checks and deploys

* Good, because it centralizes checks and deploys in one pipeline.
* Neutral, because it is a mature, capable approach.
* Bad, because it duplicates and competes with Vercel's native Git integration, adding
  configuration and drift for no benefit on this stack.

## More Information

Builds on **0009** (the Vercel hosting model this defers deployment to), **0004** (Node 24
pin reused by CI), **0006** (lint/format commands), and **0007** (the tests the gate runs).
The database migration replay and type-drift checks become active once the corresponding
records are implemented.

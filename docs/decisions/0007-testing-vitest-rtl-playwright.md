---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Testing with Vitest + React Testing Library (unit/component) and Playwright (e2e)

## Context and Problem Statement

The project needs a testing strategy fixed before feature code accumulates, because the
choice of test runner and the split between test levels are expensive to change once tests
exist. Two questions must be answered together: which tools run the tests, and what each
*level* of test is responsible for (fast unit/component tests vs slow end-to-end tests
exercising real flows through the browser and the database).

The stack shapes the answer: the App Router with React Server Components (**0002**) and a
Supabase-backed data layer mean some behavior — auth, row-level security, real navigation —
can only be validated end-to-end against a running app and database, while most logic and
component behavior is better covered by fast, isolated tests.

## Decision Drivers

* **Fast inner-loop feedback** — unit and component tests must run in seconds to be used.
* **Toolchain fit** — a Vite-native runner aligns with the modern ESM/TypeScript setup and
  avoids heavy transform configuration.
* **Real-flow coverage** — auth, RLS, and navigation need a true browser + database, not
  mocks, to be trustworthy.
* **CI integration** — every level must run non-interactively and gate merges (**0010**).
* **Risk-weighting** — limited testing effort should concentrate on security- and
  money-critical paths.

## Considered Options

* Vitest + React Testing Library for unit/component, Playwright for e2e
* Jest + React Testing Library for unit/component, Cypress for e2e
* Vitest + React Testing Library only (no end-to-end layer)

## Decision Outcome

Chosen option: "Vitest + React Testing Library + Playwright", because Vitest gives
fast, Vite-native unit/component testing with minimal config, React Testing Library
encourages user-facing component assertions, and Playwright covers the flows that only a
real browser + database can validate. Unit/component tests live alongside source
(`src/**/*.test.tsx`); e2e specs live under `e2e/`. Coverage is risk-weighted: auth, RLS,
and any payment/critical flows get end-to-end tests first; the rest gets unit/component
coverage. Tests are wired into the CI gate (**0010**).

### Consequences

* Good, because the fast layer (Vitest) keeps the inner loop quick while Playwright catches
  integration regressions the fast layer cannot.
* Good, because Vitest shares the project's Vite/ESM/TS configuration, minimizing transform
  setup.
* Good, because Playwright runs real browsers and can drive the app against a local
  Supabase stack, validating RLS and sessions for real.
* Bad, because maintaining two runners and an e2e harness is more setup and CI time than a
  single tool.
* Bad, because e2e tests are slower and more flake-prone, requiring care (and a running
  database) to keep reliable.

### Confirmation

`npm run test` runs `vitest run` (the full Vitest run); the fast jsdom-only inner loop is
`npm run test:unit`. Coverage is enforced separately in CI through the dedicated
`npm run test:coverage` command (**0008**). `npm run test:e2e` runs
Playwright against a production build with the local Supabase stack up. The coverage and e2e
runs are part of the CI quality gate (**0010**).

## Pros and Cons of the Options

### Vitest + RTL + Playwright (chosen)

* Good, because Vitest is fast and shares the Vite/TS config.
* Good, because Playwright is a robust, multi-browser e2e tool with strong tracing.
* Neutral, because it is two runners to maintain.
* Bad, because e2e adds CI time and flake surface.

### Jest + RTL + Cypress

* Good, because Jest and Cypress are mature and widely documented.
* Neutral, because RTL works identically on either runner.
* Bad, because Jest needs extra transform configuration for ESM/TS/Vite-style projects,
  and Cypress's architecture is heavier than Playwright for multi-browser CI.

### Vitest + RTL only (no e2e)

* Good, because it is the simplest, fastest setup.
* Bad, because auth, RLS, and real navigation cannot be validated without an end-to-end
  layer — exactly the highest-risk behavior in this stack would go untested.

## More Information

Builds on **0001** (ADR practice), **0002** (RSC model under test), and **0006** (lint runs
in the same gate). The CI workflow that runs these levels is decided in **0010**; the local
Supabase stack the e2e tests depend on is decided in a later record.

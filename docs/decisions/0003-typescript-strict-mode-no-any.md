---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# TypeScript in strict mode, with `any` disallowed

## Context and Problem Statement

The project must choose its authoring language and, if typed, *how strict* the type
system is. TypeScript's guarantees are not a single setting — they range from
near-JavaScript permissiveness to aggressive compile-time checking, governed by
`tsconfig.json` compiler flags and lint rules — and the level is hard to raise later:
tightening flags on an existing codebase surfaces a backlog of errors all at once,
whereas starting strict keeps the codebase clean from the first file.

This matters especially because an AI agent writes much of the code; the compiler is the
cheapest, most immediate feedback loop catching mistakes before they reach review or
runtime. What language and strictness level should the project adopt?

## Decision Drivers

* **Compile-time safety as the first feedback loop** — catch errors at authoring time,
  not in review or production; this is most valuable when an agent generates code.
* **Refactor confidence** — strong types make wide, mechanical refactors safe.
* **Server/client boundary correctness** — RSC serialization and Supabase row types
  benefit from precise typing (see **0002**).
* **No silent escape hatches** — `any` erases type information transitively and hides
  exactly the bugs the type system exists to catch.

## Considered Options

* `strict: true` plus extra safety flags, with `any` disallowed via lint
* `strict: true` only (default strict family, `any` permitted)
* Loose / incremental typing (`strict: false`, opt-in tightening later)
* Plain JavaScript (no static type checking)

## Decision Outcome

Chosen option: "`strict: true` plus extra safety flags, with `any` disallowed via lint",
because it maximizes the compiler's ability to catch errors at authoring time — the
highest-value feedback loop for agent-written code — and a greenfield project pays no
migration cost to start at the strictest setting. The configuration enables `strict: true`
together with `noUncheckedIndexedAccess` and `noImplicitOverride`; the
`@typescript-eslint/no-explicit-any` rule (wired in the linting decision **0006**) forbids
`any`, steering toward `unknown` with narrowing instead.

### Consequences

* Good, because the broadest class of type errors is caught before code review or runtime.
* Good, because `noUncheckedIndexedAccess` forces handling of possibly-absent array and
  record entries — a common source of runtime crashes.
* Good, because banning `any` keeps type information intact across boundaries.
* Bad, because strict settings occasionally demand extra annotations or narrowing for
  code that is "obviously" fine, costing some authoring time.
* Bad, because third-party libraries with weak or wrong types require explicit `unknown`
  handling or narrow, well-justified escape hatches.

### Confirmation

`tsconfig.json` carries `strict: true`, `noUncheckedIndexedAccess`, and
`noImplicitOverride`. `tsc --noEmit` runs as part of the quality gate in CI (see the
testing/CI decisions). The `no-explicit-any` lint rule fails the lint step on violations.

## Pros and Cons of the Options

### strict + extra flags, no `any` (chosen)

* Good, because it provides the strongest compile-time guarantees from day one.
* Good, because greenfield adoption avoids the error backlog that tightening later incurs.
* Neutral, because it asks for occasional extra annotations.
* Bad, because weakly-typed dependencies need deliberate handling.

### strict: true only

* Good, because it enables the core strict family with less friction than the extra flags.
* Neutral, because it still permits `any`, leaving an easy escape hatch.
* Bad, because permitted `any` erodes safety transitively and tends to spread once
  tolerated.

### Loose / incremental

* Good, because it imposes the least friction up front.
* Bad, because deferring strictness guarantees a painful, error-laden migration later.
* Bad, because it gives the agent the weakest possible compile-time signal exactly when a
  strong one is most useful.

### Plain JavaScript

* Good, because it removes the compile step and all annotation overhead.
* Bad, because it forfeits the compile-time feedback loop entirely — the cheapest
  error-catching signal available to an agent-heavy workflow.
* Bad, because the surrounding ecosystem (Next.js scaffolding, Supabase's generated
  database types, the typed libraries adjacent records assume) is TypeScript-first, so
  opting out works against the grain of every neighboring tool.

## More Information

Builds on **0001** (ADR practice) and **0002** (the App Router / RSC model whose
boundaries benefit from precise types). The `any` prohibition is enforced by the linting
configuration decided in **0006**.

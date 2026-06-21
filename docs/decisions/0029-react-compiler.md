---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Adopt the React Compiler for automatic memoization

## Context and Problem Statement

In React, avoiding unnecessary re-renders has traditionally meant scattering manual
memoization through components — `useMemo`, `useCallback`, `React.memo` — with hand-written
dependency arrays. This is boilerplate that clutters components, obscures their actual logic
behind optimization machinery, and is easy to get wrong: stale or missing dependencies,
over-memoizing trivial values, or under-memoizing hot paths.

The React Compiler analyzes components at build time and inserts memoization automatically,
so this manual work becomes largely unnecessary. The project must decide whether to adopt it,
and what that implies for how components are written (the compiler relies on components
following the Rules of React) and for the manual-memoization guidance elsewhere in the
codebase (**0028**).

## Decision Drivers

* **Cleaner, more readable code** — remove memoization boilerplate so components express
  logic, not optimization scaffolding.
* **Fewer memoization bugs** — automatic, correct memoization avoids stale/missing-dependency
  mistakes and mis-applied `memo`.
* **Performance by default** — components are memoized correctly without per-site effort or
  reactive profiling.
* **Stack fit** — integrates with Next.js (**0002**) and React 19, and its correctness rests
  on the Rules of React, enforceable by the ESLint setup (**0006**).

## Considered Options

* Adopt the React Compiler (build-time automatic memoization)
* Manual memoization — `useMemo` / `useCallback` / `React.memo` applied by hand where needed
* No memoization discipline — rely on cheap renders and optimize only reactively

## Decision Outcome

Chosen option: "Adopt the React Compiler", because it removes manual memoization as a
day-to-day concern — yielding cleaner components and eliminating a whole class of
dependency-array bugs — while improving render performance by default. It is enabled through
the Next.js configuration (the React Compiler plugin / `reactCompiler` option) and works with
the React 19 the App Router uses (**0002**). Manual `useMemo` / `useCallback` / `React.memo`
are removed from the codebase, kept only in rare, documented cases the compiler cannot cover
(e.g. an explicit `"use no memo"` escape hatch). Components must follow the Rules of React,
which the compiler depends on; the React Compiler ESLint rule (part of the lint setup,
**0006**) flags violations. This makes manual memoization the exception rather than the norm,
and narrows the scope of **0028** accordingly — memoization is now the compiler's job, while
**0028** governs only concurrency scheduling (`useTransition` / `useDeferredValue`).

### Consequences

* Good, because removing memoization boilerplate makes components read as their logic, not as
  optimization plumbing — the explicit goal here.
* Good, because automatic memoization eliminates stale/missing-dependency and
  over/under-memoization bugs.
* Good, because correct memoization is applied broadly with no per-component effort.
* Bad, because correctness requires strict adherence to the Rules of React — impure renders,
  prop/state mutation, or conditional hooks can be silently skipped by the compiler or
  misbehave — so the ESLint rule (**0006**) is essential, not optional.
* Bad, because it is a relatively new compiler; some third-party patterns or edge cases may
  need the `"use no memo"` opt-out, and debugging compiled output is less familiar.
* Bad, because it adds a build-time transform (compile cost) and a tooling dependency.

### Confirmation

The Next.js config enables the React Compiler; the React Compiler ESLint rule is active
(**0006**) and the gate (**0010** via **0006**) fails on Rules-of-React violations; new code
does not introduce manual `useMemo` / `useCallback` / `React.memo` without a documented reason
(or a localized `"use no memo"`), and existing manual memoization is removed where the
compiler covers it.

## Pros and Cons of the Options

### React Compiler (chosen)

* Good, because it auto-memoizes correctly, cleaning up code and removing memoization bugs.
* Good, because performance gains apply by default across the app.
* Bad, because it requires Rules-of-React compliance, is relatively new, and adds build cost.

### Manual memoization

* Good, because it is explicit, needs no compiler, and gives full control over what is
  memoized.
* Neutral, because it is the long-established approach.
* Bad, because it is exactly the boilerplate-and-bugs problem this decision removes:
  dependency arrays drift, `memo` is mis-applied, and optimization clutters every hot
  component.

### No memoization discipline

* Good, because it is the simplest model with no compiler and no memo noise.
* Bad, because genuine re-render performance problems go unaddressed, and reactive,
  case-by-case optimization is ad hoc and regresses as the app grows.

## More Information

Builds on **0002** (Next.js / React integration) and **0006** (the ESLint rule enforcing the
Rules of React the compiler depends on). It is distinct from **0028**: the React Compiler
handles **memoization** (what to recompute), whereas the concurrency primitives of **0028**
(`useTransition` / `useDeferredValue`) handle **scheduling/priority** (when to render) — the
compiler does not replace them. **0028** is updated to reflect that manual memoization is now
the compiler's job, not a hand-applied tool.

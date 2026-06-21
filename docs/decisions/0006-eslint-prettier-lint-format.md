---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# ESLint (flat config) and Prettier for linting and formatting

## Context and Problem Statement

The project must choose its linting and formatting toolchain. The decisions are coupled:
which linter to adopt and how it is configured (for ESLint, the modern flat config vs the
legacy `.eslintrc`), and how code *formatting* is handled — a linter and a dedicated
formatter overlap, and running both naively produces conflicting rules that fight each
other on every save.

The split between *correctness linting* (catching bugs and enforcing conventions) and
*formatting* (whitespace, quotes, line width) needs an explicit, conflict-free division of
labor so the toolchain is deterministic in the editor and in CI. How should the project
lint and format code?

## Decision Drivers

* **Next.js integration** — the framework ships an ESLint config (`eslint-config-next`)
  that encodes App-Router and React best practices.
* **No rule conflicts** — formatting and linting must not contradict each other.
* **Clear separation of concerns** — correctness rules and stylistic formatting are
  different jobs with different tools-of-record.
* **Autofix and a CI gate** — both must run non-interactively and fail CI on violation.
* **Supports the type policy** — the lint layer enforces `no-explicit-any` from **0003**.

## Considered Options

* ESLint flat config + Prettier, with `eslint-config-prettier` to disable conflicting rules
* ESLint flat config with ESLint Stylistic (no separate formatter)
* Biome (single tool for both lint and format)

## Decision Outcome

Chosen option: "ESLint flat config + Prettier, with `eslint-config-prettier`", because it
keeps each tool on the job it does best — ESLint for correctness (including the
`@typescript-eslint/no-explicit-any` rule that enforces **0003**), Prettier as the
single formatter of record — and `eslint-config-prettier` removes the overlap so the two
never conflict. ESLint uses the flat config (`eslint.config.*`) composing
`eslint-config-next` and the TypeScript ESLint rules; Prettier owns all formatting.

### Consequences

* Good, because formatting is fully delegated to Prettier, so there are no whitespace
  debates and no rule fights.
* Good, because `eslint-config-next` brings framework-aware correctness rules for free.
* Good, because the flat config is the actively developed ESLint configuration model.
* Bad, because it is two tools and two config surfaces to install and keep in sync rather
  than one.
* Bad, because contributors must run (or have editors run) both, and CI must check both.

### Confirmation

`npm run lint` runs ESLint and `npm run format:check` runs Prettier in check mode; both
are part of the CI quality gate. `eslint-config-prettier` is present in the flat config so
no formatting rule is active in ESLint. A violation of `no-explicit-any` fails `npm run
lint`.

## Pros and Cons of the Options

### ESLint flat + Prettier + eslint-config-prettier (chosen)

* Good, because each tool does what it is best at, with overlap explicitly disabled.
* Good, because Prettier is the de-facto formatting standard with broad editor support.
* Neutral, because it is two tools to configure.
* Bad, because both must be wired into editors and CI.

### ESLint flat + ESLint Stylistic (no Prettier)

* Good, because it is a single tool covering both lint and format.
* Neutral, because ESLint Stylistic revives stylistic rules ESLint had deprecated.
* Bad, because ESLint is slower and less ergonomic as a formatter than Prettier, and
  format-on-save support is weaker.

### Biome

* Good, because it is a single, very fast Rust tool for both lint and format.
* Neutral, because its formatting is close to Prettier's.
* Bad, because its plugin ecosystem is narrower and it has no equivalent of
  `eslint-config-next`, so the framework-aware App-Router rules would be lost.

## More Information

Builds on **0001** (ADR practice), **0002** (Next.js, source of `eslint-config-next`), and
**0003** — this record's lint layer is where the `no-explicit-any` prohibition from
**0003** is actually enforced. The commands defined here (`npm run lint`,
`npm run format:check`) become part of the CI quality gate decided later.

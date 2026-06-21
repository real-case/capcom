---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Interaction-testing standard: mandatory play functions with @storybook/test

## Context and Problem Statement

CSF 3 stories (**0036**) support a `play` function — code that runs after the story renders,
driving interactions (clicks, typing, selection) and asserting the resulting DOM. With the
execution engines from **0037**, a `play` function *is* an executed test (in the browser-mode
addon and in the test-runner smoke pass). For the most comprehensive component testing, the
open question is *when* a story must carry a `play` function and *what* it asserts — otherwise
stories document appearance but never exercise behavior.

## Decision Drivers

* **Behavior coverage, not just render** — interactive components must be tested *doing* their
  job (open, type, toggle, submit), not merely mounting.
* **Reuse of Testing Library idioms** — interactions should be written with the same
  user-centric API as the RTL layer (**0007**) to keep one mental model.
* **Callback verification** — handlers passed as props (`onChange`, `onSubmit`, …) must be
  provably called, not assumed.
* **Engine fit** — the standard must run unchanged on both engines in **0037**.
* **Strict typing** — interaction code stays under strict TypeScript with no `any` (**0003**).

## Considered Options

* Mandatory `play` for every interactive component, authored with `@storybook/test`
* `play` optional / authored ad-hoc when someone feels like it
* No `play` in stories — interaction tested only in the RTL layer (**0007**), stories stay
  render-only

## Decision Outcome

Chosen option: "Mandatory `play` functions with `@storybook/test`", because it makes behavioral
coverage a property of the component catalogue itself rather than an afterthought. **Every
component with interactive behavior** — inputs, buttons with side effects, toggles, menus,
dialogs, and forms (**0020**) — ships at least one story whose `play` function drives the UI
with `userEvent` and asserts post-interaction DOM via `expect` / `within`, and uses `fn()`
spies to prove that callback props were invoked with the expected arguments. The toolkit is
`@storybook/test` (in the Storybook 10 line, imported from `storybook/test`): Testing Library
plus Vitest-compatible matchers, instrumented so each step is visible in the Storybook UI and
executed by the engines in **0037**. **Purely presentational components are exempt** — a render
story (with `args`) is sufficient, and forcing an empty `play` on them would be noise.

### Consequences

* Good, because interactive behavior is actually exercised — the catalogue proves components
  *work*, and the same `play` runs as a test in both engines (**0037**).
* Good, because callbacks are verified with `fn()` spies, so broken wiring fails a test rather
  than slipping through.
* Good, because `userEvent`/`within` mirror the RTL idioms (**0007**), so there is one
  interaction-testing mental model across layers.
* Bad, because authoring `play` functions is real effort on top of writing the story.
* Bad, because `play` functions that race async UI can be flaky, requiring `waitFor`/`findBy`
  discipline to stay reliable.

### Confirmation

Interactive components (per the scope above) have at least one story with a `play` function;
interaction is driven by `userEvent` and asserted with `expect`/`within` from `@storybook/test`;
callback props are passed `fn()` spies and asserted. These stories execute as tests under the
**0037** engines and contribute to the **0008** coverage. Presentational-only components carry
render stories without `play`.

## Pros and Cons of the Options

### Mandatory play with @storybook/test (chosen)

* Good, because behavioral coverage becomes a guaranteed property of every interactive
  component, executed by **0037**.
* Good, because `fn()` spies verify callbacks and the API matches RTL (**0007**).
* Neutral, because it adds authoring effort proportional to interactivity.
* Bad, because async-racing `play` functions can flake without `waitFor` discipline.

### Optional / ad-hoc play

* Good, because it is low-ceremony and lets authors add interaction tests where they see value.
* Bad, because coverage becomes uneven and unpredictable — exactly the gaps that defeat a
  "most comprehensive" goal, with no rule to point to in review.

### Interaction only in RTL, stories render-only

* Good, because it keeps a single place (RTL) for behavior and stories purely for appearance.
* Bad, because it forfeits the stories-as-tests reuse (**0035**/**0037**): the interaction
  fixtures and the documentation fixtures diverge, and the test-runner smoke pass exercises
  no behavior.

## More Information

Builds on **0036** (CSF 3 object stories that host `play`), **0037** (the engines that execute
`play`), **0035** (stories-as-tests), **0007** (shared Testing Library idioms and the
RTL boundary), **0003** (strict typing of interaction code), and **0020** (forms are a primary
interaction surface). The accessibility checks layered over the same stories are decided in
**0039**. Targets the Storybook 10 `storybook/test` package; revisit if that API changes.

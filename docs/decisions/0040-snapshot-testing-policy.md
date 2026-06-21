---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Snapshot-testing policy: serialized DOM snapshots via Vitest, addon-storyshots rejected

## Context and Problem Statement

The last story-testing modality to settle is snapshots: serializing a story's rendered DOM and
comparing it against a stored baseline to catch *unintended* structural changes. The historical
tool for this — `@storybook/addon-storyshots` — is deprecated and was removed in Storybook 8, so
its mechanism cannot simply be carried forward. With the engines from **0037**, snapshots can
instead be produced from stories through Vitest. For the most comprehensive component testing,
this record decides whether serialized DOM snapshots are adopted and by what mechanism — and is
careful to keep them distinct from *pixel/visual* regression, which is a separate concern.

## Decision Drivers

* **Backstop against accidental markup change** — a cheap net that flags DOM changes nobody
  intended, across every story state.
* **No deprecated tooling** — the mechanism must not depend on the removed storyshots addon.
* **Reuse the Vitest snapshot mechanism** — snapshots should ride the Vitest machinery already
  in **0007** / **0035**, not a new tool.
* **Signal over noise** — DOM snapshots are notoriously churny; the policy must scope them so
  they catch real regressions instead of training reviewers to rubber-stamp updates.
* **Clear boundary** — serialized-DOM snapshots are *not* a substitute for interaction
  (**0038**), accessibility (**0039**), or pixel-level visual regression.

## Considered Options

* Serialized DOM snapshots produced via Vitest (reusing stories), with `addon-storyshots`
  rejected
* `@storybook/addon-storyshots` (the historical approach)
* No snapshot tests at all

## Decision Outcome

Chosen option: "serialized DOM snapshots via Vitest, storyshots rejected", because it adds a
structural backstop on the broadest possible set of states while reusing the existing test
stack and avoiding the removed addon. Snapshots are produced in the Vitest addon run (**0037**)
— or, where a bespoke assertion is wanted, via `composeStories` + `toMatchSnapshot` in a
colocated test (**0007**) — capturing the serialized DOM of story states as a net for changes
no one intended. **`@storybook/addon-storyshots` is rejected** as deprecated and removed in
Storybook 8. The policy is deliberately scoped: snapshots target **stable, structural
components** and are kept **small and focused** to limit churn; they **do not replace**
interaction (**0038**) or accessibility (**0039**) testing, and **pixel/visual regression is a
separate, deferred decision**, not this one. Snapshot baselines are updated only as a
**reviewed action** (`vitest -u` in a PR), never blindly.

### Consequences

* Good, because accidental DOM/markup changes are caught cheaply across all story states,
  completing the "structural" dimension of comprehensive coverage.
* Good, because it reuses Vitest's snapshot mechanism (**0007**/**0035**) and adds no
  deprecated dependency.
* Good, because scoping to stable structural components keeps the signal-to-noise high enough
  to be worth running.
* Bad, because serialized DOM snapshots are inherently low-signal — they fail on *any* markup
  change, including intended ones, so they generate churn.
* Bad, because the `-u` update path invites rubber-stamping; the "reviewed update" rule is a
  convention that depends on reviewer discipline to hold.

### Confirmation

Snapshots are generated from stories via Vitest (addon run or `composeStories` +
`toMatchSnapshot`); there is **no** `@storybook/addon-storyshots` dependency; snapshot scope is
limited to stable structural components; baseline updates appear as reviewed diffs in the PR
(**0011**, **0010**). Pixel/visual regression is absent here by design.

## Pros and Cons of the Options

### Serialized DOM snapshots via Vitest (chosen)

* Good, because it is a cheap structural backstop over every story state, on the existing Vitest
  stack.
* Good, because it carries no deprecated dependency.
* Neutral, because its value is bounded — a net for accidents, not a behavioral or visual check.
* Bad, because DOM snapshots are churny and the `-u` path can be rubber-stamped.

### addon-storyshots

* Good, because it was historically the turnkey "snapshot every story" tool.
* Bad, because it is deprecated and was removed in Storybook 8 — adopting it would build on a
  dead dependency.

### No snapshot tests

* Good, because it avoids snapshot churn entirely.
* Bad, because accidental structural changes have no automated backstop, leaving a gap against a
  "most comprehensive" goal that the other modalities (**0038**, **0039**) do not fill.

## More Information

Builds on **0035** / **0037** (the Vitest addon that produces snapshots from stories), **0007**
(the Vitest snapshot mechanism and the `composeStories` fixture path), **0036** (the CSF 3
stories serialized), and is gated in CI alongside the others (**0010**); baseline diffs are
reviewed under the git workflow (**0011**). It explicitly **defers pixel/visual regression**
(e.g. Chromatic or Playwright screenshot snapshots) to its own future record — serialized DOM
snapshots and image snapshots are different tools for different regressions. Revisit if DOM
snapshot churn outweighs its catch rate, in which case this modality could be narrowed or
dropped in favor of visual regression.

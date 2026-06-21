<!--
Every PR needs human approval (ADR 0047/0048). Commit/PR attribution convention
(trailers, labels) is left to your project — the template mandates none (ADR 0046).
-->

## What & why

<!-- Summary of the change and the motivation. Cite the ADR(s) it implements. -->

## Component stories — meaningful-states checklist (ADR 0042)

> Only applies to PRs that add or change components under `src/components/**`. The CI
> `check:stories` job proves a stories file _exists_; this checklist is the human
> judgment on whether it covers the component's **meaningful states**. Tick what
> applies, strike through (`~~…~~`) what genuinely does not.

- [ ] **default** + every visual **variant / size**
- [ ] **interactive** states — disabled, loading, focus/active where they render differently
- [ ] **data-edge** states — empty, error, long-content / overflow / truncation
- [ ] **theme / locale** axes — dark mode (ADR 0033) and RTL / localized content (ADR 0030) where the component renders differently
- [ ] interactive components carry a `play` function driving the UI with `userEvent` and asserting via `expect`/`within`, with `fn()` spies on callback props (ADR 0038)
- [ ] a11y opt-outs (if any) are explicit per-story `a11y` parameters with a stated reason — never a silent disable (ADR 0039)

## Verification

<!-- Which gates were run locally and their result. -->

- [ ] `npm run typecheck`
- [ ] `npm run lint`
- [ ] `npm run format:check`
- [ ] `npm run build`
- [ ] `npm run test:coverage` (merged ≥80%, ADR 0008/0041)
- [ ] `npm run check:stories` (ADR 0042 existence)

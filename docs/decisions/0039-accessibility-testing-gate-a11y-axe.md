---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Accessibility testing as a gate: addon-a11y + axe-core, failing on violations (WCAG 2.2 AA)

## Context and Problem Statement

The component layer is built on Radix via shadcn/ui (**0034**), which gives an accessibility
baseline (focus management, ARIA, keyboard nav) — but *composition and usage* can still
introduce WCAG violations: missing labels, insufficient contrast, wrong roles, broken
name/role/value. Storybook's `@storybook/addon-a11y` runs axe-core against each story, and with
the browser-mode Vitest engine from **0037** those results can be made to *fail* the test run.
For the most
comprehensive component testing, this record decides whether accessibility is an enforced gate
and at what conformance level.

## Decision Drivers

* **Accessibility as enforced quality, not advice** — violations should break the build, not
  sit unread in a panel.
* **Every state checked** — a11y should be evaluated on each story (each variant/state), reusing
  the catalogue already written (**0036**), not on a hand-picked few.
* **Engine reuse without duplication** — axe should run through an engine already fixed in
  **0037**, not as a separate manual step — and in exactly one of them, honoring **0037**'s
  rule that no assertion suite is duplicated across the two.
* **Contrast ties to tokens** — color-contrast outcomes depend on the design tokens (**0033**)
  being defined to AA, so the gate and the token layer reinforce each other.
* **CI fit** — the check must run non-interactively in the quality gate (**0010**).

## Considered Options

* `@storybook/addon-a11y` running axe-core, configured to **fail** the run, targeting WCAG 2.2
  AA
* a11y advisory-only — the addon panel reports issues but nothing fails
* No accessibility tooling — rely on Radix's baseline (**0034**) alone

## Decision Outcome

Chosen option: "addon-a11y + axe-core as a failing gate at WCAG 2.2 AA", because it turns
accessibility into an automatically enforced property of every component state rather than a
hope resting on Radix. `@storybook/addon-a11y` runs axe-core against every story and is
configured so that violations **fail** the browser-mode Vitest addon run. Per **0037**, axe
executes in exactly one engine — the browser-mode addon; the test-runner keeps its
smoke-only role (render + play) and carries no axe hook, so no assertion suite is duplicated
across the engines. The conformance target is
**WCAG 2.2 level AA**. Color-contrast checks lean on the design tokens (**0033**) being chosen
to meet AA, so the token layer and this gate are co-designed. A per-story opt-out exists only as
an **explicit, reviewed `a11y` parameter with a documented reason** (e.g. a known upstream
issue), never as a silent global disable — so exceptions are visible and auditable.

### Consequences

* Good, because accessibility regressions are caught automatically on every component state, on
  the stories already authored — no separate a11y test suite to maintain.
* Good, because it runs through the single browser-mode engine fixed in **0037**, so a11y
  results live in one place with no duplicated suite to keep in sync.
* Good, because tying contrast to the AA-defined tokens (**0033**) means the gate and the design
  system enforce the same bar.
* Bad, because axe is *necessary but not sufficient* — automated checks catch a subset of WCAG;
  keyboard-only flows and semantics still need human review, so the gate must not be mistaken
  for full conformance.
* Bad, because axe can flag third-party or intentional markup, so a sanctioned, explicit
  opt-out path and triage discipline are required to avoid the gate being globally disabled out
  of frustration.

### Confirmation

`@storybook/addon-a11y` is configured to error (not warn); the browser-mode Vitest run
(**0037**) fails on axe violations while the test-runner config carries no axe hook; the
conformance config targets WCAG 2.2 AA; opt-outs appear only as explicit
per-story `a11y` parameters with a stated reason and survive review. The check runs in the CI
gate (**0010**).

## Pros and Cons of the Options

### addon-a11y + axe as a failing AA gate (chosen)

* Good, because a11y becomes enforced on every state, reusing the stories and the
  browser-mode engine from **0037**.
* Good, because it co-designs with the AA design tokens (**0033**).
* Neutral, because it adds triage work for legitimate exceptions via an explicit opt-out.
* Bad, because axe covers only part of WCAG, so it complements — does not replace — human a11y
  review.

### a11y advisory-only (non-failing)

* Good, because it surfaces issues without ever blocking a merge.
* Bad, because advisory checks are routinely ignored; without a failing gate, accessibility
  regresses silently — incompatible with "most comprehensive".

### No a11y tooling

* Good, because it is zero setup and leans on Radix's baseline.
* Bad, because the baseline says nothing about *how* primitives are composed and labeled in this
  app, so real, app-specific violations go entirely undetected.

## More Information

Builds on **0034** (the Radix/shadcn a11y baseline this gate verifies in context), **0035** /
**0037** (the workbench and the browser-mode engine that runs axe over stories), **0033**
(the AA design tokens that drive
contrast outcomes), **0032** (Tailwind that applies them), and **0010** (the CI gate). The
interaction stories the a11y checks run over are standardized in **0038**. The gate targets
WCAG 2.2 AA and is explicitly scoped as automated coverage that complements, not replaces,
manual accessibility review; revisit the conformance level if a higher bar (AAA for specific
flows) is mandated.

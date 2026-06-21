---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Visual-regression testing: Chromatic over Storybook stories

## Context and Problem Statement

**0040** deliberately deferred *pixel/visual* regression — distinct from the serialized DOM
snapshots it decided — and **0044** flagged it as a still-open decision that the mandated
`chromatic` server (**CON-003**) presupposes. The other modalities each miss a class of
regression: line coverage (**0041**), interaction (**0038**), accessibility (**0039**), and DOM
snapshots (**0040**) all pass while a component renders with the *wrong* spacing, color, font,
or layout. Because the project has a design-token layer (**0033**) explicitly engineered to
*change* visuals, an unintended token or CSS change is exactly the regression nothing currently
catches. This record settles whether visual regression is done and by what tool.

## Decision Drivers

* **Catch the visual class of regression** — CSS/layout/color/token changes that no other
  modality detects.
* **Reuse the story fixtures** — every meaningful state already mandated in **0042** should
  become a visual baseline, not a new fixture set.
* **Alignment with CON-003** — `chromatic` is already a mandated server; the visual-regression
  platform should not contradict the mandated toolchain.
* **Reviewable diffs, off-repo baselines** — visual baselines must not bloat git, and diffs need
  a human approval workflow fitting the PR review (**0011**), not eyeballed image files.
* **Bounded cost and CI fit** — snapshots should be limited to what changed and run in the gate
  (**0010**).

## Considered Options

* **Chromatic** — hosted visual testing by the Storybook maintainers: publishes the built
  Storybook, snapshots stories across browsers/viewports, with a review/approval UI
* **Playwright `toHaveScreenshot`** over stories — self-hosted screenshots committed in-repo
* **Storybook test-runner + jest-image-snapshot** — image snapshots produced by the runner
  (**0037**), stored in-repo

## Decision Outcome

Chosen option: "Chromatic over Storybook stories", because it snapshots the *built* Storybook —
reusing the CSF 3 stories (**0036**) and the meaningful-state matrix (**0042**) as visual
baselines — stores those baselines off-repo behind a hosted review/approval UI that fits PR
review (**0011**), and is the platform **CON-003** already mandates, so the visual-regression
strategy and the mandated toolchain are one and the same. **TurboSnap** limits snapshots to
stories affected by changed files, bounding cost and CI time. It is wired into CI (**0010**) as
a PR check; baselines are approved by a human in the Chromatic UI — the visual analog of the
review judgment in **0042**. Its project token is supplied by env-reference
(`${CHROMATIC_PROJECT_TOKEN}`) per **0044**, never committed. Scope: visual regression runs over
the same meaningful states mandated in **0042** and **complements — does not replace** — DOM
snapshots (**0040**), interaction (**0038**), and accessibility (**0039**).

### Consequences

* Good, because it catches the entire visual class of regression — including unintended changes
  to the design tokens (**0033**) and the dark/RTL axes — that nothing else does.
* Good, because it reuses the stories and the **0042** state matrix, so there is no separate
  visual fixture set, and baselines plus diff-approval live off-repo (no large PNGs in git).
* Good, because it aligns with **CON-003**, integrates natively with Storybook (same
  maintainers), and TurboSnap keeps the snapshot count and cost bounded.
* Bad, because it is a hosted SaaS dependency with a snapshot quota/cost and sends the built UI
  to a third party — acceptable here because stories render mock data via decorators (**0044**),
  not production user data, but a consideration for anything sensitive.
* Bad, because visual diffs can be noisy (font rendering, animation, dynamic content), so
  stories must be deterministic — freeze time/animations and mock dynamic data — to avoid false
  positives.
* Bad, because it adds another required PR check and a baseline-approval step, i.e. review
  friction.

### Confirmation

A Chromatic project is configured with its token by env-reference (**0044**); CI (**0010**)
publishes Storybook and runs Chromatic on pull requests; TurboSnap is enabled; snapshots cover
the **0042** stories; baselines are approved in the Chromatic UI; and **no image baselines are
committed to the repo**.

## Pros and Cons of the Options

### Chromatic (chosen)

* Good, because off-repo baselines + a hosted review UI fit PR approval (**0011**) and keep git
  clean.
* Good, because it reuses stories/**0042**, aligns with **CON-003**, and TurboSnap bounds cost.
* Neutral, because cross-browser/viewport snapshotting is built in.
* Bad, because it is a paid SaaS dependency with data egress and diff-noise to tame.

### Playwright `toHaveScreenshot`

* Good, because it is free, self-hosted, and reuses the Playwright already in the stack
  (**0007**).
* Bad, because baselines are committed PNGs that bloat git, rendering differs across
  environments (CI vs local) causing flake, and there is no review/approval UI — diffs are
  eyeballed, which scales poorly.

### test-runner + jest-image-snapshot

* Good, because it runs inside the existing test-runner (**0037**) with image snapshots in-repo.
* Bad, because it inherits the same in-repo-baseline bloat and cross-environment flake as
  Playwright screenshots, plus extra maintenance, and still lacks a hosted review workflow.

## More Information

Settles the visual-regression decision deferred in **0040** and flagged open in **0044**. Builds
on **0035**/**0036** (the stories snapshotted), **0042** (the meaningful-state matrix that
becomes the baseline set), **0033** (the design tokens visual regression protects), **0037**
(Chromatic is a separate publish-and-snapshot pass, not the Vitest addon), **0009**/**0010**
(CI and preview deploys), **0011** (PR review/baseline approval), and **CON-003**/**0044** (the
mandated `chromatic` toolchain and its env-referenced token). It is distinct from the serialized
DOM snapshots of **0040** and completes the visual dimension of the **0035–0042** testing set.
Revisit if SaaS cost or data-egress constraints make a self-hosted screenshot approach
necessary.

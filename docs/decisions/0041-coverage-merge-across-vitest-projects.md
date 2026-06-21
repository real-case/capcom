---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Coverage instrumentation and merge across the unit and story Vitest projects

## Context and Problem Statement

**0008** set a single global ≥80% line-coverage threshold gating PR merge, run via
`npm run test:coverage`. That decision predates **0035** (Storybook + the Vitest addon) and
**0037** (two execution engines). The project now has **two Vitest projects** measuring the
same `src/**`: the unit/component project (RTL, **0007**) and the Storybook stories-as-tests
project (**0035**/**0037**). Each exercises different code paths against the same source, so the
**0008** gate is currently ambiguous — it does not say whether the two projects' coverage is
combined into one number, kept as separate thresholds, or whether only one project counts. This
record operationalizes **0008** for the two-project world; it does **not** change the 80% figure.

## Decision Drivers

* **One unambiguous number** — the **0008** gate must mean exactly one thing, not "80% of
  which project?".
* **Credit coverage wherever it comes from** — a line covered by a story-test *or* a unit test
  should count, so splitting coverage across projects is not penalized.
* **Single coverage provider and config** — one instrumentation tool and one include/exclude
  set, applied identically to both projects.
* **No double counting** — the same line covered in both projects must not inflate the number,
  and non-Vitest engines must not contribute incompatible data.
* **CI fit** — the merged measurement runs non-interactively in the gate (**0010**).

## Considered Options

* Single Vitest workspace, one coverage provider, **merged** coverage across both projects
  against the one ≥80% threshold (**0008**)
* Separate per-project thresholds (e.g. unit ≥X%, stories ≥Y%), no merge
* Only the unit/RTL project counts toward **0008**; story-tests contribute no coverage

## Decision Outcome

Chosen option: "single Vitest workspace with merged coverage", because it keeps the **0008**
gate meaning exactly one thing while crediting coverage from either project. A single Vitest
**projects/workspace** configuration runs both the unit/RTL project (**0007**) and the Storybook
project (**0035**/**0037**) under **one coverage provider — V8 (`@vitest/coverage-v8`)**,
matching the Vite-native stack — instrumenting the same `src/**`. The two projects' coverage is
**merged into one report** and evaluated against the single global ≥80% threshold from
**0008**: a line covered by a story-test *or* a unit test counts, and the gate keeps one
definition. Include/exclude is uniform — the stories themselves, generated Supabase types
(**0015**), and config are excluded so they neither pad nor dilute the number. The
**test-runner smoke pass (0037) contributes no coverage**: coverage is single-sourced from the
Vitest projects to avoid instrumentation mismatch and double counting, while the runner stays
responsible for build-integrity smoke. `npm run test:coverage` (**0008**) is defined to run this
merged workspace.

### Consequences

* Good, because there is one coverage number with one meaning, satisfying the **0008** gate
  unambiguously now that two projects exist.
* Good, because coverage is credited across projects, so there is no perverse incentive to cram
  every test into one project to "make the number".
* Good, because a single V8 provider and one include/exclude set keep instrumentation
  consistent and reuse the Vite-native tooling.
* Bad, because a Vitest workspace coverage setup is more involved to configure and reason about
  than a single-project one.
* Bad, because a merged line number can mask a weak project — a component covered only by
  stories with no unit tests still passes; line coverage says nothing about *which states* were
  rendered, which is why the breadth mandate is handled separately in **0042**.

### Confirmation

A single Vitest workspace defines both projects; one `coverage` block uses the V8 provider with
a uniform include/exclude (stories, generated types **0015**, and config excluded);
`npm run test:coverage` emits a single merged report checked against ≥80% (**0008**) in CI
(**0010**); the `@storybook/test-runner` job carries no coverage instrumentation.

## Pros and Cons of the Options

### Single workspace, merged coverage (chosen)

* Good, because one number, one meaning, with cross-project credit.
* Good, because one V8 provider and one config keep instrumentation consistent.
* Neutral, because it requires a Vitest workspace rather than a flat single project.
* Bad, because a merged line number can hide an under-tested project (addressed by **0042**).

### Separate per-project thresholds

* Good, because each project's health is visible independently.
* Bad, because it splits the gate into two numbers, reopening exactly the ambiguity **0008**
  was meant to remove, and it penalizes covering a line in whichever project is convenient.

### Only the unit project counts

* Good, because it is the simplest — one project, one number, unchanged from a pre-Storybook
  world.
* Bad, because the story-tests (**0035**/**0037**) — a primary reason Storybook was adopted —
  would earn no coverage credit, undercounting real coverage and discouraging stories-as-tests.

## More Information

Operationalizes **0008** (the threshold itself is unchanged) for the two projects introduced by
**0007** (unit/RTL) and **0035**/**0037** (stories-as-tests); excludes generated types from
**0015**; runs in the CI gate (**0010**). This record settles *how much* is measured and how
the number is computed; the complementary question of *which stories must exist* so that every
component state is actually rendered — the breadth dimension line coverage cannot express — is
decided in **0042**. Revisit if a per-project visibility need arises (it can be added as
reporting without changing the single merged gate).

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# AI-drafted story state matrices and play functions, with the 0042 human judgment retained

## Context and Problem Statement

**0042** mandates that every exported UI component ships CSF 3 stories covering its
meaningful states, enforced in two tiers: a mechanical existence check in CI and a human
judgment call in PR review for *completeness*. **0038** mandates `play` functions for
interactive components. Both are authoring-heavy, and the completeness review is pure
eyeballing: the reviewer must mentally enumerate a component's state space and diff it
against the stories present. Meanwhile the inputs to that enumeration — prop types under
strict TypeScript (**0003**), variant unions, CSF 3's uniform shape (**0036**) — are
machine-readable. Can drafting and completeness-checking be assisted without surrendering
the judgment **0042** deliberately kept human?

## Decision Drivers

* **The judgment gate stays human** — **0042** chose review judgment over mechanical
  exhaustiveness on purpose; assistance must not quietly convert it into rubber-stamping
  a generator.
* **Authoring cost** — the **0038**/**0042** mandates are the priciest authoring
  obligations in the corpus; their per-component cost decides whether they are sustained
  or resented.
* **Machine-readable state space** — strict types (**0003**) and uniform CSF 3 (**0036**)
  make a drafted matrix *reliable enough to be useful*, which is what separates this from
  generic test generation.
* **Meaningful, not mechanical** — **0042** explicitly rejects exhaustive prop
  combinations; any draft must inherit that taste.

## Considered Options

* The agent drafts a per-component state matrix (from prop types, variants, and the
  **0042** state categories) plus `play` function drafts; a PR aid flags uncovered states;
  the human completeness judgment of **0042** is unchanged
* Status quo — fully manual story authoring and eyeball completeness review
* Mechanical exhaustive generation of stories over prop combinations

## Decision Outcome

Chosen option: "AI-drafted matrices and play functions under the unchanged 0042 judgment",
because it converts the completeness review from unaided mental enumeration into checking
a concrete checklist, while leaving every decision about *meaningfulness* with the human.
For a new or changed component, the agent drafts the state matrix along **0042**'s
categories (default + variants, interactive states, data-edge cases, theme/locale axes)
derived from the component's types, proposes the corresponding CSF 3 stories, and drafts
`play` functions (**0038**) using `@storybook/test`. In review, uncovered states are
flagged as a checklist for the reviewer. Two guardrails: drafted `play` functions must
assert *intended* behavior (from the spec/PR description), not merely lock in current
behavior; and flagged states are candidates, not obligations — the reviewer dismisses
non-meaningful ones, per **0042**.

### Consequences

* Good, because the completeness judgment gets a concrete artifact to judge against —
  the most error-prone part of **0042**'s enforcement becomes systematic.
* Good, because the marginal cost of the **0038**/**0042** mandates drops substantially,
  protecting their sustainability as the component count grows.
* Good, because drafts are uniform (CSF 3, **0036**) and typed (**0003**), so generated
  and hand-written stories are indistinguishable in form.
* Bad, because plausible-but-wrong drafts are the failure mode: a `play` function that
  asserts buggy current behavior *looks* like coverage — the review guardrail exists for
  exactly this, and it demands real attention.
* Bad, because a drafted checklist anchors reviewers; states the generator cannot see
  (domain-specific edge cases) need the human to still think past the list.

### Confirmation

PRs introducing or changing exported components show drafted/updated state matrices and
stories; the **0042** existence check and review checklist remain in force unchanged;
sampled `play` functions assert behavior traceable to the PR's stated intent, not just
snapshots of implementation. The **0042** judgment step remains in the PR template.

## Pros and Cons of the Options

### AI-drafted matrices and play functions, human judgment retained (chosen)

* Good, because it assists precisely the expensive parts (enumeration, boilerplate) and
  not the part that must stay human (meaningfulness).
* Good, because strict typing makes the drafts trustworthy raw material rather than
  hallucinated guesses.
* Neutral, because it shifts review effort from writing to verifying — net positive only
  if reviewers actually verify intent (the guardrail).
* Bad, because it introduces the assert-current-behavior trap that pure hand-authoring
  does not have.

### Status quo — fully manual

* Good, because every story reflects deliberate human enumeration; no anchoring.
* Bad, because completeness review stays unaided mental work that degrades under load —
  the exact judgment **0042** relies on is the part most likely to be skimped.
* Bad, because authoring cost scales linearly with component count, eroding the mandate's
  sustainability.

### Mechanical exhaustive generation

* Good, because coverage of the combinatorial space is total and deterministic.
* Bad, because **0042** explicitly rejected this: exhaustive combinations bury meaningful
  states in noise, and every generated story becomes a maintenance and snapshot burden
  (**0040**, **0043** costs scale per story).

## More Information

Operationalizes assistance for **0042** (state mandate) and **0038** (play functions),
within the forms fixed by **0036** (CSF 3) and **0003** (strict types). Story count
growth interacts with snapshot (**0040**) and visual (**0043**) costs — TurboSnap bounds
the latter. Drafting falls under the agent role in **0046**; review of drafts under
**0047**. Revisit if drafted coverage is found to systematically encode bugs (guardrail
failure) or if Storybook ships native equivalent tooling.

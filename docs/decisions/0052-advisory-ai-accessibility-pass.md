---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Advisory AI accessibility pass over stories for the judgment class axe cannot check

## Context and Problem Statement

**0039** gates the build on axe-core at WCAG 2.2 AA over every story state, and is honest
about its limit: "automated checks necessary but not sufficient." The insufficiency has a
specific shape — axe verifies *mechanical* predicates (contrast ratios, attribute
presence, name computation) but cannot judge *semantic* quality: whether alt text actually
describes the image, whether the focus order is logical rather than merely present,
whether an `aria-label` says something a screen-reader user can act on, whether reading
order makes sense. Today that judgment class is covered by nothing scheduled. Multimodal
AI review of rendered stories (DOM plus screenshot) can evaluate exactly this class.
Should it, and with what authority?

## Decision Drivers

* **The uncovered class is the judgment class** — every mechanical a11y check is already
  gated (**0039**); only semantic quality is unprotected.
* **The gate must stay deterministic** — **0039** chose a hard gate because axe results
  are reproducible; probabilistic findings must not block merges (same principle as
  **0048**).
* **Story fixtures already exist** — the **0042** state matrix renders every meaningful
  state; the judgment pass reuses it for free, like **0043** does for visuals.
* **Honesty about sufficiency** — an AI pass narrows the gap but is *also* not
  sufficient; the record must not let it masquerade as a full audit.

## Considered Options

* An advisory (non-blocking) AI accessibility pass in CI over rendered stories (DOM +
  screenshots), findings as PR comments
* Extend the blocking **0039** gate with AI-evaluated checks
* Manual expert audits only, no AI pass

## Decision Outcome

Chosen option: "advisory AI accessibility pass over stories", because it covers the
judgment class — the only class currently uncovered — at the only authority level a
probabilistic check can responsibly hold. A CI job renders the **0042** story states
(reusing the built Storybook, **0037**) and submits DOM and screenshots to an AI review
focused on the semantic checklist: alt-text descriptiveness, focus-order logic,
label/announcement clarity, reading order, and state communication beyond color (tying to
tokens, **0033**). Findings are PR comments; the job is not a required check; the **0039**
axe gate is unchanged. The record explicitly preserves the expert-audit obligation: the
AI pass narrows the judgment gap, it does not certify accessibility — periodic human/user
audits remain the eventual confirmation, scheduled when the product has real flows.

### Consequences

* Good, because the judgment class gets *some* systematic coverage on every PR instead of
  none until an audit.
* Good, because it reuses the existing story matrix and built Storybook — no new fixture
  surface, same economics as **0043**.
* Good, because the deterministic gate (**0039**) is untouched; the two layers cannot
  contaminate each other's authority.
* Bad, because findings are nondeterministic — the same story may pass one run and draw a
  comment the next; advisory status absorbs this, but reviewers must calibrate trust.
* Bad, because screenshots of every changed story per PR cost tokens and minutes
  (mitigable by scoping to changed stories, as TurboSnap does in **0043**).
* Bad, because partial coverage can breed false confidence — the explicit
  not-a-substitute clause exists to keep the expert-audit obligation visible.

### Confirmation

CI contains the advisory a11y job, absent from required checks; the **0039** gate
configuration is byte-identical to before this record; sampled PR comments show semantic
findings (alt text, focus order, labels) rather than duplicating axe's mechanical output;
an expert-audit milestone exists in project planning once user flows exist.

## Pros and Cons of the Options

### Advisory AI pass over stories (chosen)

* Good, because it is the only option that addresses the uncovered class continuously.
* Good, because story reuse keeps marginal cost low and scope exactly aligned with
  **0042**'s meaningful states.
* Neutral, because value depends on prompt quality and model vision capability, both of
  which improve without project effort.
* Bad, because nondeterminism caps its authority at advisory forever.

### Extend the blocking 0039 gate with AI checks

* Good, because semantic violations could not merge unnoticed.
* Bad, because it puts probabilistic judgments among required checks — flaky merges,
  override machinery, and erosion of trust in the gate (**0010**'s determinism principle,
  the same reasoning that kept **0048** advisory).

### Manual expert audits only

* Good, because expert audits are the gold standard for the judgment class.
* Bad, because they are episodic and expensive — between audits, every PR ships semantic
  regressions unchecked; the classes are complements, not alternatives.

## More Information

Extends the accessibility decision of **0039** without modifying its gate; reuses
**0042** states, the built Storybook (**0037**), and tokens (**0033**) for contrast/state
context. Same advisory-authority reasoning as **0048** and the same story-reuse economics
as **0043**. Falls under the agent toolchain posture of **0044**/**0046**. Revisit when
expert-audit findings allow measuring the pass's precision, or if axe-core grows semantic
checks that move items from the judgment class to the mechanical gate.

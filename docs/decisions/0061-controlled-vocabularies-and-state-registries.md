---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Controlled vocabularies and state registries for components

## Context and Problem Statement

**0042** mandates that every component has stories for its *meaningful states*, with completeness
judged in review. That judgment has no canonical reference: each reviewer re-derives "what states
should this have" from scratch, so coverage is inconsistent and the agent (**0046**) can silently
skip the empty/overflow/loading states where bugs actually hide (problem P8). A parallel gap exists
for *intent*: there is no controlled list of what a component is *for*, so two components can occupy
the same usage role under different names without anyone noticing (problem P3). Both gaps share a
root cause — the project has never written down its **controlled vocabularies**: the closed set of
usage roles, the closed set of component archetypes, the archetype→states mapping that turns "meaningful
states" into an enumerable acceptance criterion, and the state-precedence rules for when states collide.
These artifacts **cannot be generated** — they are designer/architect decisions and the true bottleneck
of the whole design-system plan. This record establishes them and how they are governed; it extends
**0042** by giving its judgment a canonical source.

## Decision Drivers

* **Make "meaningful states" enumerable** — coverage must be checkable by *subtraction* from a canonical
  set, not re-imagined per component, so the agent cannot silently skip a state (P8).
* **A closed vocabulary of intent** — usage roles must be a controlled list so role collisions are
  detectable (the input to the **0062**/Stage-4 dedup), or intent dedup "degenerates into constant
  escalation" (P3).
* **Decide simultaneity once** — behavior under `disabled+loading`, `invalid+read-only`,
  `hover-over-selected` is a cross-component contract that must be fixed system-wide, not per component
  (P8).
* **Type-checked references, governed renames** — referencing an unknown role/archetype must fail
  typecheck; but a *rename/merge/split* of a vocabulary entry is a migration of every referencing intent
  file, which needs an owner and a procedure (the governance the union types cannot provide).
* **Human-authored, agent-consumed** — these are the un-generatable inputs; the agent reads them, it does
  not write them.

## Considered Options

* **Author the controlled vocabularies as typed source** — `usage-roles.ts`, `archetypes.ts`, an
  archetype→states registry, and a state-precedence matrix — referenced by intent/stories, with explicit
  dictionary governance
* **Free-form per-component state lists** — each component declares its own states in prose/stories, no
  central registry
* **Infer roles/states from existing components** — derive the vocabularies from the current
  `src/components/**` tree

## Decision Outcome

Chosen option: "author the controlled vocabularies as typed source", because the registries are precisely
the decisions that cannot be inferred or generated, and turning them into typed source makes every
downstream check (coverage by subtraction, role-collision detection, simultaneity resolution) reference
one governed truth. Four artifacts, all 👤 human-authored under `src/design-system/`:

* **`usage-roles.ts`** — a *closed* list of intent roles (e.g. `risk-level-indicator`, `action-trigger`,
  `selection-control`, `text-input`); the bottleneck of the plan, the input to intent dedup (P3).
* **`archetypes.ts`** — the closed component-class dictionary (`action-trigger`, `text-input`,
  `selection-control`, `categorical-indicator`, `collection`, `container`, `feedback`, `navigation`,
  `media`, `disclosure`).
* **Archetype→states registry** — the "class → mandatory state axes" table (the plan's Appendix A1
  starting set); the acceptance-criteria source for coverage by subtraction (P8).
* **State-precedence matrix** — simultaneity resolved once: focus-visible always wins, disabled suppresses
  hover/active, `loading+disabled` defined explicitly, etc. (P8).

References are typed (a story/intent naming an unknown role or archetype fails typecheck — the cheap half),
but the union types catch only *broken references*, **not** the *decision* to rename. So dictionary
**governance** is part of this decision: adding an entry is trivial; a rename/merge/split is a migration of
every referencing intent file, and needs an assigned owner + procedure **before** the first such change
(operationalized in **0064**). A component fitting no archetype is a 👤 escalation (a new archetype is a
design-system decision), never an agent default.

### Consequences

* Good, because coverage becomes "classify → take the mandatory set → mark each `applicable` with a
  rationale when false", so a skipped state is a visible, justified omission rather than a silent gap (P8);
  this is what **0062**'s state-by-subtraction and **0042**'s judgment now reference.
* Good, because a closed `usage-roles.ts` makes intent collisions *detectable* — the precondition for the
  Stage-4 collision gate (P3) instead of unbounded escalation.
* Good, because deciding simultaneity once removes a whole class of per-component re-litigation and
  cross-component inconsistency.
* Bad, because authoring and maintaining the vocabularies is real, ongoing human work, and a too-coarse or
  too-fine role list quietly degrades every downstream check — the bottleneck is also a liability.
* Bad, because renames carry migration cost the type system flags but does not perform; without the **0064**
  governance owner, a rename stalls or fragments the intent files.

### Confirmation

`usage-roles.ts`, `archetypes.ts`, the archetype→states registry, and the state-precedence matrix exist as
typed source under `src/design-system/`; a story or intent file referencing an unknown role/archetype fails
`tsc --noEmit` (**0003**). The coverage skill (**0051**-class) and the **0042** review reference the registry,
not ad-hoc lists; a component matching no archetype is escalated, not defaulted. A dictionary owner and a
rename/merge/split procedure are recorded (with **0064**) before the first such migration. Subject to the
**0054** drift audit once accepted.

## Pros and Cons of the Options

### Typed controlled vocabularies + governance (chosen)

* Good, because it gives **0042**'s judgment and **0062**'s derivation one governed, type-checked source.
* Good, because it makes both omitted states (P8) and role collisions (P3) detectable.
* Neutral, because the vocabularies are human-authored and evolve — a deliberate bottleneck.
* Bad, because renames are a real migration the types flag but cannot perform.

### Free-form per-component state lists

* Good, because it imposes no upfront vocabulary work.
* Bad, because "meaningful states" stays un-enumerable, so P8 (silent skips) and P3 (role collisions)
  persist exactly as **0042** left them — the gap this record exists to close.

### Infer from existing components

* Good, because it bootstraps from real code with no authoring.
* Bad, because it bakes today's *incomplete* component set in as the canon, so missing states and duplicate
  roles in the current tree become the standard rather than being corrected.

## More Information

Extends **0042** (the meaningful-states mandate) by supplying the canonical reference its judgment lacked;
provides the inputs **0062** derives state coverage and intent dedup from, and the **0051**-class
coverage/matrix skill consumes. The archetype→states starting set is the plan's Appendix A1; simultaneity is
the separate state-precedence matrix. Dictionary governance (owner + rename/merge/split procedure) is
operationalized with **0064**. These are the un-generatable human-contribution points the plan flags as the
project's bottleneck — author `usage-roles.ts` and `archetypes.ts` first, as Stage-0 root dependencies.
Confirms problems P3 (intent duplication) and P8 (incomplete state coverage). Authoring the
vocabularies themselves is a human action (**0046**).

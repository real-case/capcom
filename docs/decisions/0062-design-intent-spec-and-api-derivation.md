---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# `design-intent.ts` as component specification and usage-driven API derivation

## Context and Problem Statement

**0051** lets the agent draft state matrices and `play` functions from strict types, under the
unchanged **0042** human judgment. But it presupposes a component already exists to draft *for*.
The earlier and riskier step is **designing the contract itself**: when the agent invents a
primitive's props, it hallucinates an API — guessing variants and slots that no caller needs, or
missing ones every caller does (problem P4), and folding a composition-specific requirement into a
primitive so reuse is lost (problem P5). There is no artifact that states a component's intended
contract *before* it is implemented, which means Definition-of-Ready collapses into
Definition-of-Done (the API is "designed" only once it is coded). This record introduces
**`design-intent.ts`** — a typed specification authored beside the component at DoR — and fixes how
the API is *derived from usage* rather than guessed. It extends **0051**: that record drafts tests
for a built component; this one specifies the component before it is built.

## Decision Drivers

* **Specification, not verification** — the intent file must be authored at DoR as a *design*, so the
  contract is decided before code; otherwise DoR equals DoD and the design step never happens.
* **Usage-driven API** — a primitive's contract should be the union of its real call-site requirements
  (`usedIn`, from the **0059** graph), not the agent's imagination (P4).
* **Composition boundary, decided and recorded** — slot (orthogonal, combinatorial variation) vs.
  variant/flag (a closed axis) is the call that prevents composition requirements leaking into a
  primitive (P5); it must be recorded with a rationale, not made implicitly.
* **State coverage by subtraction** — states come from classifying the component against the **0061**
  archetype set and marking each `applicable` true/false with a *required* rationale when false, so an
  omission is never silent (P8).
* **References, never inlines** — the intent file points at the **0061** vocabularies and the **0058**
  token registry; it does not re-declare them, or the single-source guarantee breaks.

## Considered Options

* **A typed `design-intent.ts` beside each component**, authored at DoR, deriving the API from the
  `usedIn` union and state coverage by subtraction from the archetype set
* **Document intent in the PR description / Storybook docs** — prose, not typed source
* **Skip a spec** — design the API while implementing, rely on **0051** drafts and review afterward

## Decision Outcome

Chosen option: "a typed `design-intent.ts` beside each component", because it is the only option that
moves the contract decision *before* implementation and ties each field to a downstream check, turning
intent into something verifiable rather than narrative. The file is authored at DoR and is the source of
truth for API derivation; its field map (the plan's Appendix A2; full schema is this record's concern):

* `meta` — `id`, `kind` (`primitive`|`composite`|`pattern`), `archetype` (**0061**), `compositionSignature`,
  `composedOf[]`, `usedIn[]` (**0059**).
* `usageRole` — from `usage-roles.ts` (**0061**); collisions escalate to the Stage-4 human gate (P3).
* `variants` — items each with `figmaNodeId` + deep link + axis + optional `seal` (**0063**).
* `states` — `StateEntry[]` with `name`, `applicable`, `rationale?` (**required when `applicable:false`**),
  optional `figmaNodeId`/`seal`, and `tokens?` typed from the **0058** registry.
* `combinations` — orthogonal axes with `allowed`/`forbidden` (recorded judgment, decided per class).
* `api` — `slots[]` (+ rationale) and `variants[]` (+ rationale), with `ownsExternalMargin: false` (the
  **0058** no-external-margin invariant, asserted per component).
* `behavior` — ref-forwarding, controlled/uncontrolled, aria passthrough, focus management — **built
  engineering-side, not from Figma**.

The **API is derived, not guessed**: the union of all `usedIn` requirements is the draft contract. The
**composition-boundary** decision (slot vs. variant/flag) is recorded with its rationale. **State coverage
is by subtraction**: classify by archetype (**0061**), take the mandatory set, mark each `applicable`;
`applicable:false` without a `rationale` is a masked omission and is rejected (P8). Verification mapping:
token fields → **0058** lints; `compositionSignature` → **0059** graph check; the applicable-state list →
the **0042**/Stage-4 human gate + the coverage skill; `variants[].figmaNodeId` → the **0063** approval
artifact; `api` ↔ actual props and `seal` ↔ live render → the Stage-1 fitness functions.

### Consequences

* Good, because the contract is *designed* at DoR with a usage-driven API, so hallucinated and
  under-specified props (P4) are caught before code, not after.
* Good, because the slot-vs-flag boundary is an explicit, rationale-bearing field, so composition
  requirements stop leaking into primitives (P5).
* Good, because state-by-subtraction makes every omission a justified, reviewable `applicable:false`
  rather than an invisible gap (P8); **0051** then drafts the matrix against this spec.
* Bad, because authoring a typed spec per component is upfront work and a learning curve; for trivial
  components it can feel heavier than just writing the component.
* Bad, because the intent file is a second artifact that can drift from the implementation — which is
  exactly why each field is bound to a fitness function (P9) rather than trusted as prose.

### Confirmation

A sampled component has a `design-intent.ts` whose `api` is derived from its `usedIn` union (**0059**), not
invented; every `states` entry marked `applicable:false` carries a `rationale`; `ownsExternalMargin` is
`false`; token fields reference the **0058** registry rather than literals; the slot-vs-variant choices
carry rationales. The fitness functions (Stage 1) compare `api` to actual props and `states` to stories
bidirectionally. The **0051** draft and the **0042** judgment operate on top of this spec. Subject to the
**0054** drift audit once accepted.

## Pros and Cons of the Options

### Typed `design-intent.ts` at DoR (chosen)

* Good, because it puts the contract decision before code and binds each field to a check.
* Good, because usage-driven derivation and the recorded slot/flag boundary directly target P4/P5.
* Neutral, because it shifts effort earlier (design) rather than adding net effort — if DoR is honored.
* Bad, because it is an extra typed artifact with its own drift risk (mitigated by the fitness functions).

### Intent in prose (PR/Storybook docs)

* Good, because it is low-ceremony and human-readable.
* Bad, because prose cannot be referenced by a fitness function, so API↔props and state↔story drift go
  unchecked — the P9 guarantee is lost and the spec rots into stale comments.

### Skip a spec

* Good, because it is the least process.
* Bad, because the API is then designed while coding — DoR collapses into DoD, hallucinated props (P4) and
  leaked composition (P5) land in the implementation, and **0051**/**0042** only inspect after the fact.

## More Information

Extends **0051** (which drafts tests for built components) by specifying the component *before* it is built;
derives the API from the **0059** `usedIn` graph; classifies states against the **0061** archetype set;
references the **0058** token registry and the **0061** vocabularies rather than inlining them. The Figma
`variants`/`seal` fields are owned by **0063**; `behavior` is engineering-built, never from Figma (**0045**).
The field map is the plan's Appendix A2. Confirms problems P4 (API hallucination), P5 (composition leaking
into a primitive), and P8 (incomplete state coverage).

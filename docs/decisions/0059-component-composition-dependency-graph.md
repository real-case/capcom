---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Component composition dependency graph as a top-down analytical artifact

## Context and Problem Statement

When the agent (**0046**) builds a component, the cheapest mistake to make and the hardest to
catch in review is **structural duplication**: re-implementing a component that is, by its
composition, identical to one that already exists (a "labelled bordered container with a header
slot" built twice under two names). **0042** mandates that components exist with full state
coverage, but says nothing about *whether a proposed component should exist at all*, nor how to
derive its API from how it will actually be used. The corpus has no machine-readable model of how
components compose. Without one, deduplication degenerates into the agent eyeballing the
`src/components/**` tree, and API design degenerates into guessing props. This record introduces
that model — a **composition dependency graph** — and is careful to separate it from the
*import* graph that **0060** derives from code: the import graph verifies that the built code
matches the design; it does not, and cannot, *decide* what should be common.

## Decision Drivers

* **Deduplicate by structure, before code** — the graph must be built top-down from interface and
  behavioral commonality, so duplication is caught at design time, not discovered after two
  components ship (problem P2).
* **Derive API from usage** — the union of a primitive's call sites (`usedIn`) is the honest source
  of its contract; the graph must carry that relation so **0062** can derive APIs from it, not from
  guesses (P5).
* **Machine-readable, single artifact** — agents, the structural skills (**0051**-class), and the
  **0060** reconciliation gate all need to read the same file; prose cannot serve them.
* **Figma is a hint, not the truth** — design structure informs the graph, but the analytical
  commonality decision is the project's, recorded here, not imported from a design tool (**0045**).
* **Do not conflate the two graphs** — composition (intent, top-down) and import (code, bottom-up,
  **0060**) are different objects; collapsing them loses the very mismatch the **0063**/**0060**-style
  anti-drift check depends on.

## Considered Options

* **A maintained composition-graph JSON** with `composedOf`/`usedIn` edges and a normalized
  `compositionSignature` per node, built top-down by interface commonality
* **Derive everything from the import graph** (**0060**) — let `dependency-cruiser` output stand in
  for the composition model
* **No explicit model** — rely on the agent reading the component tree and on review judgment

## Decision Outcome

Chosen option: "a maintained composition-graph JSON", because it is the only option that gives the
structural-deduplication and API-derivation steps a stable, shared object to reason over, and the only
one that keeps the *intent* graph distinct from the *code* graph so the two can be reconciled. Each
node is a component; directed edges are `composedOf` (a node's constituent parts) and its inverse
`usedIn` (where the node is consumed). Each node carries a normalized **`compositionSignature`** — for
v1 the *exact set of primitives it composes* (no subtree topology; subtree isomorphism is nontrivial
and fuzzy matching over-reports — topology is added only if the **0064** Defect Log shows missed
duplications), optionally amplified by `usageRole` adjacency (**0061**) as a duplicate-candidate
signal. Shared subtrees are marked. The graph is built **top-down by interface/behavioral commonality**
before code; Figma structure is a hint, never the source. The `usedIn` union of a node is the input
**0062** turns into a derived API. Its precise on-disk location and JSON schema are an open question the
plan tracks (a likely home is `src/design-system/`); this record fixes the *model and its role*, not
the file path.

### Consequences

* Good, because structural duplication becomes a checkable property: a new component's signature is
  compared against existing nodes before it is built (P2), inside the agent's own loop via the
  **0051**-class skill.
* Good, because API derivation gets an honest input — the real `usedIn` union — instead of a guessed
  prop list (P5), which **0062** consumes.
* Good, because keeping the composition graph separate from the import graph (**0060**) is exactly what
  makes the reconciliation gate meaningful: a mismatch is signal, not noise.
* Bad, because a hand-or-agent-maintained graph is an artifact that can go stale; its freshness is only
  guaranteed by the **0060** reconciliation gate and **0064** deprecation hygiene — without those it
  rots.
* Bad, because `compositionSignature` v1 (exact-set, no topology) will miss duplications that differ
  only in arrangement; this is a deliberate precision-over-recall choice, revisited via the Defect Log.

### Confirmation

A composition-graph JSON exists and validates against its schema; every `src/components/**` module
appears as a node; each node has `composedOf`/`usedIn` edges and a normalized `compositionSignature`.
A component whose signature matches an existing node is flagged before creation (the **0051**-class
structural skill); the `usedIn` union is what **0062** derives an API from. The graph is reconciled
against the **0060** import graph (a mismatch fails CI). Subject to the **0054** drift audit once
accepted.

## Pros and Cons of the Options

### Maintained composition-graph JSON (chosen)

* Good, because it serves dedup, API derivation, and reconciliation from one readable artifact.
* Good, because top-down-by-commonality catches duplication at design time, the cheapest point.
* Neutral, because v1 deliberately omits topology, trading recall for precision until evidence says
  otherwise.
* Bad, because it is a maintained artifact whose freshness depends on the **0060**/**0064** loop.

### Derive everything from the import graph

* Good, because the import graph is code-derived and never stale.
* Bad, because code structure is the *result* of design decisions, not the decision itself — it cannot
  tell you two differently-named components *should* be one; conflating the graphs destroys the
  reconciliation signal (the **0060** rationale, inverted).

### No explicit model

* Good, because zero artifact to maintain.
* Bad, because dedup and API derivation fall back to eyeballing the tree and guessing props — exactly
  the failure modes P2/P5 name, and the ones an agent at scale commits most.

## More Information

New decision; introduces the composition graph the deduplication (P2) and API-derivation (P5) steps
depend on. Read by the **0051**-class structural skill (signature check), consumed by **0062** (API
from the `usedIn` union), and reconciled against the code-derived import graph in **0060** — the two
graphs are deliberately distinct (see the plan's §4). Figma's role stays the read-only hint of
**0045**. Component-deprecation graph hygiene (the fate of a node and its `usedIn` edges on retirement)
is owned by **0064**. Confirms problems P2 (structural duplication) and P5 (composition leaking into a
primitive). The graph's file location/schema home is an open question carried in the plan.

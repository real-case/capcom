---
name: component-signature
description: >-
  Before creating a new UI component, check it against the composition graph for
  structural duplication (ADR 0059, problem P2) — compute its v1 signature (the
  set of composed primitives) and see whether an existing component is the same
  structure or a near-match worth a human look. Use whenever about to add a
  component under src/components/**, when asked "does this already exist", "is
  this a duplicate component", "check the composition graph", or before scaffolding
  a composite from primitives.
---

# Composition-signature check (run BEFORE creating a component)

Problem P2 is building a second component that is structurally identical to one that
already exists (isomorphic composition). This skill makes "check before you create"
a step you actually run. It is **advisory** (Stage 2, recall over precision) — the
guarantees are the Stage-1 boundary + reconciliation gates (`check:boundaries`,
`check:graph`). Use it to *avoid* the duplicate in the first place.

## Run it

```bash
# Describe the component you are about to build:
npm run ds:signature -- --composed-of label,input --archetype container --role action-trigger --name field

# Inventory of every existing node's signature:
npm run ds:signature

# Classify an existing node against the rest (find dupes already in the graph):
npm run ds:signature -- --id card
```

`--composed-of` is the comma-separated set of existing primitive/component ids the
new component is built from (empty for a leaf primitive). `--archetype` and `--role`
are from the controlled vocabularies (`src/design-system/archetypes.ts`,
`usage-roles.ts`).

## How to read the verdict

- **⛔ structural DUPLICATE** (exit 1) — same composed set as an existing component.
  Do **not** create a new one; reuse the existing component.
- **⚠️ candidate(s)** (exit 0) — close enough to need a look. A genuine duplicate vs.
  a deliberate specialization is a **human** call (Stage 4, ADR 0061). If it is a
  deliberate specialization, proceed and record why in the component's
  `design-intent.ts` (ADR 0062); if it is a duplicate, reuse instead.
- **✓ no structural match** (exit 0) — clear to create.

## Signature v1 and its limits (ADR 0059)

The signature is the **normalized set of composed primitive ids — no topology**
(subtree isomorphism is nontrivial; fuzzy matching causes false positives). The
usage-role / archetype *adjacency amplifier* raises recall for the leaf case where the
set alone can't tell two primitives apart. Topology is added only if the Defect Log
(ADR 0064) shows confirmed missed duplicates. The matching heuristic lives in
[`scripts/component-signature.mjs`](../../../scripts/component-signature.mjs)
(`classifyCandidate`).

## After you add or recompose a component

Update [`src/design-system/composition-graph.json`](../../../src/design-system/composition-graph.json)
(the node, its `composedOf`, and every consumer's `usedIn`). `npm run check:graph`
reconciles the graph against the real import graph and **fails on drift** — so the
graph cannot silently fall behind the code (ADR 0059/0060, problem P9).

# Design-System Governance — process docs

The runtime artifacts of the design-system governance layer live in
[`src/design-system/`](../../src/design-system/) (token registry, controlled
vocabularies, state registries, composition graph) and beside each component
(`*.design-intent.ts`). This directory holds the **process** docs — the parts that are
journals and procedures rather than code.

The whole layer's design rationale and decisions are recorded in ADRs **0058–0064**
([`docs/decisions/`](../decisions/)).

| Doc                              | ADR         | What it is                                                                                                            |
| -------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------- |
| [`defect-log.md`](defect-log.md) | 0064        | Journal of _missing/ambiguous rules_; drives reactive fitness-function growth (a gap → a graduated Stage-1 check).    |
| [`governance.md`](governance.md) | 0061 / 0064 | 👤 procedures: controlled-vocabulary rename/merge/split, and component deprecation (graph node + `usedIn` edge fate). |

## The three-layer spine (where each rule lives)

1. **Deterministic** (CI gates, block merge) — _precision_. The guarantee.
   `check:tokens`, `check:boundaries`, `check:graph`, `check:design-intent`,
   `check:seals`, `check:i18n`; self-tested by `check:gates`.
2. **Structural** (skills + scripts, advisory) — _recall_. Reduces violation frequency
   in the agent loop; never the guarantee. `ds:signature`, `ds:states`,
   `ds:escalations`, `ds:tokens-table`, and the `check-tokens` / `component-signature` /
   `state-coverage` skills.
3. **Judgment** (human gates, ADR 0046) — _the irreducible_. `usageRole` collisions,
   state-set deviations, slot/flag boundaries, visual-baseline + Figma-drift approval.
   The agent _prepares_ (e.g. `ds:escalations`); the 👤 human _decides_.

## Run the whole deterministic bundle

```bash
npm run check:design-system   # tokens + boundaries + graph + design-intent + seals + i18n
npm run check:gates           # test-the-test: every custom gate rejects its violator
```

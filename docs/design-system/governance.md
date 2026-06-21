# Design-System Governance Procedures (ADR 0061 / 0064)

Two hygiene obligations ride along with the feedback loop (ADR 0064). Both are recorded
**before** the first such event, so the change is a governed migration rather than an
ad-hoc edit that fragments the artifacts. Both are 👤 **human-owned** (ADR 0046): the
agent prepares the migration and runs the mechanical checks; a human decides and signs
off.

## Owner

- **Design-system governance owner:** the repository maintainer (👤). Assigned before the
  first dictionary rename/merge/split or component deprecation. The owner approves
  vocabulary changes, runs the per-wave Defect-Log review (ADR 0064), and decides
  deprecations.

---

## 1. Controlled-vocabulary migration (rename / merge / split) — ADR 0061

The controlled vocabularies — `usage-roles.ts`, `archetypes.ts`, and the
`states.ts` / `state-precedence.ts` registries — are human-authored bottleneck
artifacts. **Adding** an entry is trivial and additive. **Renaming, merging, or
splitting** an entry is a migration of _every referencing intent file_, because the
union types make a broken reference a typecheck failure but cannot make the _decision_.

### Procedure

1. **Propose** the change with rationale (why the current vocabulary is wrong/too
   coarse/too fine). For a role/archetype this is effectively a small ADR-0061 amendment
   — record it (ADR 0001: decisions before code).
2. **Find every reference.** A vocabulary entry is referenced from:
   - `*.design-intent.ts` (`usageRole`, `meta.archetype`),
   - `composition-graph.json` (`archetype` per node),
   - stories / component code that name a state.
     Grep the entry name across `src/`; `tsc --noEmit` is the backstop — a dangling
     reference after the edit is a type error.
3. **Migrate atomically.** Rename/merge/split the vocabulary entry **and** every
   referencing file in one change. Never leave the union and its references out of sync.
4. **Re-run the gates:** `npm run typecheck` (broken refs), `npm run check:design-intent`
   (spec ↔ graph reconciliation), `npm run check:graph` (archetype-in-vocabulary).
5. **For a `usageRole` merge** specifically: a merge asserts two intents were the same.
   Confirm against the Stage-4 collision report (`npm run ds:escalations`) — a merge is
   the resolution of a real collision, not a convenience.
6. 👤 **Sign-off** by the governance owner; record the migration in the Defect Log if it
   was triggered by a defect (ADR 0064).

### Anti-patterns

- Editing the vocabulary and fixing references "later" — the typecheck gate will block,
  but a partial migration on a feature branch invites a bad merge.
- A rename that is really a **split** (one entry doing two jobs) done as a rename —
  decide the split first, then migrate each side.

---

## 2. Component deprecation — ADR 0064 (graph hygiene, problem P9)

When a component retires, its `composition-graph.json` node and `usedIn` edges have a
defined fate. Left undefined, the graph accretes dead nodes and the
import↔composition reconciliation (`check:graph`, ADR 0060) starts to **lie** — it
reconciles against edges that no longer reflect the code.

### Procedure

1. **Remove all call-sites first.** A node may only be deprecated once nothing imports
   it. `npm run check:graph` reconciles `usedIn` against the real import graph, so a
   lingering importer keeps the edge alive and blocks a clean removal — by design.
2. **Delete the node and its files together:** the component (`<name>.tsx`), its
   colocated `<name>.stories.tsx`, `<name>.design-intent.ts`, tests, and the
   `composition-graph.json` node. `check:design-intent` requires every node to have a
   spec and vice versa, so a half-deletion fails the gate.
3. **Re-point `composedOf`/`usedIn` of survivors.** If the retired component was
   `composedOf` by a composite, that composite must be recomposed (or also retired). The
   reconciliation gate fails until the graph matches the code.
4. **Run the bundle:** `npm run check:design-system` (tokens + boundaries + graph +
   design-intent + seals + i18n) must be green after the removal.
5. 👤 **Sign-off** by the governance owner; if the deprecation surfaced a rule gap (e.g.
   the graph would have lied), record it in the Defect Log.

### Why the gates make this safe

The reconciliation gates are bidirectional: code without a node fails, and a node
without code fails. So a deprecation cannot leave the graph half-true — either the
removal is complete and green, or the gate is red and names exactly what is dangling.

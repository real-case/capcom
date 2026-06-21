---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Module-boundary enforcement and graph reconciliation via dependency-cruiser

## Context and Problem Statement

**0059** introduces the composition graph as the *intent* model — what should compose what, decided
top-down. Nothing yet verifies that the *implemented* code obeys it. Two failure modes follow: a
**primitive importing a composite** (inverting the dependency direction and destroying reuse — a
composition requirement leaking down into a primitive, problem P5), and the **implementation
silently diverging** from the composition graph after it was approved (problem P9). The repo also has
no import-boundary enforcement at all: deep imports across `src/components/ui` internals, circular
dependencies, and orphan modules are currently invisible. The plan's §2 notes this tool is simply
*absent* here and must be adopted. This record adopts **dependency-cruiser** as the code-derived
import-graph authority and, crucially, defines the **reconciliation gate** that compares the import
graph (code, bottom-up) against the composition graph (intent, top-down, **0059**) — the mechanism
that answers "who keeps the graph honest."

## Decision Drivers

* **Enforce the dependency direction** — primitives must never import composites; this is the
  structural form of P5 and needs a merge-blocking check, not review.
* **Public-API-only imports** — components are consumed through their public entry (`index.ts`), not
  by reaching into internals, so refactors stay safe.
* **Catch cycles and orphans** — a circular dependency breaks the L1 wave topology (Stage 6) and an
  orphan node (no `usedIn`) is a dedup/dead-code smell (P2).
* **Reconcile intent vs. code (P9)** — a mismatch between the **0059** composition graph and the
  derived import graph must fail CI and force an update of one or the other; this is the anti-drift
  guarantee.
* **Glob-scoped component tier** — dependency-cruiser governs the `src/components` tier
  (`src/components/ui` primitives + composites above), which sits *outside* the Feature-Sliced layers
  added by **0065** (enforced separately by Steiger, **0066**); its boundaries are therefore expressed
  as path globs, not layer aliases.

## Considered Options

* **Adopt dependency-cruiser** as a CI gate (`depcruise --validate`) for boundary rules *and* run the
  composition↔import reconciliation against the **0059** graph
* **ESLint `no-restricted-imports`** — express boundaries as import-path lint rules, no graph tool
* **Convention + review** — document the boundaries and rely on review and the **0054** audit

## Decision Outcome

Chosen option: "adopt dependency-cruiser", because it is the one option that both enforces import
boundaries *and* can emit a machine-readable import graph to reconcile against **0059** — the
reconciliation is the whole point, and a lint rule cannot produce a graph to compare. `dependency-cruiser`
is added as a devDependency with a committed config authored for the `src/components` tier: boundaries
are path globs — `src/components/ui/**` is the *primitive* layer, composites/patterns live above it —
expressed as rules:

* **primitive↛composite** — a module under the primitive glob may not import one above it.
* **public-API-only** — cross-component imports go through the component's `index.ts`, not its internals.
* **`no-circular`** — a cycle fails (it also breaks the Stage-6 L1 wave ordering).
* **`no-orphans`** — a module with no inbound edge (no `usedIn`) is flagged as suspect (dead or
  un-deduplicated).

`depcruise --validate` runs in the existing quality gate (**0010**) beside the **0058** lints. Separately,
a **reconciliation step** compares the **0059** composition graph to the derived import graph; a mismatch
(a `composedOf` edge with no corresponding import, or an import with no design edge) fails CI and forces
an update of either the graph or the code — the same generate-then-assert-no-drift discipline as
`gen:types` (**0015**). Honoring the bootstrap-lean posture (**0010**), if `depcruise` proves heavy it may
run inert/local until justified, mirroring the Phase-7 e2e and Phase-10 smoke deferrals — but the rules
and config land now.

### Consequences

* Good, because the dependency direction and public-API boundary become guarantees (P5), not review
  hopes — a primitive importing a composite turns the build red.
* Good, because the reconciliation gate makes **0059** self-policing: code and intent cannot silently
  diverge (P9); whoever changes one is forced to update the other.
* Good, because `no-circular`/`no-orphans` surface dead and tangled modules that erode dedup (P2) and
  break wave topology (Stage 6).
* Bad, because dependency-cruiser config for the glob-scoped component tier is hand-authored glob logic that must be
  kept correct as the structure evolves — a maintenance surface of its own.
* Bad, because the reconciliation step is only as good as the **0059** graph's freshness; a stale graph
  produces false mismatches, so it couples to **0064** deprecation hygiene.

### Confirmation

`dependency-cruiser` is a committed devDependency with a repo-specific config; `depcruise --validate` runs
in CI (**0010**). A planted primitive→composite import, a deep internal import bypassing `index.ts`, an
introduced cycle, and an orphan module each fail the gate; removing the violation turns it green. A
hand-edited divergence between the **0059** composition graph and the code's imports fails the
reconciliation step (a `database.types`-style drift, **0015** precedent). Subject to the **0054** drift
audit once accepted.

## Pros and Cons of the Options

### Adopt dependency-cruiser (chosen)

* Good, because it enforces boundaries and emits the graph the **0059** reconciliation needs.
* Good, because `no-circular`/`no-orphans` come for free and protect the wave topology.
* Neutral, because the bootstrap-lean posture may keep it local until justified.
* Bad, because these component-tier boundaries are glob-expressed config to maintain, and reconciliation depends on
  graph freshness.

### ESLint `no-restricted-imports`

* Good, because it reuses the existing ESLint gate with no new tool.
* Bad, because it can forbid import paths but cannot emit an import graph, so the **0059** reconciliation
  — the central P9 guarantee — is impossible; it solves the small half and drops the large one.

### Convention + review

* Good, because zero tooling.
* Bad, because boundary violations and intent/code drift are exactly what review misses at scale; the
  **0054** audit is a periodic backstop, not a per-PR gate.

## More Information

New decision; adopts the dependency-cruiser devDependency the plan's §2 notes is absent. Verifies the
*code* against the *intent* graph of **0059** — the two graphs are deliberately distinct (plan §4): this
record builds the import graph and the reconciliation; **0059** owns the composition graph. Runs in the
**0010** CI gate beside the **0058** token lints; mirrors **0015**'s drift-check discipline; couples to
**0064** for graph/deprecation hygiene. The primitive-vs-composite glob expression for the
component tier is an open question carried in the plan. Confirms problems P5 (composition leaking into a
primitive), P2 (orphans/duplication), and P9 (artifact↔code drift).

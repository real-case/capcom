---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Enforce Feature-Sliced Design boundaries with Steiger

## Context and Problem Statement

**0065** adopts Feature-Sliced Design and defines the layers and their allowed import
direction — but, as **0060** established for the component tier, a structure that is only
*documented* drifts. The FSD failure modes (a higher layer imported by a lower one, two
sibling slices importing each other, a deep import that bypasses a slice's public API) are
precisely what code review misses at scale. The project's standard answer is a deterministic,
merge-blocking gate (the **0058**/**0060** precedent). This record chooses the tool and wires
the gate that makes **0065** enforceable rather than aspirational — "not just prose."

## Decision Drivers

* **Determinism** — the same tree must always pass or fail the same way; the gate blocks merge
  (**0010**), it is not advisory.
* **FSD-native rules** — layer-direction, slice-isolation, and public-API rules should come
  from a tool that *models FSD*, not be hand-encoded.
* **Disjoint from the existing boundary gate** — dependency-cruiser already owns
  `src/components/**` (**0060**); the FSD gate must operate on a non-overlapping scope so the
  two never contradict.
* **Self-testing** — like every custom gate here, it must be proven to reject its violator (the
  P6 "test the test" harness, `check:gates`).
* **Bootstrap-lean** — minimal new surface, runs in the existing CI job (**0010**), and stays
  TypeScript-clean (**0003**).

## Considered Options

* **Steiger** (`steiger` + `@feature-sliced/steiger-plugin`) — the official FSD structure
  linter.
* **Extend dependency-cruiser** (**0060**) with hand-written FSD layer / slice / public-API
  rules.
* **`eslint-plugin-boundaries`** — express FSD as ESLint element/zone rules.
* **Prose + review** — document **0065** and rely on review and the **0054** audit.

## Decision Outcome

Chosen option: "Steiger", because it is the only option that *models FSD natively* — its
recommended ruleset already encodes layer-direction (`fsd/forbidden-imports`), slice isolation,
public-API requirements (`fsd/public-api`, `fsd/no-public-api-sidestep`), and structural
hygiene — so the gate is a config, not a body of hand-maintained glob logic that re-derives FSD
by hand (the cost dependency-cruiser carries for the non-FSD `src/components` tier, **0060**).
`steiger` + `@feature-sliced/steiger-plugin` are committed devDependencies; `steiger.config.ts`
enables `fsd.configs.recommended` and scopes it to the **0065** layers by `ignores`-listing
everything pre-FSD (`src/app`, `src/components`, `src/design-system`, `src/lib`, `src/i18n`,
loose files, and colocated tests/stories) — a scope deliberately disjoint from the
dependency-cruiser gate. `npm run check:fsd` (`steiger ./src`) runs as its own step in the
quality gate (**0010**) beside `check:boundaries`, and the `check:gates` harness plants a
`features → widgets` upward import and asserts Steiger rejects it citing `fsd/forbidden-imports`
(P6).

Because Steiger infers the layer hierarchy from canonical folder names, this decision is
load-bearing on **0065**'s choice to keep those names canonical: a renamed layer would pass the
gate while no longer being understood by it.

### Consequences

* Good, because **0065**'s import direction becomes a guarantee — an upward or cross-slice
  import, or a public-API sidestep, turns the build red rather than drawing a review comment.
* Good, because the FSD rules are maintained by the plugin, not by us; upgrades track the
  methodology instead of bespoke glob logic.
* Good, because the `check:gates` self-test makes a silently-broken FSD gate itself a CI failure
  (P6).
* Bad, because it is a second boundary tool beside dependency-cruiser; the disjoint-scope split
  must be kept correct as the tree evolves (mitigated: the `ignores` list and the **0060** glob
  are both committed and reviewed).
* Bad, because Steiger is pre-1.0 (0.x); its rule set or config shape may shift — a maintenance
  watch shared with any dependency (**0057**).

### Confirmation

`steiger` + `@feature-sliced/steiger-plugin` are committed devDependencies; `npm run check:fsd`
runs in CI (**0010**). A planted `features → widgets` import fails the gate citing
`fsd/forbidden-imports`; removing it turns the gate green — and `check:gates` asserts exactly
this rejection so the guard is itself guarded (P6). The scope is disjoint from `check:boundaries`
(**0060**): Steiger ignores `src/components/**`, which dependency-cruiser owns. Subject to the
**0054** drift audit once accepted; acceptance is the human gate (**0046**).

## Pros and Cons of the Options

### Steiger (chosen)

* Good, because it models FSD natively — layer-direction, slice isolation, and public-API rules
  are built in, so the gate is configuration rather than hand-written graph logic.
* Good, because the ruleset is maintained upstream and tracks the FSD methodology.
* Neutral, because it runs as a second boundary tool beside dependency-cruiser, kept safe by a
  disjoint scope.
* Bad, because it is pre-1.0 and may change shape, and the scope split is a small standing
  maintenance surface.

### Extend dependency-cruiser

* Good, because it reuses the one boundary tool already present (**0060**) — no new dependency.
* Bad, because FSD's layer-rank, slice-isolation, and public-API rules would be re-encoded by
  hand as glob/regex logic and kept correct by us — exactly the maintenance cost that makes a
  purpose-built linter preferable for a methodology this structured.

### `eslint-plugin-boundaries`

* Good, because it lives inside the existing ESLint gate (**0006**).
* Bad, because its element/zone model is generic, not FSD-aware; the layer hierarchy and
  public-API conventions still have to be spelled out manually, and it overlaps awkwardly with
  the **0058** token rules already in that config.

### Prose + review

* Good, because zero tooling.
* Bad, because import-direction and public-API violations are exactly what review misses at
  scale; this defeats the "not just prose" intent and reduces **0065** to aspiration.

## More Information

New decision; the enforcement half of **0065**, mirroring how **0060** enforces **0059**. Runs
in the **0010** quality gate beside the **0058** token lints and the **0060** boundary gate, on
a disjoint scope. Steiger: <https://github.com/feature-sliced/steiger>.

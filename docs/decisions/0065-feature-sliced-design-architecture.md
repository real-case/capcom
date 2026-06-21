---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Adopt Feature-Sliced Design for application architecture

## Context and Problem Statement

The repo standardizes the *component* tier deeply — a primitive kit (`src/components/ui`,
**0034**), token / vocabulary / composition-graph governance (**0058**–**0064**), and a
dependency-cruiser boundary on `src/components/**` (**0060**). What it has **no** standard
for is the *application* tier: where a feature's data access, state, UI, and the page that
wires them together should live, and which of those may import which. Today everything above
the primitives would accrete ad hoc under `src/app` and `src/lib`, with import direction
enforced by nothing. As soon as real features land, that produces the usual entropy — a
"user profile" feature reaching into an unrelated "billing" feature, a UI component importing
a route, circular tangles — none of it catchable by review at scale. This record adopts
**Feature-Sliced Design (FSD)** as the application architecture: a fixed set of layers with a
strict, machine-checkable import direction. It is the *structure / intent* decision; the
deterministic gate that enforces it is **0066** (the same model/enforcement split as
**0059**/**0060**).

## Decision Drivers

* **A standard home for application code** — features, entities, and composite UI need
  defined locations, not "somewhere under `src/app` / `src/lib`".
* **Enforceable import direction** — higher layers may depend on lower, never the reverse,
  and slices within a layer stay isolated. This has to be a gate, not a convention (delivered
  by **0066**).
* **Additive, low-risk adoption** — the bootstrap has working Next routing, i18n, and the
  **0058**–**0064** governance layer; introducing FSD must not disturb them (bootstrap-lean
  posture of **0010**; human-only gates of **0046**).
* **Canonical, tool-checkable names** — the enforcing linter derives the layer hierarchy from
  folder *names*, so the layers must keep their canonical FSD names or the gate silently stops
  understanding them.
* **No clash with Next routing** — Next reserves `app/` (and `pages/`) for routing (**0002**,
  CON-002); the FSD layout must coexist with the existing `src/app` App Router.

## Considered Options

* **Full canonical FSD incl. a `pages` layer** — move Next routing to a root `app/` (plus an
  empty root `pages/`), making `src/{app,pages,widgets,features,entities,shared}` all pure FSD
  layers.
* **Additive 4-layer FSD** — add `src/{shared,entities,features,widgets}` with canonical names;
  keep Next's `src/app` as the routing + page-composition root (it plays the FSD app/pages
  role); leave the **0058**–**0064** governance layer and `src/lib` / `src/i18n` in place,
  outside the FSD model.
* **No FSD / status quo** — keep an ad-hoc `src/app` + `src/lib` structure and rely on review
  for import discipline.

## Decision Outcome

Chosen option: "additive 4-layer FSD", because it delivers the full benefit FSD is wanted for
— a standard home for application code with an *enforceable* dependency direction — at the
lowest risk to a working bootstrap, and without sacrificing the gate. Layers `src/shared`,
`src/entities`, `src/features`, `src/widgets` are introduced with their **canonical** FSD names
(so **0066**'s `forbidden-imports` understands the hierarchy); Next's existing `src/app` is
left untouched and serves as the composition root that consumes `widgets` — the FSD app/pages
role. The dependency direction is `app → widgets → features → entities → shared`; same-layer
slices are isolated; every slice is consumed through its public `index.ts`.

A dedicated `pages` layer is deliberately **not** added: a real `src/pages` would be claimed by
Next's Pages Router, and renaming it (e.g. `views`) would strip the layer of its canonical name
and silently disable `forbidden-imports` for it (**0066**). Under the App Router the `src/app`
route files are the natural page tier, so the layer is redundant here.

FSD is **additive**: the primitive kit (`src/components/ui`, **0034**), the design-system
governance artifacts (`src/design-system`, **0058**–**0064**), and the pre-FSD infrastructure
(`src/lib`, `src/i18n`) are **not** relocated. They are conceptually "shared" but remain in
place and outside the FSD-governed scope; the `src/components/**` boundary stays owned by
dependency-cruiser (**0060**) on a scope disjoint from the FSD gate. New, FSD-native
application code lands in the new layers.

### Consequences

* Good, because application code gains a standard, predictable shape and an import direction
  that is *enforced* (**0066**), not merely documented — the failure modes (cross-feature
  coupling, UI-imports-route, cycles) turn the build red.
* Good, because adoption touches nothing load-bearing: Next routing, i18n, and the
  **0058**–**0064** governance layer are untouched, so the change is reversible and low-risk.
* Good, because keeping canonical layer names makes the enforcement real rather than cosmetic —
  a renamed layer would defeat the linter (**0066**).
* Bad, because two notions of "shared" coexist during bootstrap — the new `src/shared` and the
  legacy `src/components/ui` + `src/lib` — which must be explained (this record plus the layer
  READMEs) until/unless a future ADR consolidates them.
* Bad, because the absent `pages` layer is a deviation from textbook FSD that a newcomer must
  understand; mitigated by the `src/app` route files filling that role and the rationale
  recorded here.

### Confirmation

The layer structure exists under `src/` (`shared`, `entities`, `features`, `widgets`), each
with a README stating its allowed imports. Compliance is asserted not by this record but by its
enforcement counterpart **0066**: Steiger, scoped to these layers, fails CI (**0010**) on any
upward or cross-slice import or public-API sidestep, while the **0060** dependency-cruiser gate
continues to own `src/components/**`. Subject to the **0054** drift audit once accepted;
acceptance is the human gate (**0046**).

## Pros and Cons of the Options

### Additive 4-layer FSD (chosen)

* Good, because it gives application code a standard, enforceable shape immediately, with a gate
  (**0066**) rather than a convention.
* Good, because it is purely additive — Next routing, i18n, and the **0058**–**0064** governance
  layer are untouched, so risk and reversibility are excellent for a bootstrap.
* Good, because every layer keeps its canonical FSD name, which is what lets the linter actually
  enforce the hierarchy.
* Neutral, because `src/app` doubles as the app/pages tier instead of a dedicated `pages` layer —
  idiomatic for App Router, a small deviation from textbook FSD.
* Bad, because "shared" is temporarily split between the new `src/shared` and the legacy
  `src/components/ui` + `src/lib`, a seam to document until a future consolidation ADR.

### Full canonical FSD incl. a `pages` layer

* Good, because it is textbook FSD — every layer including `pages` is a pure FSD layer.
* Bad, because it requires relocating the entire working `src/app` routing tree (i18n
  `[locale]`, layout, error boundaries, sitemap/robots, providers, global styles) to a root
  `app/`, high churn and regression risk against **0002** for no enforcement benefit the 4-layer
  set lacks.
* Bad, because it adds a second `app` directory (root routing vs. `src/app` FSD layer), a
  standing source of confusion.

### No FSD / status quo

* Good, because zero new structure or tooling.
* Bad, because the application tier stays unstandardized and its import direction unenforced —
  exactly the entropy this record exists to prevent; the **0054** audit is a periodic backstop,
  not a per-PR gate.

## More Information

New decision. Splits structure (this record) from enforcement (**0066**), mirroring
**0059**/**0060**. Coexists with **0002** (App Router, CON-002) and the **0058**–**0064**
design-system governance, which it neither replaces nor modifies. Feature-Sliced Design
reference: <https://feature-sliced.design>.

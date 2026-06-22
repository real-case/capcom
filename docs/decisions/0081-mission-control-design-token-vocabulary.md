---
status: "proposed"
date: 2026-06-22
decision-makers: Yurii Anichkin
---

# Mission-control design-token vocabulary on a re-introduced primitive layer

## Context and Problem Statement

CAPCOM is a multi-tenant data-visualization dashboard whose visual identity is
mission-control / aerospace-telemetry: dark-first, information-dense, calm under load. The
neutral shadcn baseline shipped by **0033** has no vocabulary for that domain — no surface
hierarchy (background → panel → elevated → overlay), no mission-control **status** semantics
(nominal / caution / warning / critical, each with foreground / background / border), no
**data-visualization** palette (a colorblind-safe categorical set plus sequential and diverging
scales), and no metric-oriented **type-scale roles** (`metric-hero`, `metric`, `label`, `body`,
`caption`, `mono-data`). This record decides the token vocabulary the dashboard's components will
consume, and where its raw values live.

**0033** already anticipates the structural answer: "when a consumer wires a real design export,
it reintroduces the primitive and component-token layers and points the value layer at them (the
bridge and `gen:tokens` stay put)." The mission-control palette is exactly that real design data.
The open question is whether to add the vocabulary directly to the value layer (`:root`) or to
reintroduce the **primitive layer** `0033` describes — a choice forced by the multi-tenancy model
in **0082**, where a tenant must be able to re-compose the whole palette by swapping *primitives
only*, leaving the semantic layer and components untouched. A semantic-only extension cannot offer
a single primitive swap point; a primitive layer can.

The vocabulary must remain code-canonical (**0032**/**0033**) and parseable by the single-source
token codegen (**0058**), whose `gen:tokens` output is CI drift-checked like `gen:types`
(**0015**).

## Decision Drivers

* **Mission-control fidelity** — a dark-first surface hierarchy, status semantics in
  mission-control vocabulary (not generic success/error), and a dense, legible data-viz palette.
* **One swap point for multi-tenancy** — the vocabulary must rest on a primitive layer a tenant
  can redefine wholesale (**0082**), so the semantic layer and components never change per tenant.
* **Single source of truth** — one definition parsed once by the codegen (**0058**) into the typed
  union, the lint allowlist, and the agent rules; no hand-maintained token lists (**0058**).
* **Accessibility as a constraint, not an afterthought** — status foreground/background pairs must
  clear WCAG 2.2 AA contrast and the categorical viz palette must be colorblind-safe.
* **Realize 0033's documented evolution** — the primitive layer is the re-adoption path **0033**
  already records, not a new invention.

## Considered Options

* **Re-introduce a `--c-*` primitive layer and build the semantic vocabulary on it** — raw palette
  in `:root` under a `--c-` prefix; semantic value-layer vars reference primitives via `var()`;
  the `@theme inline` bridge exposes `--color-*` utilities; the codegen gains prefix-awareness and
  a swap-only invariant.
* **Add the mission-control vocabulary directly to the value layer (no primitive layer)** — define
  `--surface-*`, `--status-*`, `--viz-*` straight in `:root` with literal `oklch` values.
* **Carry the palette as a Tailwind `@theme` block of literal values** — skip the value/primitive
  split and define everything as static `@theme` tokens.

## Decision Outcome

Chosen option: **"re-introduce a `--c-*` primitive layer and build the semantic vocabulary on
it"**, because it is the only option that lets a tenant re-compose the entire palette through one
swap point (**0082**) while leaving every semantic token and component untouched — and it is
precisely the layered re-adoption **0033** documents. Concretely, `src/app/globals.css` gains,
**additively** (the existing neutral shadcn chrome tokens are left untouched):

* a **primitive layer** in `:root`, every name prefixed `--c-`: a dark-tuned neutral ramp,
  an accent hue, four status hues, a colorblind-safe categorical viz set (`--c-viz-cat-01..12`),
  sequential and diverging viz ramps, and the density **dimension primitives**
  (`--c-space-*`, `--c-row-height`, `--c-control-height`, `--c-font-size-*`);
* a **semantic layer** of mission-control value-layer vars referencing primitives via `var(--c-*)`:
  surfaces (`--surface-background|panel|elevated|overlay`), text roles, status
  (`--status-{nominal|caution|warning|critical}-{fg|bg|border}`), viz
  (`--viz-categorical-1..N`, `--viz-sequential-*`, `--viz-diverging-*`), `--border-hairline`,
  `--divider`, `--elevation-low`, and motion timing (`--motion-duration-*`, `--motion-ease-*`),
  all **dark-first by value**;
* `@theme inline` **bridges** exposing the semantic layer as Tailwind utilities
  (`--color-surface-*`, `--color-status-*`, `--color-viz-*`, the `--text-*` type-scale roles), so
  components consume `bg-surface-panel` / `text-status-caution-fg` and inherit any tenant swap.

The technical display face for numerics is the already-wired monospace (`--font-mono`,
geist-mono): a monospaced face gives tabular figures for metrics with **no new font wiring**.

**This record knowingly diverges from one prediction in 0033.** **0033** says that wiring an
export leaves "the bridge and `gen:tokens` … unchanged." Here `gen:tokens` *is* changed: the
codegen (**0058**) gains a `--c-` prefix split (emitting a `PRIMITIVE_VARIABLES` set distinct from
the value-layer `THEME_VARIABLES`) and a **swap-only invariant** that fails the build if a tenant
or density block (**0082**) declares anything other than an existing primitive. The primitive
layer is *enforced*, not merely declared — a deliberate strengthening of `0033`'s vestigial-layer
note, recorded here so the divergence is intentional and legible.

### Consequences

* Good, because a tenant re-composes the full palette through one primitive swap point with zero
  changes to the semantic layer or components (**0082**).
* Good, because the vocabulary stays code-canonical and single-source: one parse feeds the typed
  union, the lint allowlist, and the agent rules (**0058**).
* Good, because accessibility is a build gate, not a hope: `check:contrast` (this record's
  Confirmation) computes WCAG 2.2 AA contrast over the resolved `oklch` values and fails CI on a
  sub-AA pair — a fitness function in the **0064** sense.
* Good, because it realizes the layered architecture **0033** already documents, rather than
  forking the token model.
* Bad, because `globals.css` grows substantially and now carries product design data (the
  brand-neutral baseline of **0033** is, for this project, deliberately left behind).
* Bad, because `gen:tokens` is no longer the untouched codegen **0033** predicted — the prefix
  split and swap-only invariant are new surface that must itself be maintained and self-tested.

### Confirmation

`npm run gen:tokens` regenerates the typed union, lint allowlist, and agent rules from
`globals.css` and leaves a clean `git status` (the CI drift gate, **0058**/**0015**); the generated
`tokens.generated.ts` carries the new `--color-*` semantic tokens and a `PRIMITIVE_VARIABLES`
union, and `npm run typecheck` passes. The new **`check:contrast`** gate (`scripts/check-contrast.mjs`,
wired into `package.json` and the CI quality job) resolves each status foreground/background pair
and each text-on-surface pair through the primitive layer, converts `oklch` → sRGB → relative
luminance → WCAG 2.x ratio, and fails the build on any pair below AA — the automated fitness
function for the accessibility driver (**0064**). The categorical viz palette's colorblind-safety
is confirmed by human review (it graduates to an automated check once a CVD model is chosen,
**0064**). `npm run lint`, `npm run format:check`, and `npm run build` pass.

## Pros and Cons of the Options

### Re-introduce a `--c-*` primitive layer (chosen)

* Good, because it gives the single primitive swap point multi-tenancy needs (**0082**) without
  touching semantic tokens or components.
* Good, because it is the exact re-adoption path **0033** documents, and the codegen single source
  (**0058**) is preserved (extended, not forked).
* Neutral, because it adds a prefix convention (`--c-`) and a swap-only invariant the codegen must
  enforce and self-test.
* Bad, because `globals.css` grows and the codegen is no longer the untouched script **0033**
  predicted.

### Add the vocabulary directly to the value layer (no primitive layer)

* Good, because it is the smallest diff and needs no codegen change.
* Bad, because a tenant would then override the *semantic* layer directly — there is no primitive
  layer to swap — so the brief's "a tenant redefines the primitive layer only" rule cannot hold and
  the two layers are not strictly separated (**0082**).

### Palette as a static `@theme` block of literal values

* Good, because `@theme` tokens emit Tailwind utilities directly.
* Bad, because static `@theme` values cannot be swapped at runtime by `[data-tenant]` /
  `[data-density]` (**0082**); runtime re-composition requires value-layer `var()` indirection, which
  this option discards.

## More Information

Extends **0033** (the token layers and the `@theme inline` bridge) and is consumed by **0032**
(CSS-first Tailwind) and **0058** (the single-source codegen + token-usage lint). The runtime
re-composition mechanism — `[data-tenant]` primitive swaps and `[data-density]` dimension swaps —
is decided separately in **0082**, which also records the swap-only invariant this vocabulary
depends on. The accessibility fitness function follows the reactive-growth posture of **0064**.
Controlled-vocabulary discipline (archetypes, states) for the components that will consume these
tokens lives in **0061**; those components are deferred to later records and slices. Token values
remain code-canonical and the figma MCP server read-only (**0045**); adding or renaming a token is
a human-reviewed change (**0046**).

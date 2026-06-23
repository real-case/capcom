---
status: "accepted"
date: 2026-06-22
decision-makers: Yurii Anichkin
---

# Charting primitive layer: visx + design tokens

## Context and Problem Statement

The reduced rows that the aggregation-strategy record returns have to be drawn — trend lines,
funnel bars, the signature retention heatmap, segment distributions. CAPCOM's design-token
governance (**0058**) is strict: in `src/components/**` there are **no raw color or size
literals, no inline-`style` raw values, no raw SVG `fill`/`stroke`, and no Tailwind
numbered-palette classes** — every visual value must be a `var(--token)` drawn from the
**generated** allowlist, and the mission-control palette (**0081**) already defines the
data-visualization colors as tokens (a colorblind-safe categorical set plus sequential and
diverging scales). This record decides the **charting primitive layer**: which library (if any)
the chart widgets are built from, chosen so that *tokens own every pixel* rather than the
library owning a palette the token gate cannot see.

The tension is concrete. A batteries-included charting library ships its own theme and bakes
colors into its components — convenient, but it fights **0058** (raw values inside the library's
render) and **0081** (its palette is not the token palette). A lower-level primitive library
exposes scales and shapes and leaves every color to the caller — more assembly, but every value
can be a token. This is the trade-off the decision turns on.

Bounding context: React 19 Server Components with the React Compiler owning memoization
(**0002/0029**); dark-first value layer with no runtime light/dark toggle (**0079**); the axe
a11y gate at WCAG 2.2 AA over every story (**0039**) and the semantic-a11y pass (**0052**);
deterministic SVG for Chromatic visual regression (**0043**); production dependencies confined
to the SPDX license allowlist (**0071**).

## Decision Drivers

* **Tokens must own every pixel (0058/0081).** The charting layer must let color and size come
  exclusively from the generated token allowlist — no library-baked palette, no raw SVG
  `fill`/`stroke`.
* **The mission-control data-viz palette is already tokens (0081).** Categorical, sequential,
  and diverging scales exist as `--c-*`/semantic tokens; the chart layer should map a data
  domain onto those tokens directly.
* **React-native, Compiler-friendly (0002/0029).** Charts are React components composing with
  the existing model; no imperative canvas lifecycle fighting the Compiler.
* **Control over dense infographics.** The retention heatmap and funnel are bespoke, dense
  visuals; the layer must expose scales/axes/shapes to build them, not just preset chart types.
* **Determinism for Chromatic (0043).** Rendered SVG must be deterministic (no time/random in
  layout) so visual regression is stable.
* **Accessibility (0039/0052).** SVG charts need explicit roles/labels; the layer must not
  obstruct adding them.
* **License + supply chain (0071/0069).** The dependency must sit within the SPDX allowlist.

## Considered Options

* **A — visx** (low-level D3-based React primitives: `@visx/scale`, `@visx/shape`, `@visx/axis`,
  `@visx/group`, …), unstyled by default, colors supplied from the token allowlist.
* **B — Recharts** (higher-level composable React charts).
* **C — Hand-rolled SVG** + `d3-scale`, no charting dependency.

## Decision Outcome

Chosen option: **A — visx primitives**, because it is the only option where **tokens own every
pixel by construction**: visx ships scales and shapes but no theme, so every color is passed in
as a `var(--token)` from the **0081** palette and the **0058** gate passes natively. It is
React-native (composing with **0002/0029**), gives full control over the dense mission-control
infographics, and renders deterministic SVG for Chromatic (**0043**). Recharts bakes a palette
and styling into its components — indirect theming that fights **0058**/**0081**; hand-rolled
SVG keeps total control but re-implements axes, scales, and ticks tediously and error-prone for
no real gain over visx's primitives.

The layer this record fixes:

* **visx as the primitive vocabulary.** Chart **widgets** (FSD `widgets/*`) are assembled from
  visx scales/shapes/axes; visx is a `shared`-level charting primitive dependency, not a
  per-widget import sprawl.
* **Every visual value is a token.** Color and size come from the generated allowlist — scale
  *ranges* are token colors (the **0081** categorical/sequential/diverging sets), stroke widths
  and radii are size tokens. No raw `fill`/`stroke`, no inline raw values, no numbered Tailwind
  palette (**0058**).
* **Dark-first, single value layer (0079).** Charts read the dark value layer; no light/dark
  toggle is introduced (that remains **0079**'s deferred decision).
* **Presentational only.** Chart widgets receive **already-reduced** rows (from the
  aggregation-strategy RPCs via TanStack Query) as props; they own no data fetching and no
  aggregation — consistent with the state-home split and the aggregation record.
* **Accessible and deterministic.** Each chart carries explicit ARIA roles/labels for the axe
  gate (**0039**) and the semantic pass (**0052**); layout is pure of time/random so Chromatic
  (**0043**) is stable.

### Consequences

* Good, because the token gate (**0058**) passes by construction — there is no library palette
  to launder, and the colorblind-safe **0081** scales wire straight through visx scale ranges.
* Good, because visx's primitives give full control over the dense, bespoke infographics (cohort
  heatmap, funnel) that are the demo's visual signature.
* Good, because it is React-native and Compiler-friendly (**0002/0029**) and renders
  deterministic SVG for Chromatic (**0043**).
* Good, because visx is MIT-licensed — within the SPDX allowlist (**0071**).
* Bad, because more is assembled per chart than with a batteries-included library — axes,
  legends, tooltips are hand-wired; mitigated by sharing chart sub-primitives so each widget
  composes rather than rebuilds them.
* Bad, because SVG chart accessibility is manual work (roles, labels, focus order) rather than
  automatic; owned explicitly under **0039/0052**, not assumed.
* Bad, because visx adds a dependency surface (several `@visx/*` packages) subject to the audit
  (**0069**) and license (**0071**) gates — acceptable, MIT, and tree-shakeable.

### Confirmation

* The token-usage gate `check:tokens` (**0058**) passes over every chart widget — no raw
  color/size literal, no raw SVG `fill`/`stroke`, no numbered palette; colors trace to the
  generated allowlist.
* The license gate `check:licenses` (**0071**) admits the `@visx/*` packages (MIT); `npm audit`
  (**0069**) is clean.
* Each chart widget ships Storybook states — **empty / loading / error / overflow** — and clears
  the axe a11y gate at WCAG 2.2 AA (**0039**); a reviewer applies the semantic pass (**0052**).
* Chart rendering is deterministic (no `Date.now`/random in layout), confirmed by stable
  Chromatic snapshots (**0043**).
* The diff reviewer confirms chart widgets are **presentational** — they receive reduced rows as
  props and contain no fetching or aggregation.

## Pros and Cons of the Options

### A — visx primitives

Unstyled D3-based React primitives; the caller supplies every color/size from tokens.

* Good, because there is no baked palette — tokens own every pixel and **0058** passes natively.
* Good, because the **0081** categorical/sequential/diverging scales map directly onto visx
  scale ranges.
* Good, because it is React-native and gives full control over bespoke dense charts.
* Good, because output is deterministic SVG (**0043**) and it is MIT-licensed (**0071**).
* Neutral, because it is lower-level — power in exchange for assembly.
* Bad, because axes/legends/tooltips and SVG a11y are hand-built per chart.

### B — Recharts

Higher-level composable chart components.

* Good, because charts come together fast with little boilerplate.
* Neutral, because some theming is possible via props.
* Bad, because it bakes a palette and styling into its components — **indirect** theming that
  fights the **0058** "tokens only / no raw values" gate and the **0081** palette.
* Bad, because customizing the dense bespoke infographics pushes against its preset chart model.

### C — Hand-rolled SVG + d3-scale

Compute scales with `d3-scale`; emit SVG by hand; no charting library.

* Good, because it is maximally controllable and adds the smallest dependency (`d3-scale`).
* Good, because every value is trivially a token.
* Bad, because it re-implements axes, ticks, gridlines, and shape generators that visx already
  provides — tedious and error-prone for no advantage over A.
* Bad, because the maintenance surface of bespoke chart math is larger than adopting tested
  primitives.

## More Information

This record completes PR-1: with the event model (**0083**), the aggregation strategy (**0084**), and the
ingestion contract (**0085**) decided, the charting layer fixes how reduced rows are rendered. It is bound
by the design-token governance (**0058**) and the mission-control palette (**0081**), the
dark-first deferral (**0079**), the React model (**0002/0029**), and the Storybook/a11y/visual
gates (**0039/0052/0043**) within the dependency gates (**0069/0071**). It is realized from PR-4
onward — `widgets/trends-chart`, `widgets/funnel-chart`, `widgets/cohort-grid`,
`widgets/segment-distribution` — each consuming an aggregation RPC. The decision should be
revisited if a future need (e.g. very large client-side datasets) makes a canvas/WebGL renderer
necessary, which would be a new ADR rather than an edit here.

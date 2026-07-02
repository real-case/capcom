---
status: "accepted"
date: 2026-07-02
decision-makers: Yurii Anichkin
---

# Chart interaction layer over visx: tooltip, crosshair, hover, motion

## Context and Problem Statement

ADR **0086** fixed visx as the charting primitive layer — token-governed and **presentational**,
but deliberately **static**: trend lines are a bare `LinePath` plus axes, the signature retention
heatmap is a grid of `Bar` shapes, and nothing responds to the pointer. The refreshed product goal
raises the data-viz bar to modern premium: hover **tooltips**, a **crosshair** / focus line, series
**hover-highlight**, **gradient / area** fills, entrance **motion**, **interactive** (switchable)
legends, and a time **brush**.

The tension is that each of these adds a new visual surface or behavior that could quietly break an
**0086** invariant: a tooltip or gradient could smuggle a raw color/size value past the token gate
(**0058** / **0081**); an in-chart brush could tempt the widget into fetching (breaking the
presentational rule); animation and pointer state are nondeterministic and could destabilize the
Chromatic baseline (**0043**); and interactive SVG needs keyboard access and non-color affordances
for a11y (**0039** / **0052**). This record decides **how a rich interaction layer is added over
visx while every 0086 invariant continues to hold**.

## Decision Drivers

* **Premium data-viz affordances** — tooltip, crosshair, hover-highlight, gradient/area, motion,
  interactive legend, and time brush are required by the product goal.
* **Token-ownership holds (0058/0081)** — every new surface (tooltip bg/border/text, gradient stops,
  crosshair stroke, brush handle) must be a `var(--token)`; no raw `fill` / `stroke`, no inline raw
  values, no numbered Tailwind palette.
* **Presentational purity holds (0086)** — interaction is **view-state** local to the widget; a
  brush that changes the analysis window round-trips through URL-state (nuqs, **0027**) at the
  feature, never a fetch inside the chart.
* **Chromatic determinism (0043)** — motion and pointer interaction must resolve to a static default
  state in the snapshot environment so visual regression stays stable.
* **Accessibility (0039/0052)** — data points keyboard-navigable, tooltip content in the a11y tree,
  a non-color affordance for highlight, and `prefers-reduced-motion` respected.
* **Reuse, not sprawl (0086)** — a shared interaction sub-primitive layer every chart composes,
  rather than each widget re-implementing tooltips and motion.
* **Theme-aware (the theme-system record, 0092)** — once the light/dark theme system lands,
  interaction surfaces read the active composition; until then they read the current dark layer.

## Considered Options

* **A — A shared in-house interaction layer built on visx's own interaction primitives**
  (`@visx/tooltip`, `@visx/gradient`, `@visx/brush`, `@visx/event`) plus a reduced-motion-guarded
  CSS / `tw-animate-css` motion layer; tokens supply every value.
* **B — Swap visx for a batteries-included interactive charting library** (Recharts / tremor)
  that ships tooltips and animation.
* **C — Keep charts static** (status quo **0086**); add no interaction.

## Decision Outcome

Chosen option: **A — a shared visx-based interaction layer**, because it **extends 0086 rather than
replacing it**. visx already owns the primitive vocabulary and passes the token gate by
construction; its interaction packages (`@visx/tooltip`, `@visx/gradient`, `@visx/brush`,
`@visx/event`) are the same unstyled primitives, so tooltip surfaces, gradient stops, and brush
handles are all `var(--token)` values and `check:tokens` keeps passing. Interaction state (the hover
index, the focused point, the brushed range) is **local view-state** (**0026**); when brushing
changes the analysis window it writes **nuqs URL-state through the feature** (**0027**), never a
fetch inside the widget, so **0086** presentational purity holds. Motion is CSS / `tw-animate-css`
guarded by `prefers-reduced-motion` and resolves to a static state under Chromatic (**0043**).
Keyboard and AT affordances are built explicitly per **0039** / **0052**. Option B reintroduces
exactly the baked-palette, indirect-theming problem **0086** rejected; option C fails the product
goal.

The decision fixes:

* **A shared interaction sub-primitive layer** — `Tooltip`, a `Crosshair` / focus line, series
  `HoverHighlight`, `Gradient` / `AreaFill`, a `MotionIn` wrapper, an interactive `Legend`, and a
  time `Brush` — all visx-based, token-fed, and theme-aware (**0092**); chart widgets **compose**
  them rather than rebuild them.
* **Tokens own every new surface (0058/0081)** — tooltip background/border/text, gradient stops,
  crosshair stroke, and brush handle are semantic tokens only. The shared interaction layer lives
  under a token-gate-covered path (`src/components/**`, or a widget `ui/` segment under
  `src/widgets/**` — both in the `check:tokens` glob); a `shared`-level home would require extending
  the glob (**0058/0060**), so the invariant never rests on placement luck.
* **Presentational purity (0086)** — charts stay props-in; interaction is local view-state (**0026**)
  — including the interactive legend, whose series-visibility toggle is a transient view preference,
  not part of the persisted analysis, so it stays ephemeral and does **not** go to nuqs (**0027**).
  Only a brush that changes the analysis window round-trips through nuqs at the feature, never a
  widget fetch.
* **Deterministic for Chromatic (0043)** — motion and hover default to a resolved static snapshot
  state (reduced-motion); no `Date.now` / random in layout.
* **Accessible (0039/0052)** — data points are keyboard-focusable, tooltip content is in the a11y
  tree, highlight carries a non-color affordance, and `prefers-reduced-motion` is honored.

### Consequences

* Good, because premium affordances ship with token-ownership fully intact — there is no library
  palette to launder, and the **0081** scales still wire straight through visx.
* Good, because it reuses visx (**0086**) and a shared sub-primitive layer, so widgets compose
  interaction rather than each re-implementing it.
* Good, because determinism (**0043**) and a11y (**0039** / **0052**) are owned explicitly, and the
  surfaces are theme-aware (**0092**).
* Bad, because more interaction is hand-wired than a batteries-included library would give —
  mitigated by the shared layer.
* Bad, because the `@visx/*` dependency surface grows slightly (tooltip / gradient / brush / event),
  subject to the audit and license gates (**0069** / **0071**) — acceptable, MIT, tree-shakeable.
* Bad, because keyboard access and reduced-motion handling for interactive SVG is real manual work,
  not automatic.

### Confirmation

* `check:tokens` (**0058**) passes over the interaction layer — no raw color/size in tooltips,
  gradients, crosshair, or brush; every value traces to the generated allowlist.
* `check:licenses` (**0071**) admits `@visx/tooltip` / `@visx/gradient` / `@visx/brush` /
  `@visx/event` (MIT); `npm audit` (**0069**) is clean.
* Each upgraded chart ships its **empty / loading / error / overflow** states plus interactive
  stories with `play` functions; the axe gate (**0039**) passes. Chromatic (**0043**) is stable
  because the interaction stories pin the tooltip / crosshair / hover to a fixed open state and set
  motion to reduced-motion in the snapshot environment — the determinism is the fixture's, not
  assumed.
* The diff reviewer confirms interaction is **view-state only** and that a window-changing brush
  routes through nuqs (**0027**), not a fetch inside the widget.
* `prefers-reduced-motion` is honored (verified in a story / e2e), and interaction surfaces read the
  active theme composition (**0092**).

## Pros and Cons of the Options

### A — Shared visx-based interaction layer (chosen)

visx interaction primitives (`@visx/tooltip` / `@visx/gradient` / `@visx/brush` / `@visx/event`),
token-fed, plus a reduced-motion-guarded CSS motion layer.

* Good, because there is no baked palette — tokens own every new surface and **0058** passes
  natively, exactly as for the static layer.
* Good, because it extends **0086** and the shared sub-primitives keep widgets composing, not
  rebuilding.
* Good, because output stays deterministic (**0043**) and MIT-licensed (**0071**).
* Neutral, because it is lower-level — power in exchange for assembly.
* Bad, because tooltips, keyboard focus, and reduced-motion are hand-built per the shared layer.

### B — Batteries-included interactive library

* Good, because tooltips, animation, and legends come for free.
* Bad, because it bakes a palette and animation styling into its components — the **indirect**
  theming that fights **0058** / **0081**, the same reason **0086** rejected Recharts.
* Bad, because it would replace, not extend, the visx layer already in place.

### C — Keep charts static

* Good, because it adds nothing and keeps the current invariants trivially.
* Bad, because it fails the product goal outright — no tooltip, no crosshair, no motion.

## More Information

Extends **0086** (the visx primitive layer) and is bound by the token governance (**0058** /
**0081**), the state homes (**0026** / **0027**), the visual and a11y gates (**0043** / **0039** /
**0052**), and the theme system (**0092**). **Dependency:** this record presumes **0092** has
landed — superseding **0079** and refining **0086**'s single-value-layer clause — so it is accepted
**after** 0092 (the roadmap orders PR-11 before PR-14); until then charts stay dark-first and the
interaction surfaces read whatever composition **0086** currently exposes. Realized in roadmap
**PR-14**, upgrading the chart widgets `widgets/trends-explorer`, `widgets/funnel-builder`,
`widgets/retention-grid`, and `widgets/segment-builder` (their internal `ui/` chart segments).
Should a motion need arise beyond CSS / `tw-animate-css` (a JS animation library such as Motion),
that is a **new ADR** rather than an edit here.

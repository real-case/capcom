---
slug: console-phase-e-analytics-reskin
type: feature
status: in-progress
created: 2026-07-14
tracker: docs/capcom/console-redesign-progress.md (Phase E)
supersedes: none
stack: typescript
risk: medium
breaking: false
spike_required: false
test_command: npm run test
contract_sha: 353dee15094bd1ea
---

# Console re-skin Phase E — the remaining analytics widgets + chart-interaction layer + the palette-seam doc (final phase)

## Goal

Re-skin the last four analytics widgets — `trends-explorer`, `funnel-builder`, `retention-grid`,
`segment-builder` — AND the shared ADR-0093 chart-interaction primitives they render
(`src/components/charts/{tooltip,legend,crosshair,brush}`) off the shadcn value layer onto the
mission-control instrument-panel surface (ADR 0099), so chrome and data-viz read as one surface
across the whole console, and **document the marketing↔console palette seam** so contributors never
cross-pair the two palettes. Behavior is unchanged (every URL-state / control / interaction
preserved); zero new tokens, zero new dependencies, zero SQL/model change. This completes the
console-redesign initiative.

## Context

- Related patterns:
  - **The re-skin idiom (Phases B/C/D, all on `dev`).** The clean-swap is a mechanical token
    substitution off the shadcn value layer onto the mission-control semantic layer, verified by
    dark+light stories on the surface + `check:contrast` + `check:tokens` + the human Chromatic
    re-baseline. Phase D's `SignalChart` (`src/widgets/overview-dashboard/ui/SignalChart.tsx:55`) is
    the canonical target for a chart `Message` state box: `border-border → border-border-hairline`,
    `text-destructive → text-status-critical-fg`, `text-muted-foreground → text-text-secondary`.
    Phase C's events-explorer (`src/widgets/events-explorer/ui/EventsTable.tsx`,
    `EventsToolbar.tsx`, `ColumnsMenu.tsx:51`) is the canonical target for interactive chrome +
    overlay: `bg-card → bg-surface-panel`, `bg-muted → bg-surface-elevated`, overlay/popover →
    `border-border-hairline bg-surface-overlay`, `border-border/-input → border-border-hairline`,
    `text-foreground → text-text-primary`, small `text-muted-foreground → text-text-secondary`,
    `focus-visible:ring-ring → focus-visible:ring-text-primary`, `accent-* → accent-text-primary`.
  - **The `Panel` primitive** (`src/components/ui/panel.tsx:13`) — the mission-control surface
    container: `rounded-lg border border-border-hairline p-4 text-text-primary` +
    `bg-surface-{panel|elevated|overlay}`. It spreads `...props`, so `role="region"` + `aria-label`
    pass through — preserving the current `<section aria-label>` labeled-region landmark. This phase
    adds the four analytics containers as consumers (the coupled `panel.usedIn` reconciliation).
  - **Coupled graph reconciliation (the Phase-D gotcha).** A widget consuming an EXISTING kit
    primitive requires the primitive's node `usedIn` in `src/design-system/composition-graph.json`
    (`panel`) AND its `design-intent.ts` `meta.usedIn`
    (`src/components/ui/panel.design-intent.ts:19`) to gain the new consumer FILES, in lockstep, or
    `check:graph` / `check:design-intent` fail. `panel.usedIn` currently lists exactly 7 consumer
    files; Phase E adds the four container files. **The chart-interaction primitives are NOT in the
    composition graph** (the graph's `tooltip` node is `src/components/ui/tooltip.tsx`, a different
    file; `src/components/charts/*` have no graph node and no `design-intent.ts`), so re-skinning
    them is a pure token swap with **no** graph/design-intent change.
  - **The chart-interaction layer (ADR 0093), `src/components/charts/`.** Consumed ONLY by the
    analytics charts (verified: `ChartTooltip`/`ChartTooltipTitle`/`ChartTooltipRow` by trends×2 /
    funnel / retention / segment; `ChartLegend` + `Crosshair` + `ChartBrush` by trends only;
    overview's `SignalChart` uses only the token-clean `AreaGradient`/`MotionIn`). All console-only —
    NO marketing/landing/auth consumer — so re-skinning onto mission-control is safe and collateral-
    free to Phases C/D. Their headers explicitly say the tokens "flip with the theme" — designed to
    sit on whatever surface — which is exactly the assumption Phase E breaks by moving the container
    from `bg-card` to `--surface-panel`. Their shadcn tokens:
    - `tooltip.tsx:64` box `border-border bg-popover text-popover-foreground`; `:79` title
      `text-foreground`; `:99,105,106` rows `text-muted-foreground` + `text-foreground` (the box is
      `aria-hidden`, `:60` — axe skips it; the swatch `color` is a viz token, untouched).
    - `legend.tsx:93,101` `text-muted-foreground` + `:93` `focus-visible:ring-ring` (interactive HTML,
      NOT aria-hidden — axe-visible; the swatch is a viz token).
    - `crosshair.tsx:31,32` `LINE_STROKE=var(--color-muted-foreground)`,
      `DOT_RING=var(--color-background)` (SVG; trends only).
    - `brush.tsx:67,69,137` `var(--color-primary)` (selection/handle), `:114` `var(--color-muted)`
      (track), `:138` `var(--color-background)` (handle stroke) (SVG; trends only).
    - `gradient.tsx`/`motion.tsx`/`use-chart-focus.ts`/`index.ts` carry no shadcn color token
      (AC1-grep-safe). All four color-bearing stories already have a `Dark` story (light default +
      `globals:{theme:'dark'}`).
  - **The four widgets today** (all `"use client"` fetching containers → presentational visx charts,
    ADR 0086): - `trends-explorer` — `TrendsExplorer.tsx:126` (`<section bg-card>` × 2, brush-row caption
    `text-caption text-muted-foreground` + `focus-visible:ring-ring`) + `TrendsChart.tsx`
    (`Message` box on shadcn; SVG axis/label fills; roving-group `focus-visible:ring-ring` at
    `:250`; `OTHER_COLOR=var(--color-muted-foreground)` at `:64` — the 'Other' rollup SERIES line,
    not chrome; `ChartLegend`/`Crosshair`/`ChartBrush` consumers) + `TopEventsBar.tsx`
    (`FOCUS_RING=var(--color-foreground)`, SVG fills, `Message`). - `funnel-builder` — `FunnelBuilder.tsx:158` (`<section bg-card>`, fieldset `legend`,
    `addBtnClass`/`removeBtnClass` on `border-input bg-background text-muted-foreground
hover:bg-muted`) + `FunnelChart.tsx` (SVG text fills, `TRACK_COLOR=var(--color-muted)`,
    `FOCUS_RING`, tooltip text, `Message`). - `retention-grid` — `RetentionGrid.tsx:82` (`<section bg-card>`) + `CohortGrid.tsx` (SVG text
    fills, cell `stroke=var(--color-border)`, `SCALE_TEXT=[…var(--color-foreground)…,
var(--color-background)…]` in-cell text, legend `text-muted-foreground`, `Message`,
    `focus-visible:ring-ring` on the roving-grid wrapper). - `segment-builder` — `SegmentBuilder.tsx:278` (`<section bg-card>`, two fieldset `legend`s,
    `countInputClass`/`addBtnClass`/`removeBtnClass`, checkbox label `text-foreground`) +
    `SegmentDistribution.tsx` (HTML headline `<span text-2xl … text-foreground>` +
    `text-muted-foreground`, SVG text fills, track `var(--color-muted)`, `FOCUS_RING`, `Message`).
  - **Chart stories already carry a `Dark` story** with light default (`TrendsChart.stories.tsx:113`,
    `TopEventsBar.stories.tsx:61`, `FunnelChart.stories.tsx:63`, `CohortGrid.stories.tsx:99`,
    `SegmentDistribution.stories.tsx:86`), but the meta decorator renders the chart on a plain sizing
    `<div>` (the shadcn `--background`), NOT on a mission-control surface. See Design Notes for why a
    surface decorator becomes REQUIRED after the re-skin.
  - **The four route pages** each render `<h1 … text-foreground>` on the AppShell `--surface-background`
    — `trends/page.tsx:55`, `funnels/page.tsx:55`, `retention/page.tsx:56`, `segments/page.tsx:57` —
    the exact page-header half-mix Phase D re-skinned on the Overview route. `src/app/**` is not
    scanned by `check:tokens` (Phase-D disclosure), so the AC1 grep covers them explicitly.
  - **The token allowlist** is generated (`src/design-system/tokens.agent-rules.md`); the
    mission-control SVG-usable tokens (`var(--color-text-primary|secondary|tertiary)`,
    `var(--color-surface-*)`, `var(--color-border-hairline)`, `var(--color-status-*)`,
    `var(--color-viz-*)`) are all present — a faithful 1:1 swap for every shadcn fill.
- Callers / reverse-deps:
  - Each container is mounted only by its own route page (the trends / funnels / retention /
    segments `page.tsx`); no widget imports another widget (FSD, ADR 0065/0066). The charts and the
    `src/components/charts` interaction primitives are console-only (enumerated above).
  - `Panel` is imported by adding `@/components/ui/panel` to the four containers — a downward
    widget→kit import (allowed; events-explorer already does it). The interaction primitives keep
    their existing consumers; only their token literals change.
- Constraints:
  - **The ADR 0099 clean-swap / anti-half-mix rule.** The mission-control surface/text set pairs only
    with itself for AA; a leftover shadcn foreground (HTML **or** SVG) on a `--surface-panel` Panel is
    the half-mix the ADR forbids. After the container becomes a Panel, EVERY descendant chrome color —
    the container's own, the chart's SVG label fills + `Message` boxes, AND the chart-interaction
    primitives (tooltip / legend / crosshair / brush) that render inside — must move to the
    mission-control layer. `--text-tertiary` is NOT AA-safe for small text; small text uses
    `--text-secondary` (the Phase-B breadcrumb failure). Leaving the interaction layer shadcn is NOT
    an acceptable "disclosed residual" — it is the very half-mix the ADR bans (spec-critic Round-1
    blocker).
  - **No new token, no per-theme semantic override** (the `gen:tokens` swap-only self-test stays
    unchanged). **No new kit primitive** (`Panel` reused; the composition-graph/design-intent node
    COUNT is unchanged — only `panel.usedIn` grows; the `src/components/charts` layer is not graphed).
  - **Behavior unchanged (ADR 0097/0027/0086/0093).** No model/SQL/RPC/i18n change; the existing
    container behavior tests + the `brush.test.ts` `boundsToRange` unit test must still pass. The
    `<section>`→`Panel` swap preserves the labeled-region landmark; the charts + interaction
    primitives keep every prop, interaction, a11y role, and the single-announcement rule.
  - **ADR 0099 is accepted + merged and cannot be edited in place** (accepted ADRs change only via a
    superseding record, ADR 0001). So the seam doc is linked one-directionally: the doc **cites**
    ADR 0099 (satisfying `check:citations`), and the two mutable surfaces (the progress doc + a new
    `src/design-system/README.md`) link TO the doc.
- Sibling specs: `.marvin/task/001-console-phase-b-app-shell-reskin.md` (shipped, PR #35),
  `.marvin/task/002-console-phase-c-events-explorer-reskin.md` (shipped, PR #36),
  `.marvin/task/003-console-phase-d-overview-dashboard.md` (shipped, PR #37). All merged to `dev`;
  Phase E reuses only their shipped `Panel` primitive — **not a build dependency**.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: src/widgets/trends-explorer/ui/TrendsExplorer.tsx
    action: edit
    intent: >-
      Re-skin the container chrome. Swap the two `<section … border-border bg-card …>` wrappers for
      `<Panel role="region" aria-label={…}>` (import Panel from @/components/ui/panel), keeping the h2
      heading inside and preserving the labeled-region landmark. Heading text-foreground →
      text-text-primary; the brush-row caption + reset button `text-caption text-muted-foreground →
      text-text-secondary` and `focus-visible:ring-ring → focus-visible:ring-text-primary`. nuqs state,
      the two hooks, ComboField controls, and the ChartBrush wiring are otherwise untouched. ComboField
      (shadcn kit) is consumed as-is (out of the re-skin scope, ADR 0099).
    satisfies: [AC1, AC4]
    anchor: src/widgets/trends-explorer/ui/TrendsExplorer.tsx:126
  - id: F2
    path: src/widgets/funnel-builder/ui/FunnelBuilder.tsx
    action: edit
    intent: >-
      Swap the `<section bg-card>` for `<Panel role="region" aria-label={…}>` (heading →
      text-text-primary). Fieldset `legend` + the step index `text-muted-foreground → text-text-secondary`.
      Re-skin addBtnClass/removeBtnClass: `border-input bg-background text-muted-foreground
      hover:text-foreground hover:bg-muted → border-border-hairline bg-surface-elevated text-text-secondary
      hover:text-text-primary focus-visible:ring-text-primary` (keep the disabled: utilities). Combobox
      (kit) untouched; step add/remove behavior unchanged.
    satisfies: [AC1, AC4]
    anchor: src/widgets/funnel-builder/ui/FunnelBuilder.tsx:158
  - id: F3
    path: src/widgets/retention-grid/ui/RetentionGrid.tsx
    action: edit
    intent: >-
      Swap the `<section overflow-x-auto … bg-card>` for `<Panel role="region" aria-label={…}
      className="overflow-x-auto">` (heading → text-text-primary). No control changes.
    satisfies: [AC1, AC4]
    anchor: src/widgets/retention-grid/ui/RetentionGrid.tsx:82
  - id: F4
    path: src/widgets/segment-builder/ui/SegmentBuilder.tsx
    action: edit
    intent: >-
      Swap the `<section bg-card>` for `<Panel role="region" aria-label={…}>` (heading →
      text-text-primary). Both fieldset `legend`s + the `timesSuffix` span `text-muted-foreground →
      text-text-secondary`; the checkbox label `text-foreground → text-text-primary`. Re-skin
      countInputClass/addBtnClass/removeBtnClass to the mission-control button/input recipe (as F2).
      Combobox (kit) and every rule mutator untouched — the segment grammar is unchanged.
    satisfies: [AC1, AC4]
    anchor: src/widgets/segment-builder/ui/SegmentBuilder.tsx:278
  - id: F5
    path: src/widgets/trends-explorer/ui/TrendsChart.tsx
    action: edit
    intent: >-
      Re-skin the chart's own chrome (NOT the categorical SERIES palette). The `Message` box →
      SignalChart's tokens (border-border-hairline / text-status-critical-fg / text-text-secondary). SVG
      axis/label `fill=var(--color-foreground|muted-foreground)` → var(--color-text-primary|secondary); any
      `var(--color-border)` gridline → var(--color-border-hairline); the roving-group wrapper
      `focus-visible:ring-ring → focus-visible:ring-text-primary` (NOTE: TrendsChart has no FOCUS_RING
      const — its ring is this utility). `OTHER_COLOR` (the 'Other' rollup line, currently
      var(--color-muted-foreground)) → var(--color-text-tertiary) — the mission-control de-emphasized-line
      token, so the neutral rollup series reads as muted without a shadcn foreground (a chart LINE, so
      the small-text AA caveat does not apply). Any tooltip/legend/readout HTML text swapped to the
      mission-control text tokens. The SERIES_COLORS categorical palette (var(--color-viz-*)) is
      untouched. Structure, props, interaction, and a11y roles unchanged.
    satisfies: [AC1, AC2]
    anchor: src/widgets/trends-explorer/ui/TrendsChart.tsx:64
  - id: F6
    path: src/widgets/trends-explorer/ui/TopEventsBar.tsx
    action: edit
    intent: >-
      Message box → mission-control tokens; SVG label fill var(--color-foreground) →
      var(--color-text-primary) and value fill var(--color-muted-foreground) → var(--color-text-secondary);
      FOCUS_RING var(--color-foreground) → var(--color-text-primary). Bars keep
      var(--color-viz-categorical-1). No structural/behavioral change.
    satisfies: [AC1, AC2]
    anchor: src/widgets/trends-explorer/ui/TopEventsBar.tsx:37
  - id: F7
    path: src/widgets/funnel-builder/ui/FunnelChart.tsx
    action: edit
    intent: >-
      Message box → mission-control tokens; SVG header/caption fills
      var(--color-foreground|muted-foreground) → var(--color-text-primary|secondary); the bar TRACK
      TRACK_COLOR var(--color-muted) → var(--color-surface-elevated); FOCUS_RING → var(--color-text-primary);
      tooltip `<dt/dd>` text-muted-foreground/foreground → text-text-secondary/primary (keep font-mono
      tabular-nums). Bar fill keeps var(--color-viz-categorical-1). Conversion-percentage math and
      interaction unchanged.
    satisfies: [AC1, AC2]
    anchor: src/widgets/funnel-builder/ui/FunnelChart.tsx:36
  - id: F8
    path: src/widgets/retention-grid/ui/CohortGrid.tsx
    action: edit
    intent: >-
      Message box → mission-control tokens; the roving-grid wrapper focus-visible:ring-ring →
      focus-visible:ring-text-primary; SVG header/row-label/caption fills
      var(--color-foreground|muted-foreground) → var(--color-text-primary|secondary); cell stroke
      var(--color-border) → var(--color-border-hairline); FOCUS_RING → var(--color-text-primary); SCALE_TEXT
      var(--color-foreground) → var(--color-text-primary) and var(--color-background) →
      var(--color-surface-background) (faithful per-bin swap — same flip behavior); legend
      text-muted-foreground → text-text-secondary. The sequential SCALE (viz tokens) is unchanged.
      Keyboard roving, tooltip, and the live region are untouched.
    satisfies: [AC1, AC2]
    anchor: src/widgets/retention-grid/ui/CohortGrid.tsx:45
  - id: F9
    path: src/widgets/segment-builder/ui/SegmentDistribution.tsx
    action: edit
    intent: >-
      Message box → mission-control tokens; the HTML headline `<span text-2xl … text-foreground>` →
      text-text-primary and its `text-muted-foreground` caption → text-text-secondary; SVG bucket label
      fill var(--color-foreground) → var(--color-text-primary) and value fill var(--color-muted-foreground)
      → var(--color-text-secondary); the bar track var(--color-muted) → var(--color-surface-elevated);
      FOCUS_RING → var(--color-text-primary). Categorical bar fills keep var(--color-viz-categorical-*).
      Share math and interaction unchanged.
    satisfies: [AC1, AC2]
    anchor: src/widgets/segment-builder/ui/SegmentDistribution.tsx:42
  - id: F10
    path: src/widgets/trends-explorer/ui/TrendsChart.stories.tsx
    action: edit
    intent: >-
      Wrap the meta decorator's sizing div in `<div className="bg-surface-panel p-4 rounded-lg">` so the
      axe run + Chromatic exercise the chart's re-skinned HTML chrome (Message boxes, legend, readout) on
      the surface it lives on, in both the light default and the existing Dark story — REQUIRED so the
      mission-control text tokens are measured against a mission-control surface (see Design Notes). No new
      stories; states unchanged.
    satisfies: [AC2]
    anchor: src/widgets/trends-explorer/ui/TrendsChart.stories.tsx:55
  - id: F11
    path: src/widgets/trends-explorer/ui/TopEventsBar.stories.tsx
    action: edit
    intent: Add the bg-surface-panel surface decorator to the meta (as F10).
    satisfies: [AC2]
    anchor: src/widgets/trends-explorer/ui/TopEventsBar.stories.tsx:1
  - id: F12
    path: src/widgets/funnel-builder/ui/FunnelChart.stories.tsx
    action: edit
    intent: Add the bg-surface-panel surface decorator to the meta (as F10).
    satisfies: [AC2]
    anchor: src/widgets/funnel-builder/ui/FunnelChart.stories.tsx:1
  - id: F13
    path: src/widgets/retention-grid/ui/CohortGrid.stories.tsx
    action: edit
    intent: Add the bg-surface-panel surface decorator to the meta (as F10).
    satisfies: [AC2]
    anchor: src/widgets/retention-grid/ui/CohortGrid.stories.tsx:1
  - id: F14
    path: src/widgets/segment-builder/ui/SegmentDistribution.stories.tsx
    action: edit
    intent: Add the bg-surface-panel surface decorator to the meta (as F10).
    satisfies: [AC2]
    anchor: src/widgets/segment-builder/ui/SegmentDistribution.stories.tsx:1
  - id: F15
    path: src/app/[locale]/(app)/p/[projectId]/trends/page.tsx
    action: edit
    intent: Re-skin the page `<h1 … text-foreground>` → text-text-primary (the ADR-0099 header half-mix, as Phase D on Overview).
    satisfies: [AC1]
    anchor: src/app/[locale]/(app)/p/[projectId]/trends/page.tsx:55
  - id: F16
    path: src/app/[locale]/(app)/p/[projectId]/funnels/page.tsx
    action: edit
    intent: Re-skin the page `<h1 … text-foreground>` → text-text-primary.
    satisfies: [AC1]
    anchor: src/app/[locale]/(app)/p/[projectId]/funnels/page.tsx:55
  - id: F17
    path: src/app/[locale]/(app)/p/[projectId]/retention/page.tsx
    action: edit
    intent: Re-skin the page `<h1 … text-foreground>` → text-text-primary.
    satisfies: [AC1]
    anchor: src/app/[locale]/(app)/p/[projectId]/retention/page.tsx:56
  - id: F18
    path: src/app/[locale]/(app)/p/[projectId]/segments/page.tsx
    action: edit
    intent: Re-skin the page `<h1 … text-foreground>` → text-text-primary.
    satisfies: [AC1]
    anchor: src/app/[locale]/(app)/p/[projectId]/segments/page.tsx:57
  - id: F19
    path: src/design-system/composition-graph.json
    action: edit
    intent: >-
      Coupled graph reconciliation — add the four container files
      (trends-explorer/ui/TrendsExplorer.tsx, funnel-builder/ui/FunnelBuilder.tsx,
      retention-grid/ui/RetentionGrid.tsx, segment-builder/ui/SegmentBuilder.tsx) to the `panel` node's
      `usedIn` array (they now import Panel). No new node; no other node changes; the
      src/components/charts layer is not graphed.
    satisfies: [AC4]
    anchor: src/design-system/composition-graph.json:1
  - id: F20
    path: src/components/ui/panel.design-intent.ts
    action: edit
    intent: >-
      Add the same four container files to `meta.usedIn`, in lockstep with F19 (check:design-intent
      reconciles meta↔graph). Update the trailing usedIn note to mention the Phase-E analytics consumers.
    satisfies: [AC4]
    anchor: src/components/ui/panel.design-intent.ts:19
  - id: F21
    path: src/components/charts/tooltip.tsx
    action: edit
    intent: >-
      Re-skin the chart-tooltip surface off shadcn onto mission-control (ADR 0093 layer, console-only).
      Box `border border-border bg-popover text-popover-foreground → border border-border-hairline
      bg-surface-overlay text-text-primary` (the overlay-elevation precedent, ColumnsMenu); ChartTooltipTitle
      `text-foreground → text-text-primary`; ChartTooltipRow `text-muted-foreground → text-text-secondary`
      and the name/value `text-foreground → text-text-primary` (keep font-mono tabular-nums). The
      per-series swatch `color` prop (a viz token) is untouched. The box stays aria-hidden (axe skips it —
      Chromatic verifies it on the surface). Update the file-header comment that names the old tokens.
    satisfies: [AC1, AC2]
    anchor: src/components/charts/tooltip.tsx:64
  - id: F22
    path: src/components/charts/legend.tsx
    action: edit
    intent: >-
      `text-muted-foreground → text-text-secondary` on both the interactive series toggle (:93) and the
      static legend row (:101); `focus-visible:ring-ring → focus-visible:ring-text-primary` (:93). The viz
      swatch color is untouched. This is the ONE axe-visible interaction primitive (HTML, not aria-hidden),
      so its AA on the surface is proven by the surface-decorator story in both themes (AC2).
    satisfies: [AC1, AC2]
    anchor: src/components/charts/legend.tsx:93
  - id: F23
    path: src/components/charts/crosshair.tsx
    action: edit
    intent: >-
      LINE_STROKE var(--color-muted-foreground) → var(--color-text-secondary); DOT_RING
      var(--color-background) → var(--color-surface-background). SVG only (trends crosshair) — grep +
      Chromatic verify.
    satisfies: [AC1]
    anchor: src/components/charts/crosshair.tsx:31
  - id: F24
    path: src/components/charts/brush.tsx
    action: edit
    intent: >-
      SELECTED_BOX fill/stroke var(--color-primary) → var(--color-text-primary) (keep fillOpacity 0.14 — a
      neutral translucent selection tint + outline, no shadcn brand-primary on the panel); the resize
      handle fill var(--color-primary) → var(--color-text-primary) and stroke var(--color-background) →
      var(--color-surface-background); the track fill var(--color-muted) → var(--color-surface-elevated).
      SVG only (trends brush) — grep + Chromatic verify; the exact selection accent is a Chromatic-confirmed
      presentation detail.
    satisfies: [AC1]
    anchor: src/components/charts/brush.tsx:66
  - id: F25
    path: src/components/charts/tooltip.stories.tsx
    action: edit
    intent: Add the bg-surface-panel surface decorator to the meta (light default + existing Dark) so Chromatic shows the tooltip on its true surface.
    satisfies: [AC2]
    anchor: src/components/charts/tooltip.stories.tsx:25
  - id: F26
    path: src/components/charts/legend.stories.tsx
    action: edit
    intent: >-
      Add the bg-surface-panel surface decorator (light default + existing Dark) — REQUIRED: the legend is
      axe-visible HTML, so after the re-skin its text-text-secondary must be measured against
      --surface-panel (else the reverse half-mix could turn axe RED).
    satisfies: [AC2]
    anchor: src/components/charts/legend.stories.tsx:20
  - id: F27
    path: src/components/charts/crosshair.stories.tsx
    action: edit
    intent: Add the bg-surface-panel surface decorator to the meta (Chromatic on the true surface).
    satisfies: [AC2]
    anchor: src/components/charts/crosshair.stories.tsx:15
  - id: F28
    path: src/components/charts/brush.stories.tsx
    action: edit
    intent: Add the bg-surface-panel surface decorator to the meta (Chromatic on the true surface).
    satisfies: [AC2]
    anchor: src/components/charts/brush.stories.tsx:21
  - id: F29
    path: docs/capcom/palette-seam.md
    action: new
    intent: >-
      The marketing↔console palette-seam guide (ADR 0099): the two deliberate visual worlds —
      marketing/landing + auth on the shadcn value layer (--color-* names via the @theme inline bridge) vs
      the authenticated console + its data-viz on the mission-control surface (--surface-*/--text-*/
      --status-*/--border-hairline/--viz-*); WHICH surface each world uses; the half-mix failure mode (a
      shadcn foreground on a --surface-* bg fails AA and is invisible to check:tokens/check:contrast — only
      an axe story or Chromatic catches it) and the specific traps (small text uses --text-secondary not
      --text-tertiary; SVG `<text fill>` and chart-interaction primitives must move to var(--color-text-*)/
      surface tokens); and the rule (never cross-pair; a surface swap is per-component and total). Also note
      the one deliberate INTRA-console residual: the shadcn-kit control labels (ComboField/Combobox,
      `src/shared/ui/ComboField.tsx` `text-muted-foreground`) render on the AppShell `--surface-background`
      OUTSIDE any Panel and are consumed as-is per the kit seam — AA-passing and intentional, not a missed
      half-mix, so a future reviewer reads it as documented rather than a defect. Cites ADR 0099 (and
      0081/0092/0058 as relevant). Prose only, no code consumer.
    satisfies: [AC5]
  - id: F30
    path: src/design-system/README.md
    action: new
    intent: >-
      A short README for the design-system layer (currently none): what lives here (the generated token
      union + agent rules, the controlled vocabularies, the composition graph) + a pointer to the generated
      tokens.agent-rules.md and a prominent link to ../../docs/capcom/palette-seam.md as the durable,
      discoverable home a contributor touching tokens will find.
    satisfies: [AC5]
  - id: F31
    path: .cspell/project-words.txt
    action: edit
    intent: >-
      Add any new technical words introduced by the seam doc + the Phase-E progress-log prose that cspell
      (check:spelling over **/*.md) would otherwise flag, keeping the spelling gate green.
    satisfies: ["—"]
    anchor: .cspell/project-words.txt:1
  - id: F32
    path: docs/capcom/console-redesign-progress.md
    action: edit
    intent: >-
      REQUIRED before the PR (the working agreement). Set the Phase E row → ✅ done (PR + date); add the
      dated Phase-E log entry (what landed across the four widgets + the chart-interaction layer + seam doc,
      gate results incl. contrast both themes / axe / tokens / graph / coverage, Chromatic re-baseline
      status, and the spec-critic Round-1 interaction-layer finding); add a pointer to
      docs/capcom/palette-seam.md; rewrite the Resume point to mark the console-redesign initiative COMPLETE
      (all phases 0/A/B/C/D/E done).
    satisfies: ["—"]
    anchor: docs/capcom/console-redesign-progress.md:29
build_order:
  [
    F19,
    F20,
    F1,
    F2,
    F3,
    F4,
    F5,
    F6,
    F7,
    F8,
    F9,
    F21,
    F22,
    F23,
    F24,
    F10,
    F11,
    F12,
    F13,
    F14,
    F25,
    F26,
    F27,
    F28,
    F15,
    F16,
    F17,
    F18,
    F29,
    F30,
    F31,
    F32,
  ]
depends_on: []
contract:
  kind: none
criteria:
  - id: AC1
    statement: >-
      Given the four re-skinned widget slices, the four console-only chart-interaction primitives
      (src/components/charts/{tooltip,legend,crosshair,brush}), and the four route pages, when a grep for
      shadcn value-layer color tokens runs over their source (excluding stories/tests), then it finds NONE —
      no `bg-card`, `bg-background`, `bg-popover`, `popover-foreground`, `text-foreground`,
      `text-muted-foreground`, `bg-muted`, `border-border` (non-hairline), `border-input`,
      `text-destructive`, `ring-ring`, nor the SVG vars `var(--color-foreground)`,
      `var(--color-muted-foreground)`, `var(--color-muted)`, `var(--color-border)`,
      `var(--color-background)`, `var(--color-primary)` — every chrome color (HTML and SVG), including the
      'Other' rollup line, is a mission-control token, and `check:tokens` (which scans src/components +
      src/widgets) reports no raw literal. The clean surface swap is total, per ADR 0099.
    implemented_by:
      [
        F1,
        F2,
        F3,
        F4,
        F5,
        F6,
        F7,
        F8,
        F9,
        F21,
        F22,
        F23,
        F24,
        F15,
        F16,
        F17,
        F18,
      ]
    oracle:
      kind: command
      ref: >-
        ! git grep -nE 'bg-card|card-foreground|bg-background|bg-popover|popover-foreground|text-foreground|text-muted-foreground|bg-muted|border-border([^-]|$)|border-input|text-destructive|ring-ring|--color-foreground|--color-muted-foreground|--color-muted\)|--color-border\)|--color-background\)|--color-primary\)' -- 'src/widgets/trends-explorer' 'src/widgets/funnel-builder' 'src/widgets/retention-grid' 'src/widgets/segment-builder' 'src/components/charts' 'src/app/[locale]/(app)/p/[projectId]/trends' 'src/app/[locale]/(app)/p/[projectId]/funnels' 'src/app/[locale]/(app)/p/[projectId]/retention' 'src/app/[locale]/(app)/p/[projectId]/segments' ':(exclude,glob)**/*.stories.tsx' ':(exclude,glob)**/*.test.ts' ':(exclude,glob)**/*.test.tsx' && npm run check:tokens
    failure: >-
      A leftover shadcn foreground/background token (the ADR-0099 half-mix) or a raw color literal remaining
      in a re-skinned source file — the grep matches (exits 0), failing the negation.
  - id: AC2
    statement: >-
      Given the five chart components and the chart-interaction primitives with their surface-decorator
      stories, when the token/contrast gates and the Storybook axe run execute, then each re-skinned
      axe-visible HTML surface (the chart Message boxes / headline / legend rows) renders on the
      `--surface-panel` surface and clears WCAG 2.2 AA in BOTH the light default and the Dark story, and the
      mission-control status/text-on-surface pairs pass `check:contrast` in both compositions. (The
      aria-hidden tooltip and the SVG crosshair/brush are not axe-evaluable — verified by the AC1 grep +
      Chromatic, a disclosed residual matching Phase B/D.)
    implemented_by:
      [
        F5,
        F6,
        F7,
        F8,
        F9,
        F10,
        F11,
        F12,
        F13,
        F14,
        F21,
        F22,
        F23,
        F24,
        F25,
        F26,
        F27,
        F28,
      ]
    oracle:
      kind: command
      ref: npm run check:contrast && npm run test
    failure: >-
      A mission-control text token measured against a mission-control surface failing AA (caught by the axe
      story under `npm run test`, the Storybook browser project — including the legend's text-text-secondary
      on --surface-panel) or a contrast-pair regression caught by check:contrast.
  - id: AC3
    statement: >-
      Given the re-skin is chrome-only, when the full suite runs, then the four containers' existing
      behavior tests (URL-state round-trip, RPC arg bags, step add/remove, dimension change,
      section/headline render) and the brush.test.ts `boundsToRange` unit test still pass UNCHANGED, and
      `check:i18n` key parity holds — no model, SQL, RPC, or user-facing-string change; the
      `<section>`→`Panel` swap preserves the labeled region and the headings the tests query.
    implemented_by: [F1, F2, F3, F4, F21, F22, F23, F24]
    oracle:
      kind: command
      ref: npm run test && npm run check:i18n
    failure: >-
      A behavior test breaking (a lost heading/region, a changed control, an altered arg bag, a broken
      brush conversion) or a new/missing i18n key — the re-skin leaked into behavior.
  - id: AC4
    statement: >-
      Given the four containers now import `Panel`, when the design-system boundary gates run, then the
      `panel` node's `usedIn` (composition-graph.json) and the `panel.design-intent.ts` `meta.usedIn` both
      list the four container files (coupled reconciliation), no new kit primitive or graph node is added
      (the src/components/charts layer is not graphed, so the interaction-primitive re-skin adds none), and
      `check:graph` / `check:design-intent` / `check:fsd` / `check:boundaries` are green (downward-only
      widget→kit imports; no widget→widget import).
    implemented_by: [F1, F2, F3, F4, F19, F20]
    oracle:
      kind: command
      ref: npm run check:graph && npm run check:design-intent && npm run check:fsd && npm run check:boundaries
    failure: >-
      An import↔graph mismatch (a container imports Panel but usedIn/meta wasn't updated in lockstep), an
      added node, or an FSD/boundary violation.
  - id: AC5
    statement: >-
      Given the palette-seam documentation, when the docs gates run, then docs/capcom/palette-seam.md exists
      and explains the two palettes, which surface each visual world uses, the half-mix failure mode and the
      specific traps (--text-secondary vs -tertiary; SVG fills + chart-interaction primitives), and the
      never-cross-pair rule; it cites ADR 0099 (resolving under check:citations) and is linked from the new
      src/design-system/README.md and the progress doc; spelling (cspell over **/*.md) and citation
      integrity pass.
    implemented_by: [F29, F30, F31, F32]
    oracle:
      kind: command
      ref: npm run check:spelling && npm run check:citations
    failure: >-
      A missing seam doc, a dangling ADR citation, an unlinked doc, or an unknown word failing cspell.
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "console-redesign-progress.md updated (Phase E row + log + resume→initiative COMPLETE) BEFORE the PR"
  - "docs/capcom/palette-seam.md authored + linked (progress doc + src/design-system/README.md); cites ADR 0099"
  - "AC1 clean-swap grep green (no shadcn value-layer token in the four widgets + the four chart-interaction primitives + route pages); check:tokens green over src/components + src/widgets + src/shared"
  - "check:contrast green in both compositions; axe green over the surface-decorator stories (widgets + charts) in both themes"
  - "check:graph + check:design-intent green after the coupled panel.usedIn reconciliation (no new node)"
  - "check:fsd + check:boundaries green; gen:tokens swap-only self-test unchanged (no new tokens)"
  - "check:i18n key parity green; check:spelling + check:citations green"
  - "tsc --noEmit / lint / format:check / build green; test:coverage ≥ 80%"
  - "human-approved Chromatic visual re-baseline (ADR 0043/0095 — agent never approves its own)"
  - "Conventional Commits (commitlint); single human-reviewed PR into dev; no AI attribution"
gates:
  test: npm run test
```

## Data & Config

N/A — no migration, env var, feature flag, or config key. This phase changes only presentation tokens,
one composition-graph `usedIn` array, two new docs, and the progress tracker. No schema, RPC, or
generated-types (`gen:types`) change; the `gen:tokens` swap-only self-test is unchanged (no token added
or per-theme semantic override).

## Chosen Approach

One reviewable PR delivering the full clean surface swap — the four widgets, the chart-interaction layer
they render, and the seam doc — mechanically mirroring Phases B/C/D:

1. **Coupled graph reconciliation first (F19/F20).** Add the four container files to `panel.usedIn`
   (graph node) and `panel.design-intent.ts` `meta.usedIn` in lockstep.
2. **Containers (F1–F4).** Each `<section bg-card>` → `<Panel role="region" aria-label={…}>` (preserving
   the landmark and the h2 the tests query); headings → `text-text-primary`; captions/legends →
   `text-text-secondary`; the raw `<button>`/`<input>` recipes → the mission-control button/input recipe;
   focus rings → `ring-text-primary`. The shadcn kit controls (ComboField/Combobox) are consumed as-is
   (out of scope, ADR 0099). Behavior untouched.
3. **Widget charts (F5–F9).** Re-skin only the chart's own chrome — never the categorical/sequential/
   diverging SERIES palette (`var(--color-viz-*)`), with the single exception of the neutral 'Other'
   rollup line (`OTHER_COLOR` → `var(--color-text-tertiary)`, which AC1 forces off `--color-muted-foreground`).
   `Message` boxes → the SignalChart tokens; SVG `<text fill>` → `var(--color-text-*)`; bar tracks →
   `var(--color-surface-elevated)`; cell strokes → `var(--color-border-hairline)`; focus-ring strokes/utility
   → `var(--color-text-primary)`/`ring-text-primary`; CohortGrid in-cell `SCALE_TEXT` swapped 1:1.
4. **Chart-interaction layer (F21–F24).** Re-skin the four console-only ADR-0093 primitives that render
   inside the Panels — the spec-critic Round-1 blocker: tooltip box → `bg-surface-overlay
border-border-hairline text-text-primary`; legend text → `text-text-secondary` + `ring-text-primary`;
   crosshair/brush SVG strokes/fills → the mission-control text/surface tokens. Pure token swap (not
   graphed → no design-intent/graph change).
5. **Stories (F10–F14, F25–F28).** Add a `bg-surface-panel` surface decorator to each chart + interaction-
   primitive story meta so the axe run and Chromatic exercise the re-skinned chrome against the
   mission-control surface in both the light default and the existing Dark story (REQUIRED — see Design
   Notes). No new stories.
6. **Route-page headers (F15–F18).** `<h1 text-foreground>` → `text-text-primary`.
7. **Seam doc + pointers + progress (F29–F32).** New `docs/capcom/palette-seam.md`; a new
   `src/design-system/README.md` linking to it; cspell allowlist top-up; the progress-doc Phase-E entry
   marking the initiative complete.

**Stack compliance:** NATIVE — `Panel`, the mission-control tokens, the charts layer, and Storybook are
all present; no new dependency, token, SQL, or generated artifact.
**Future alignment:** N/A — no VISION.md.

**Stack extensions required:** none.

## Why this over alternatives

- **Split into per-widget or 2+2 PRs (rejected — the user's scoping decision).** The widgets + their
  shared chart layer are the identical mechanical token-swap; one PR lets the reviewer verify the whole
  clean-swap + one Chromatic re-baseline at once and closes the initiative in a single act.
- **Leave the chart-interaction primitives (tooltip/legend/crosshair/brush) on the shadcn value layer,
  disclosed as a residual (rejected — spec-critic Round-1 blocker).** Once the container is a
  `--surface-panel` Panel, these primitives render a shadcn popover/legend/crosshair/brush directly on the
  mission-control surface — the exact half-mix ADR 0099 forbids, not an acceptable residual. Worse,
  `legend.tsx`'s axe-visible `text-muted-foreground` on `--surface-panel` (surfaced by the F26 surface
  decorator) could turn AC2's own `npm run test` oracle RED on an un-listed file. They are console-only, so
  re-skinning is safe; they are re-skinned, not deferred.
- **Use raw `bg-surface-panel` utilities on the containers instead of the `Panel` primitive (rejected).**
  The Resume point directs "reuse the primitives" and budgets for the graph reconciliation; `Panel` is the
  single-source surface container, so reusing it — and paying the `usedIn` reconciliation — is the governed
  path.
- **Recolor `OTHER_COLOR` to a categorical viz hue, or exclude it from the clean swap (rejected).** The
  'Other' rollup is a deliberately-neutral, de-emphasized line; a categorical hue would misread it as a
  distinct tracked series, and excluding it would leave a shadcn `--color-muted-foreground` on the panel.
  `var(--color-text-tertiary)` is the mission-control de-emphasized-line token (a LINE, not small text, so
  the AA caveat does not bite) — neutral and on-palette.
- **Adopt `MonoData`/`MetricHero` for the numeric readouts (rejected — deferred non-goal).** The charts draw
  numbers as SVG `<text>` (MonoData is HTML, N/A there) or already carry inline `font-mono tabular-nums`;
  wrapping is a second graph reconciliation for no visual/behavioral gain. `Panel` is the primitive that
  fits.
- **Skip the story surface decorator (rejected).** Without it the re-skinned mission-control text tokens
  would be measured by axe against the shadcn `--background` (the reverse half-mix) and could FAIL — the
  decorator keeps axe both correct and green after the swap.

## Test Plan

- **Harness:** Vitest (`npm run test` — the unit jsdom project + the Storybook browser project, which runs
  the axe WCAG 2.2 AA gate over every story, ADR 0039); coverage via `npm run test:coverage` (≥80%, ADR
  0008). No new unit test is required (the re-skin is chrome-only; the four container behavior tests +
  `brush.test.ts` already cover behavior); the surface-decorator stories carry the new axe coverage.
- **Test locations:** the existing colocated tests (`src/widgets/*/ui/*.test.tsx`,
  `src/components/charts/brush.test.ts`) run unchanged; the edited stories are `src/widgets/*/ui/*.stories.tsx`
  and `src/components/charts/*.stories.tsx`.
- **Conventions:**
  - Stories: CSF3, light default + the existing `globals:{theme:'dark'}` Dark story, now wrapped in a
    `bg-surface-panel p-4 rounded-lg` meta decorator; deterministic seeded chart data for Chromatic.
  - Clean-swap proof: the AC1 negated grep (no shadcn value-layer token in the four widget slices + the four
    chart-interaction primitives + route pages, excluding stories/tests) + `check:tokens`.
  - Contrast: `check:contrast` (both compositions) + the axe stories on the surface.
  - Boundaries: `check:graph` / `check:design-intent` / `check:fsd` / `check:boundaries` after the coupled
    `panel.usedIn` reconciliation.
  - Docs: `check:spelling` (cspell) + `check:citations` over the new seam doc; lychee docs link-check runs
    in its own workflow (offline, ADR 0073).

## Definition of Done

- [ ] `npm run test` green; `npm run test:coverage` ≥ 80%.
- [ ] AC1 clean-swap grep returns no matches over the four widget slices + the four chart-interaction
      primitives + the four route pages; `npm run check:tokens` green.
- [ ] `npm run check:contrast` green in **both** compositions; axe green over the surface-decorator stories
      (widgets + charts) in both themes.
- [ ] `npm run check:graph` + `npm run check:design-intent` green after the coupled `panel.usedIn`
      reconciliation (no new node); `npm run check:fsd` + `npm run check:boundaries` green.
- [ ] `npm run check:i18n` key parity green; `gen:tokens` swap-only self-test unchanged (no new tokens).
- [ ] `npm run check:spelling` + `npm run check:citations` green; `docs/capcom/palette-seam.md` authored +
      linked from `src/design-system/README.md` and the progress doc.
- [ ] `tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run build` green.
- [ ] `docs/capcom/console-redesign-progress.md` updated (Phase E row + log + resume→initiative COMPLETE) —
      **before the PR**.
- [ ] Human-approved Chromatic re-baseline (agent never approves its own, ADR 0043/0095).
- [ ] Single human-reviewed PR into `dev`; Conventional Commits; no AI attribution.

## Non-goals

- Any new token, per-theme semantic override, or new `src/components/ui` kit primitive (only `panel.usedIn`
  grows; `src/components/charts` is not graphed).
- Re-skinning `src/components/ui` shadcn kit primitives themselves (ComboField/Combobox) or the
  marketing/landing + auth surfaces — the deliberate, documented seam (ADR 0099).
- Changing the categorical/sequential/diverging viz SERIES/scale palette — untouched. (The one neutral
  'Other' rollup line moves to the mission-control muted token; it is chrome-adjacent, not a tracked series.)
- Adopting `MonoData`/`MetricHero`/`TelemetryStat`/`CategoryPill`/`Hairline`/`StatusIndicator` into these
  widgets (they don't fit; `Panel` is the one that does).
- Any behavior, model, SQL, RPC, i18n-string, or interaction change; any new chart or interaction affordance.
- Changing the widget route structure or `sections.ts`.

## Assumptions

- The mission-control button/input recipe for the raw `<button>`/`<input>` controls is the Phase-C
  events-explorer recipe (`border-border-hairline bg-surface-elevated text-text-secondary
hover:text-text-primary focus-visible:ring-text-primary` + the existing `disabled:` utilities); the exact
  hover/elevated shade is a Chromatic-verified presentation detail.
- Token mappings for the chart internals: bar track → `var(--color-surface-elevated)` (Phase-D PacingCard
  precedent); tooltip surface → `var(--color-surface-overlay)` (Phase-C ColumnsMenu precedent); CohortGrid
  `SCALE_TEXT` → 1:1 (`--color-foreground → --color-text-primary`, `--color-background →
--color-surface-background`), preserving the existing per-bin flip; brush selection/handles →
  `var(--color-text-primary)` (a neutral translucent tint + outline, keeping fillOpacity 0.14). Final
  legibility across the sequential scale and the brush accent in both themes is confirmed by the human
  Chromatic re-baseline.
- The `src/components/charts` interaction primitives are console-only (verified: no marketing/landing/auth
  consumer), so re-skinning them onto mission-control introduces no collateral change to the already-merged
  Phase C/D surfaces (which don't use them, beyond overview's token-clean gradient/motion).
- ADR 0099 is accepted + merged and immutable in place, so the seam doc links one-directionally (doc → ADR
  citation) and the mutable surfaces (progress doc + the new design-system README) link to the doc.
- No new user-facing string is added (a re-skin), so `messages/en.json` is untouched and `check:i18n` is
  trivially green.

## Open Questions

none

## Security / NFR

- **Auth/RLS/secrets/injection:** N/A — no data-access, SQL, RPC, env, or input-parsing change; the widgets
  keep their existing `SECURITY INVOKER` fetch paths untouched.
- **a11y:** WCAG 2.2 AA held by `check:contrast` (both compositions) + the axe stories now rendered on the
  mission-control surface in both themes — including the axe-visible `legend` (its `text-text-secondary` on
  `--surface-panel` is now measured by the F26 decorator). The `<section>`→`Panel` swap preserves the
  labeled-region landmark; every chart + interaction primitive keeps its roles, keyboard path, and the
  single-announcement rule (per-datum aria-label OR live region, never both). The disclosed residuals — the
  `aria-hidden` tooltip box and the SVG crosshair/brush/chart-`<text>` fills, which axe cannot evaluate —
  rest on the AC1 grep + review + the human Chromatic re-baseline (mirroring Phase B's non-storied
  CommandPalette-portal and Phase D's non-storied page-header).
- **i18n:** no string change; key parity trivially holds.
- **Rollout:** presentation-only and fully reversible; no migration. Performance unchanged (same DOM/SVG,
  same fetch paths).

## Critic Verdict & Overrides

- **Round 1: BLOCK** (marvin-tm-spec-critic). Blocker: the four shared ADR-0093 chart-interaction primitives
  (`src/components/charts/{tooltip,legend,crosshair,brush}`) render inside the re-skinned Panels but stayed
  on the shadcn value layer — the half-mix ADR 0099 forbids, on all four surfaces, and outside the original
  AC1 grep scope; `legend.tsx`'s axe-visible `text-muted-foreground` on `--surface-panel` would also turn
  AC2's `npm run test` oracle RED on an un-listed file. **Resolved:** added F21–F28 (re-skin the four
  console-only primitives + their surface-decorator stories), widened AC1's grep scope to
  `src/components/charts` (+ `bg-popover`/`popover-foreground`/`--color-primary` patterns, excluding
  stories/tests), and expanded AC2's `implemented_by`. Both warnings fixed:
  1. `OTHER_COLOR` (`TrendsChart.tsx:64`) is a data-series color AC1 would sweep — F5 now names it
     explicitly, mapping it to `var(--color-text-tertiary)` (the neutral 'Other' rollup line), and the
     Non-goals/Design-Notes "viz series untouched" claim is corrected to carve it out.
  2. F5's wording was fixed — TrendsChart has no `FOCUS_RING` const; its ring is the
     `focus-visible:ring-ring` utility (`:250`).
     **Confirmed by the critic (no change):** the coupled `panel.usedIn` reconciliation is precisely scoped
     (exactly 4 files added to the existing 7); the route-page anchors are exact; the SignalChart precedent
     tokens are real; the AC1 grep word-boundaries are sound; the Panel-swap preserves the region + queried
     headings; the rejected alternatives are genuine.
- **Round 2: PASS WITH WARNINGS** — the Round-1 blocker is fully resolved (the four chart-interaction
  primitives are in scope with surface-decorator stories; AC1's grep scope + patterns verified to have no
  false-positive on the mission-control tokens now in play — `bg-surface-overlay`,
  `--color-surface-background`, `--color-primary-foreground`, `border-border-hairline` all correctly
  excluded by the `\)`/`([^-]|$)` anchors; the critic's own exhaustive `src/components/charts` census
  confirmed F21–F24 is the COMPLETE set — gradient/motion/use-chart-focus/index carry no shadcn color
  token). Two items:
  1. **Warning (ComboField kit-seam label) — ADDRESSED.** `src/shared/ui/ComboField.tsx:37`
     (`text-muted-foreground`) renders on the AppShell `--surface-background` OUTSIDE any Panel; it is the
     declared shadcn-kit seam consumed as-is (Non-goals), AA-passing, and NOT a Phase-E regression (present
     since Phase B). Rather than re-skin the kit (out of scope), F29's seam doc now explicitly documents it
     as a deliberate, AA-passing intra-console kit-seam residual so a future reviewer doesn't read it as a
     missed half-mix.
  2. **Labeling nit (F25/F27/F28 satisfies [AC2]) — accepted, no change.** The tooltip (aria-hidden) and
     crosshair/brush (SVG) stories are not axe-evaluable, but they ARE the surface-decorator stories AC2's
     statement covers and they render under `npm run test` + carry the Chromatic verification; AC2's prose
     already discloses the non-axe residual. The critic flagged it as harmless with "no action required for
     DoR." Kept as-is.
     **Override:** proceeding on PASS WITH WARNINGS — the one substantive warning is addressed in F29; the
     labeling nit is consciously accepted.

## Design Notes

- **Why the story surface decorator is REQUIRED, not cosmetic.** The mission-control `--text-*` tokens are
  tuned to pair with `--surface-*` backgrounds for AA; they are NOT guaranteed against the shadcn
  `--background` the stories currently render on. After the re-skin the chart + legend HTML chrome uses
  `text-text-secondary`/`-primary`, so leaving the story on `--background` would measure the reverse
  half-mix and could turn the axe gate RED. Wrapping each story meta in `bg-surface-panel` reproduces the
  production surface, so axe verifies the real pairing and Chromatic shows the chart on its true surface.
- **The clean-swap grep (AC1) is the load-bearing proof.** `check:tokens` allows BOTH palettes (both are
  allowlisted), and `check:contrast` only covers the fixed status/text pairs — so neither distinguishes a
  leftover shadcn foreground from a mission-control one. The negated grep over the four widget slices + the
  four chart-interaction primitives + the four route pages (excluding stories/tests) is the mechanical proof
  that the swap is total; its word boundaries (`border-border([^-]|$)`, `--color-border\)`,
  `--color-background\)`, `--color-muted\)`, `--color-primary\)`) exclude the mission-control tokens
  (`border-border-hairline`, `--color-border-hairline`, `--color-surface-background`, `--color-primary-foreground`).
- **The chart-interaction layer is console-only and NOT graphed.** `src/components/charts/*` have no node in
  the composition graph (the graph's `tooltip` node is the different `src/components/ui/tooltip.tsx`) and no
  `design-intent.ts`, so re-skinning them is a pure token swap with no graph/design-intent churn — only
  `panel.usedIn` (for the four containers) changes. They are consumed only by the analytics charts (overview's
  `SignalChart` uses just the token-clean gradient/motion), so the swap is collateral-free to Phases C/D.
- **Coupled reconciliation is the Phase-D gotcha, not "no graph change."** A new widget consuming an EXISTING
  primitive still changes `panel.usedIn` (graph + design-intent, lockstep). Only the four containers import
  `Panel`; the charts do not. No node is added.
- **`Panel` preserves the region.** `<Panel role="region" aria-label={…}>` renders a `<div role="region">`
  with an accessible name — landmark-equivalent to the current `<section aria-label>`; the h2 the container
  tests query stays inside. No test edit needed.

## Future Considerations

- With Phase E merged the console-redesign initiative is complete; the deliberate marketing↔console seam is
  now a documented, durable contributor guide (`docs/capcom/palette-seam.md`).
- A future ADR could extend the token-lint glob to `src/app` so route-page headers are gated automatically
  rather than by the grep, or promote a proven chart-container pattern into a governed `src/components/ui`
  primitive (the deferred MonoData/MetricHero adoption).
- An interactive-legend / tooltip a11y polish pass across the analytics charts (ADR 0093) remains a natural
  follow-up, independent of the surface re-skin.

## Delivery

- **PR:** [#38](https://github.com/real-case/capcom/pull/38) — `feat/console-phase-e-analytics-reskin` →
  `dev` (open, not merged).
- **Commits:** `64df078` (implementation, 32 files), plus the progress-tracker PR record.
- **Reviews:** `marvin-tm-diff-critic` **PASS WITH WARNINGS** (no blockers; all 5 ACs independently
  verified — clean-swap grep 0 matches, the coupled `panel.usedIn` +4 confirmed in lockstep, the re-skin
  confirmed collateral-free to the merged Phase-C/D surfaces).
- **Verification:** all gates green — clean-swap grep **0 matches** (AC1), `npm run test` **719/719** across
  136 files with axe in both compositions (AC2/AC3), `check:contrast` both compositions, `check:tokens`,
  `check:graph`/`check:design-intent` (AC4), `check:fsd`/`check:boundaries`, `check:i18n`,
  `check:spelling`/`check:citations` (AC5), `gen:tokens` swap-only self-test with **zero token drift**,
  `tsc`, lint (`src`), build, coverage 90.38%/82.88%/87.14%/92.69%. Scope gate PASS (31 in-scope files
  within the allowlist).
- **SPEC GAPs (recorded):** (1) F28's `brush.stories.tsx` also needed its "Whole window" fixture caption
  swapped off `text-muted-foreground` — a real half-mix (4.49:1 on the light panel) that the new surface
  decorator surfaced via axe, fixed in the same allowlisted file. (2) `gradient.stories.tsx` /
  `motion.stories.tsx` were initially left on shadcn `bg-card` — outside the sealed allowlist and not a
  half-mix (no mission-control text token; AA-safe, axe green) — then re-skinned onto `bg-surface-panel`
  **at the 👤's explicit direction** after the diff-critic flagged the split Chromatic catalog. A
  **user-authorized addition beyond this sealed contract's `files` allowlist** (scope gate re-run with
  `allow`), recorded here rather than silently absorbed; the contract itself is unchanged. (3) F31
  (`.cspell/project-words.txt`) was a no-op — no new words needed.
- **Pending human gates:** review, Chromatic re-baseline (ADR 0043/0095), merge into `dev`.

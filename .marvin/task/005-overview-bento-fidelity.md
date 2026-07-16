---
slug: overview-bento-fidelity
type: feature
status: ready
created: 2026-07-16
tracker: docs/capcom/console-redesign-progress.md (post-initiative follow-up)
supersedes: none
stack: typescript
risk: medium
breaking: false
spike_required: false
test_command: npm run test
contract_sha: 1410ac3ff78d1e5c
---

# Overview bento fidelity — bring the console home up to the frozen design reference

## Goal

Rebuild the project Overview as the **six-cell asymmetric bento of the frozen design reference**
(`docs/capcom/design-reference/console-build-reference.html`, the design source ADR 0099 names), replacing
the flat uniform grid Phase D shipped. The SQL + entity layer already landed in the precursor
(`overview-signal-and-scatter-rpcs`, PR #39): this spec is **UI only** — no new SQL, no new token, no new
kit primitive, no new ADR.

## Context

- **Stacked on the precursor (read first).** The SQL/entity layer this consumes — `fn_segment_scatter`,
  the `purchasers` column on `fn_overview_signal`, `fetchSegmentScatter`, and the generated types — shipped
  in `.marvin/task/006-overview-signal-and-scatter-rpcs.md` (PR #39, all gates green, `supabase-rls-reviewer`
  CLEAN). This branch is **cut from that branch**, so the code is physically present; `depends_on` is left
  `[]` only because the DoR gate requires a _shipped_ sibling and #39 is delivered-but-not-yet-merged. The
  dependency is real and enforced by the branch base: **this must not merge to `dev` before #39.**
- **The defect.** `src/widgets/overview-dashboard/ui/OverviewDashboard.tsx:96` is
  `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` with **no `col-span`/`row-span`** → five cards render as row 1
  (three) + row 2 (two **and a visible hole**); the Signals row (`:127`) is the same flat grid. ADR 0099
  mandates a "first-class, curated **bento**" and names the build reference as the design source. Raised by
  the 👤 against the running demo.
- **The reference bento**, transcribed from the frozen file (immutable per its README):
  `.bento { display:grid; grid-template-columns: 1.55fr 0.95fr 1.1fr; grid-auto-rows: minmax(10px,auto);
gap: var(--sp4) }` (`:502`), collapsing to `1fr` at the mobile breakpoint (`:1092`). Six cells:
  - `b-hero` (col 1, `row 1/span 2`, `:509`) — eyebrow "Active users", `metric-hero` value, a delta chip, a
    legend (one entry per plan), and a **multi-series area chart**.
  - `b-stack` (col 2, `row 1/span 2`, `:515`) — a **bare flex column** (`:1538`) of **three
    `<div class="panel mini">`** (`:1539/1573/1607`). **Each mini is eyebrow + metric + delta AND a
    sparkline `<svg viewBox="0 0 240 48">`** (`:1544-1569`, `:1579-1605`, `:1613-1639`). Load-bearing.
  - `b-goal` (col 3, `row 1/span 2`, `:522`) — a `.phead` (eyebrow + a right-hand caption), a **radial**, a
    `.gauge-center`, **and a 4-row `.kv` block** (`:1645-1710`). The cell spans two rows, so it needs all of
    that not to be sparse.
  - `b-bars` (col 1, row 3, `:526`) — "Weekly sign-ups by plan", **stacked bars**.
  - `b-funnel` (col 2, row 3, `:530`) — "Activation funnel": an overall %, three labelled steps with
    proportional gradient fills, a step-over-step footnote.
  - `b-seg` (col 3, row 3, `:534`) — "Segments · freq × LTV", a **scatter**.
- **Existing RPCs cover all six cells now that the precursor shipped:**
  - `fn_event_trends(p_project_id, p_event_name, p_from, p_to, p_interval, p_breakdown_key,
p_breakdown_limit)` → `TABLE(bucket, series, count)` (`20260625150535_create_event_trends.sql:35-49`).
    Breaks down by the **event's** `e.properties->>p_breakdown_key` (`:76-79`), **not** `profiles.traits`;
    works for `plan` because the seed stamps both (`seed-events.mjs:122,174`) — a seed guarantee, recorded
    as an Assumption. `p_breakdown_limit=3` over 3 seeded plans yields no `Other` series (`:88-100`),
    matching the reference's 3-entry legend. Drives `b-hero` and `b-bars`.
  - `fn_overview_kpis` returns all eight scalars incl. every `_prev`
    (`20260714120000_create_overview_kpis.sql:39-49`) → the hero value/delta, the mini metrics/deltas, and
    the goal cell's rows.
  - `fn_overview_signal(p_project_id, p_from, p_to, p_interval)` → per-bucket `active_users` / `new_signups`
    / `value_sum` / **`purchasers`** (the precursor's new column) — the minis' sparkline data.
  - `fn_funnel(p_project_id, p_steps text[], p_from, p_to, p_window)` → `(step_index, step_event, users)`
    (`20260626103244_create_funnel.sql:42-49`) → `b-funnel`.
  - `fn_segment_scatter` (precursor) → `b-seg`. `fetchSegmentScatter` + `SegmentScatterPoint` are on the
    `segment` entity's public API (shipped).
- **The ratio-sparkline design (the round-2 blocker, now resolvable).** The three minis are New sign-ups ·
  Conversion · Avg revenue/user. `newSignups` maps to the `new_signups` COLUMN. But `conversion =
purchasers/active_users` and `arpu = value_sum/active_users` are **per-bucket ratios**, and
  `SignalChart`'s `SignalMeasure` is a closed union of column names — it cannot express a ratio. The
  precursor added `purchasers` precisely so the numerator EXISTS per bucket; this spec extends
  `SignalMeasure` with two **derived** measures (`"conversion"`, `"arpu"`) whose point extraction divides two
  already-reduced columns of the SAME row (presentation, ADR 0087/0088 — not an app-code reduction, and not a
  cross-row join). Without the precursor's `purchasers` column, `"conversion"` would be inexpressible — that
  is why the SQL went first.
- **Component mapping (reuse over new).** `KpiCard` becomes the reference's `.panel.mini` (eyebrow + metric +
  delta + a `SignalChart` sparkline), dropping `MetricHero` for a denser metric; `PacingCard` becomes the
  goal cell (radial + the kv block); `SignalChart` **survives and gains the two derived measures**; only
  genuinely-new visuals become components (`HeroChart`, `StackedBars`, `FunnelPreview`, `SegmentScatter`, and
  a presentational `BentoGrid` layout shell). All are widget-internal `ui/` segments, **not** kit primitives
  (the Phase-D precedent) — no graph **node** is added or removed.
- **Exact current graph state (verified — these gates are exact-set):** `panel.usedIn` = 11 files (overview
  consumers `KpiCard`, `OverviewDashboard`, `PacingCard`); `metric-hero` = 2 (`KpiCard`, `PacingCard`);
  `mono-data` = 5 (`KpiCard`); `status-indicator` = 2 (`KpiCard`). `check-composition-graph.mjs:109-118`
  compares as a **set** (a stale entry fails as hard as a missing one); `check-design-intent.mjs:244`
  requires `sortedEq(meta.usedIn, node.usedIn)`. **`OverviewDashboard` must be REMOVED from `panel.usedIn`** —
  it imports `Panel` (`:6`) only to wrap the SignalCharts (`:129`), and after F23 every cell owns its own
  Panel.
- **FSD constraint (load-bearing).** `b-hero`'s chart resembles
  `src/widgets/trends-explorer/ui/TrendsChart.tsx`, but **a widget may not import another widget** (ADR
  0065/0066, Steiger). Phase D's `SignalChart` set the mirror-don't-import precedent (its docstring says so).
  `@/components/charts` is outside FSD and **is** importable from widgets.
- Sibling specs: `overview-signal-and-scatter-rpcs` (the precursor this stacks on),
  `.marvin/task/003-console-phase-d-overview-dashboard.md` / `004-...` (shipped).
- Constraints: mission-control tokens only (ADR 0099); no aggregation in app code (ADR 0084) — per-bucket and
  windowed ratios over already-reduced scalars stay presentation (ADR 0087/0088); small text uses
  `--text-secondary`, **never** `--text-tertiary` (`mono-data.tsx:12-14` states it is not AA-guaranteed).

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: src/lib/query/keys.ts
    action: edit
    intent: >-
      Extend the `overview` key factory with hero(args) / bars(args) / funnel(args) / scatter(args), each
      keyed by the exact RPC arg bag. RETAIN overview.signal — SignalChart survives as the minis' sparkline,
      so the key is not orphaned. No inline key literals at call sites.
    satisfies: [AC1]
    anchor: src/lib/query/keys.ts:28
  - id: F2
    path: src/widgets/overview-dashboard/api/use-overview.ts
    action: edit
    intent: >-
      Add useOverviewHero(args) + useOverviewBars(args) wrapping the EXISTING fetchEventTrends (no new SQL),
      useActivationFunnel(args) wrapping the existing funnel fetcher, and useSegmentScatter(args) wrapping the
      shipped fetchSegmentScatter (from @/entities/segment) — all keyed by F1. RETAIN useOverviewSignal (the
      minis' sparkline data, now incl. purchasers). No "use client" here (ADR 0002); the hooks own no
      aggregation.
    satisfies: [AC1]
  - id: F3
    path: src/widgets/overview-dashboard/model/window.ts
    action: edit
    intent: >-
      Add arg builders, all derived from the SAME nuqs `range` so one control drives the whole bento:
      toHeroArgs (event='page_view', interval='day', breakdown='plan', breakdown_limit=3); toBarsArgs
      (event='sign_up', breakdown='plan', interval RANGE-AWARE — 'day' at 7d, 'week' at 30d/90d, so a 7d
      range does not render 1-2 bars; mirror the shipped signalInterval posture at :42-44); toFunnelArgs
      (steps ['page_view','sign_up','feature_used'], window = the range span); toScatterArgs. RETAIN
      signalInterval/toSignalArgs (the minis' sparklines). Keep the UTC-day-floored window so query keys stay
      stable within a day.
    satisfies: [AC1, AC5]
  - id: F4
    path: src/widgets/overview-dashboard/model/window.test.ts
    action: edit
    intent: >-
      Extend the unit tests: each new builder emits its exact typed bag (p_breakdown_key='plan', the
      range-aware bars interval incl. the 7d='day' case, the funnel steps + window, the scatter bag) and all
      builders derive from the one shared range window. Signal-arg tests retained.
    satisfies: [AC5]
  - id: F5
    path: src/widgets/overview-dashboard/model/kpis.ts
    action: edit
    intent: >-
      Partition KPI_DESCRIPTORS (:24-29) explicitly: export HERO_KPI ('activeUsers' — the hero headline) and
      STACK_KPIS (newSignups, conversion, arpu — the reference's three minis, each mapped to a SignalMeasure:
      new_signups → column, conversion/arpu → the two derived measures), so F23 slices named exports rather
      than indexing the array. Add GOAL_ROWS — the goal cell's target-free row descriptors (revenue this
      period/previous, pace, purchasers, ARPU) derived from already-reduced scalars. deriveKpis/formatters
      unchanged — still pure presentation over already-reduced scalars (ADR 0087/0088).
    satisfies: [AC1, AC2]
  - id: F6
    path: src/widgets/overview-dashboard/model/kpis.test.ts
    action: edit
    intent: >-
      Extend the unit tests — HERO_KPI + STACK_KPIS partition the descriptor set with no overlap or omission;
      GOAL_ROWS derive from already-reduced scalars with divide-by-zero guarded to null.
    satisfies: [AC2]
  - id: F7
    path: src/widgets/overview-dashboard/ui/KpiCard.tsx
    action: edit
    intent: >-
      Becomes the reference's `.panel.mini` (console-build-reference.html:1539-1569): Panel + eyebrow + the
      metric (MonoData at its existing tone axis — no new kit variant) + the delta (StatusIndicator) + a
      SignalChart sparkline fed the descriptor's SignalMeasure (new_signups direct, or the derived
      conversion/arpu). DROPS the MetricHero import (the mini's metric is denser than the metric-hero role) →
      metric-hero.usedIn loses this file (F25/F27). Keeps Panel/MonoData/StatusIndicator. Presentational;
      owns no fetching.
    satisfies: [AC2, AC4, AC8]
  - id: F8
    path: src/widgets/overview-dashboard/ui/KpiCard.stories.tsx
    action: edit
    intent: Update stories for the mini form incl. the sparkline (WithData / NoDelta / Loading / Empty / Error, light + Dark) on the bg-surface-panel decorator. Deterministic fixtures.
    satisfies: [AC4]
  - id: F9
    path: src/widgets/overview-dashboard/ui/PacingCard.tsx
    action: edit
    intent: >-
      Becomes the goal cell (b-goal, :1645-1710): Panel + a phead (eyebrow + caption) + the reference's
      RADIAL gauge (an SVG arc swept by the EXISTING pacingRatio — value_sum/value_sum_prev, no new data), a
      gauge-center %, AND the 4-row kv block filled with the 👤-chosen TARGET-FREE rows from F5's GOAL_ROWS
      (revenue this period vs previous · pace · purchasers · ARPU) via MonoData — so the 2-row span is dense,
      not sparse. **KEEPS the MetricHero import** for the gauge-center % (so metric-hero.usedIn retains this
      file — F27 does NOT remove it) and **GAINS the MonoData import** for the kv rows (F25/F28). Track on
      --color-surface-elevated; the fill diverges
      from the reference's decorative viz gradient to --color-status-nominal-fg / -caution-fg by threshold (a
      semantic-over-decorative deviation, disclosed). Copy is honest: "vs the previous period", never "Q3
      target" (no goals table exists). role="img" + summary aria-label.
    satisfies: [AC2, AC4, AC8, AC9]
  - id: F10
    path: src/widgets/overview-dashboard/ui/PacingCard.stories.tsx
    action: edit
    intent: Update stories for the radial + kv rows (AheadOfPace / BehindPace / Loading / Empty / Error, light + Dark) on the surface decorator.
    satisfies: [AC4]
  - id: F11
    path: src/widgets/overview-dashboard/ui/SignalChart.tsx
    action: edit
    intent: >-
      RETAINED (the reference mini's sparkline) and EXTENDED. Adapt to the mini form: the reference's 240×48
      viewBox proportion, gradient area + line, no axes. Extend `SignalMeasure` from the three columns to add
      two DERIVED measures — `"conversion"` (row.purchasers / row.active_users) and `"arpu"` (row.value_sum /
      row.active_users) — computed per bucket inside the point extractor, each guarding a zero denominator to
      0 (a ratio of two already-reduced scalars of the SAME row is presentation, ADR 0087/0088; it is NOT a
      cross-row reduction). `purchasers` is now a column on OverviewSignalBucket (shipped in the precursor).
      Stays presentational. **DECORATIVE a11y (matching the reference, :1546/:1583/:1617):** SignalChart is
      now used ONLY inside a mini, whose eyebrow + metric + delta already announce the value, so the sparkline
      is `aria-hidden` (not role="img") — this removes a redundant fourth announcement AND avoids the
      single-announcement question entirely; the informative bento charts (Hero/Bars/Funnel/Scatter) keep
      role="img"+summary. Imports only @/components/charts + @/entities/event. No kit primitive → no graph node.
    satisfies: [AC2, AC4]
  - id: F12
    path: src/widgets/overview-dashboard/ui/SignalChart.stories.tsx
    action: edit
    intent: Retained; update fixtures/viewBox for the mini sparkline form and add a story per derived measure (conversion/arpu) — WithData / Loading / Empty / Error, light + Dark — on the surface decorator.
    satisfies: [AC4]
  - id: F13
    path: src/widgets/overview-dashboard/ui/HeroChart.tsx
    action: new
    intent: >-
      The b-hero cell: Panel + eyebrow + the MetricHero active-users value + a delta chip (StatusIndicator) +
      the shared ChartLegend (one entry per plan) + a presentational visx multi-series AREA chart over
      fetchEventTrends rows. MIRRORS TrendsChart's STRUCTURE (fixed viewBox, aspect-ratio box, AreaGradient
      per series, MotionIn, a Message state box) but does NOT import it — widget↛widget is an FSD violation;
      @/components/charts is importable. Imports Panel + MetricHero + StatusIndicator + **MonoData** — the
      delta digits use MonoData inside the StatusIndicator chip, matching KpiCard.tsx:74 and ADR 0099's
      "numeric values in the mono-data role" (so HeroChart is added to mono-data.usedIn in F25/F28; not
      excluding it avoids the round-1 exact-set trap and keeps the implementer on the KpiCard pattern) →
      F25/F26/F27/F28/F29. Series colours var(--color-viz-*); chrome on mission-control tokens. Receives
      reduced rows + the derived value/delta as props; owns no fetching/aggregation.
    satisfies: [AC2, AC4, AC7, AC8]
  - id: F14
    path: src/widgets/overview-dashboard/ui/HeroChart.stories.tsx
    action: new
    intent: CSF3 stories on a bg-surface-panel decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures. Presentational → no play.
    satisfies: [AC4]
  - id: F15
    path: src/widgets/overview-dashboard/ui/StackedBars.tsx
    action: new
    intent: >-
      The b-bars cell: Panel + eyebrow + a presentational visx STACKED bar chart (@visx/shape BarStack) over
      the same fetchEventTrends shape (buckets × plan series), a token'd colour scale (var(--color-viz-*)),
      fixed viewBox, MotionIn, a Message state box, role="img" + summary label (no per-datum labels and no
      live region). Imports Panel. Presentational.
    satisfies: [AC2, AC4, AC7, AC8]
  - id: F16
    path: src/widgets/overview-dashboard/ui/StackedBars.stories.tsx
    action: new
    intent: CSF3 stories on the surface decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures.
    satisfies: [AC4]
  - id: F17
    path: src/widgets/overview-dashboard/ui/FunnelPreview.tsx
    action: new
    intent: >-
      The b-funnel cell: Panel + eyebrow + the overall conversion % + three labelled steps with proportional
      gradient fills + the step-over-step footnote, fed already-reduced fn_funnel rows. Step %s are a ratio of
      two returned counts = presentation (ADR 0087). Gradients between var(--color-viz-*) tokens; widths are
      computed styles, not raw literals (the GroupRollup precedent). Message state box. Imports Panel.
    satisfies: [AC2, AC4, AC7, AC8]
  - id: F18
    path: src/widgets/overview-dashboard/ui/FunnelPreview.stories.tsx
    action: new
    intent: CSF3 stories on the surface decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures.
    satisfies: [AC4]
  - id: F19
    path: src/widgets/overview-dashboard/ui/SegmentScatter.tsx
    action: new
    intent: >-
      The b-seg cell: Panel + eyebrow + a presentational visx SCATTER of the shipped fn_segment_scatter rows
      (x = frequency, y = ltv), points coloured per plan from var(--color-viz-*), axis captions on
      --color-text-secondary (NOT --text-tertiary — the repo states tertiary is not AA-guaranteed and neither
      check:contrast nor axe can measure SVG text), fixed viewBox, MotionIn, a Message state box, role="img" +
      summary label. Imports Panel + the SegmentScatterPoint type from @/entities/segment. Presentational.
    satisfies: [AC2, AC4, AC7, AC8]
  - id: F20
    path: src/widgets/overview-dashboard/ui/SegmentScatter.stories.tsx
    action: new
    intent: CSF3 stories on the surface decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures.
    satisfies: [AC4]
  - id: F21
    path: src/widgets/overview-dashboard/ui/BentoGrid.tsx
    action: new
    intent: >-
      A PRESENTATIONAL layout shell carrying the reference geometry and nothing else. **The collapse is a
      CONTAINER query, not a viewport `@media`** (a deliberate, disclosed divergence from the reference's
      `@media (max-width:1080px)` at :1071/:1092): the shell is a `@container` (Tailwind v4 has container
      queries in core — `container-type: inline-size` on the wrapper), and the grid uses
      `grid-cols-1 @[1080px]:grid-cols-[1.55fr_0.95fr_1.1fr]` so a **fixed-width story wrapper deterministically
      drives BOTH the 3-track and 1-track states** regardless of the headless iframe's unpinned width (which no
      viewport-`@media` proof could control — the storybook project has no viewport addon). Named slots span
      hero/stack/goal rows 1-2 and bars/funnel/seg on row 3. **Every slot gets `min-w-0 min-h-0`** — grid items
      default to `min-width:auto`, so a chart's intrinsic min-content would otherwise distort the resolved fr
      pixel widths and break AC3's ratio assertion. Takes the six cells as ReactNode props; imports no kit
      primitive (a layout div) → no graph node. Grid track ratios are layout proportions, not tokenizable
      colour/size — arbitrary-value utilities are correct here (ADR 0058 unaffected).
    satisfies: [AC3, AC7]
  - id: F22
    path: src/widgets/overview-dashboard/ui/BentoGrid.stories.tsx
    action: new
    intent: >-
      The GEOMETRY PROOF (AC3) — the one oracle that can see the defect. CSF3 stories with a `play` running in
      the Storybook BROWSER project (real CSS, unlike jsdom). BECAUSE the collapse is container-query-driven
      (F21), both stories set a FIXED-WIDTH decorator wrapper and assert deterministically: a Desktop story at a
      ≥1080px wrapper asserts getComputedStyle(grid).gridTemplateColumns resolves THREE non-zero tracks in the
      reference RATIO (computed values are pixels, so assert the proportion 1.55 : 0.95 : 1.1 within a
      tolerance, never the literal `fr` string), each of the six slots reports its expected gridColumn/gridRow
      (hero/stack/goal spanning rows 1-2), and NO grid cell is empty (six placements cover the 3×3 span area);
      a Mobile story at a <1080px wrapper asserts a SINGLE track (the container query fired). Plus a Dark story.
    satisfies: [AC3, AC4]
  - id: F23
    path: src/widgets/overview-dashboard/ui/OverviewDashboard.tsx
    action: edit
    intent: >-
      Replace the two flat uniform grids with <BentoGrid> (F21), passing HeroChart / the three mini KpiCards
      (b-stack is a bare flex column, per the reference) / PacingCard / StackedBars / FunnelPreview /
      SegmentScatter. Drives every cell from the ONE nuqs `range`; calls the new hooks + the retained
      useOverviewSignal + useSegmentScatter; slices F5's HERO_KPI / STACK_KPIS / GOAL_ROWS; threads
      isPending/isError/empty into the presentational children; drops the Signals section (its sparklines now
      live inside the minis). STOPS importing Panel (every cell owns its own) → panel.usedIn REMOVES this file
      (F25/F26). All copy via useTranslations('Overview').
    satisfies: [AC1, AC2, AC8]
    anchor: src/widgets/overview-dashboard/ui/OverviewDashboard.tsx:96
  - id: F24
    path: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx
    action: edit
    intent: >-
      Update the behaviour test (existing idiom: vi.mock the entity fetchers incl. @/entities/segment + the
      supabase client; real hooks under QueryClientProvider + NextIntlClientProvider + NuqsTestingAdapter).
      Assert: every hook is called with its derived arg bag (incl. p_breakdown_key='plan' and the funnel
      steps); the six cells render from the mocked reduced rows with no client re-aggregation;
      loading/error/empty thread through; the standalone Signals section is GONE (queryByText of its heading is
      null — a genuine orphan-copy proof, since check:i18n cannot detect orphans); the goal cell renders the
      target-free rows and no "target" copy.
    satisfies: [AC1, AC2, AC9]
  - id: F25
    path: src/design-system/composition-graph.json
    action: edit
    intent: >-
      Coupled reconciliation — the gates are EXACT-SET, so removals matter as much as additions.
      panel.usedIn: REMOVE src/widgets/overview-dashboard/ui/OverviewDashboard.tsx (F23 stops importing
      Panel); ADD HeroChart, StackedBars, FunnelPreview, SegmentScatter (11 − 1 + 4 = 14). metric-hero.usedIn:
      REMOVE KpiCard.tsx (F7 drops MetricHero); ADD HeroChart — PacingCard STAYS (F9 keeps MetricHero for the
      gauge-center %), so the set becomes {PacingCard, HeroChart} (2). mono-data.usedIn: ADD PacingCard.tsx
      (F9) AND HeroChart.tsx (F13's delta digits use MonoData) — KpiCard STAYS (F7 keeps MonoData); 5 + 2 = 7.
      status-indicator.usedIn: ADD HeroChart (3). No node added or removed (SignalChart / BentoGrid import no
      kit primitive; nodes are src/components/ui only).
    satisfies: [AC8]
  - id: F26
    path: src/components/ui/panel.design-intent.ts
    action: edit
    intent: Mirror F25's panel deltas in meta.usedIn (−OverviewDashboard, +HeroChart/StackedBars/FunnelPreview/SegmentScatter), in lockstep — check:design-intent requires exact equality with the node.
    satisfies: [AC8]
  - id: F27
    path: src/components/ui/metric-hero.design-intent.ts
    action: edit
    intent: Mirror F25's metric-hero deltas in meta.usedIn (−KpiCard, +HeroChart), in lockstep.
    satisfies: [AC8]
  - id: F28
    path: src/components/ui/mono-data.design-intent.ts
    action: edit
    intent: Mirror F25's mono-data deltas in meta.usedIn (+PacingCard, +HeroChart), in lockstep.
    satisfies: [AC8]
  - id: F29
    path: src/components/ui/status-indicator.design-intent.ts
    action: edit
    intent: Mirror F25's status-indicator delta in meta.usedIn (+HeroChart), in lockstep.
    satisfies: [AC8]
  - id: F30
    path: messages/en.json
    action: edit
    intent: >-
      Extend the `Overview` namespace with the bento copy (hero eyebrow + chart label; the three mini labels;
      the goal eyebrow + caption + the four target-free row labels + "vs the previous period"; the bars eyebrow
      + chart label; the funnel eyebrow + step labels + overall/step-over-step captions; the scatter eyebrow +
      axis captions + chart label; per-cell loading/empty/error). Precise `signal.*` reconciliation: remove the
      standalone `signalHeading`; **KEEP** `signal.new_signups` (a surviving mini); **ADD** `signal.conversion`
      + `signal.arpu` (the two new derived-measure minis' sparkline aria labels); and **REMOVE the two now-
      orphaned keys** `signal.active_users` + `signal.value_sum` — their standalone sparklines are deleted (the
      hero uses the KPI headline + area chart, not a SignalChart), and no gate catches an orphaned key, so drop
      them here deliberately. Authored via the add-translation discipline (ICU intact; one catalog, ADR
      0030/0055).
    satisfies: [AC9]
    anchor: messages/en.json:1
  - id: F31
    path: docs/capcom/console-redesign-progress.md
    action: edit
    intent: >-
      Add a dated follow-up entry: the Phase-D gap (uniform grid + hole vs the frozen reference), the 👤
      decisions (radial on existing prior-period pacing with target-free kv rows — no goals table), the
      spec-critic catches (the reference minis carry sparklines → SignalChart retained; the conversion/arpu
      minis need derived-ratio measures the precursor's purchasers column enables), what landed, and the gate
      results — including that Chromatic could not run (token unprovisioned) and that this stacks on PR #39.
      The Phase 0–E status table is unchanged.
    satisfies: ["—"]
build_order:
  [
    F1,
    F3,
    F4,
    F5,
    F6,
    F2,
    F11,
    F12,
    F7,
    F8,
    F9,
    F10,
    F13,
    F14,
    F15,
    F16,
    F17,
    F18,
    F19,
    F20,
    F21,
    F22,
    F25,
    F26,
    F27,
    F28,
    F29,
    F23,
    F24,
    F30,
    F31,
  ]
depends_on: []
contract:
  kind: none
criteria:
  - id: AC1
    statement: >-
      Given the bento, when OverviewDashboard mounts, then every cell is driven from the ONE nuqs `range` via
      queryKeys.overview.*(args) — hero and bars through the EXISTING fn_event_trends with
      p_breakdown_key='plan' (no new SQL), the minis' sparklines through the retained fn_overview_signal, the
      funnel through fn_funnel, the scatter through the shipped fn_segment_scatter — and the presentational
      children receive reduced rows as props (no fetching or key literals in children).
    implemented_by: [F1, F2, F3, F5, F23, F24]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx::drives every bento cell from the shared range with the derived arg bags
    failure: Inline key literals, a child that fetches, a cell on its own range, or a hook called with the wrong arg bag.
  - id: AC2
    statement: >-
      Given the Overview route, when it renders, then all six reference cells are PRESENT and fed reduced rows
      — hero (value + delta + legend + area chart), three minis each with metric + delta + sparkline (the two
      ratio minis fed the derived conversion/arpu measures), the goal cell with the radial and its four
      target-free rows, stacked bars, the activation funnel, and the scatter — and the standalone Signals
      section is gone.
    implemented_by: [F5, F6, F7, F9, F11, F13, F15, F17, F19, F23, F24]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx::renders the six reference bento cells and no standalone signal row
    failure: A missing cell, a mini without its sparkline, a goal cell without its rows, or a surviving Signals section.
  - id: AC3
    statement: >-
      Given the bento layout, when the BentoGrid stories run in the Storybook BROWSER project (real CSS), then
      at a ≥1080px fixed-width wrapper getComputedStyle reports three non-zero grid tracks in the reference
      ratio (1.55 : 0.95 : 1.1, within tolerance — pixels, not the `fr` string), each of the six slots occupies
      its expected gridColumn/gridRow (hero/stack/goal spanning rows 1-2; bars/funnel/seg on row 3), and NO
      grid cell is empty; and at a <1080px fixed-width wrapper the CONTAINER query fires and the grid resolves
      to a single track. Both are deterministic because the collapse is container-driven (F21), not a viewport
      `@media` the headless iframe's unpinned width could defeat.
    implemented_by: [F21, F22]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/BentoGrid.stories.tsx::resolves three grid tracks with every slot placed and no empty cell
    failure: >-
      The hole this spec exists to remove survives, a track collapses, or the mobile breakpoint does not
      single-column — none of which jsdom can see (it performs no CSS layout), which is precisely why the
      geometry is proven in browser mode rather than by the widget test.
  - id: AC4
    statement: >-
      Given the new/changed cell components with their dark and light surface-decorator stories, when the token
      and contrast gates and the Storybook axe run execute, then they use only allowlisted mission-control
      tokens (no shadcn value layer, no raw colour/size literals, no --text-tertiary for text) and clear WCAG
      2.2 AA in BOTH compositions.
    implemented_by:
      [F7, F8, F9, F10, F11, F12, F13, F14, F15, F16, F17, F18, F19, F20, F22]
    oracle:
      kind: command
      ref: npm run check:tokens && npm run check:contrast && npm run test
    failure: A shadcn foreground on a --surface bg failing AA (caught by the axe story under `npm run test`, not by check:tokens/check:contrast), or a raw literal flagged by check:tokens.
  - id: AC5
    statement: >-
      Given a selected range, when the arg builders run, then each emits its exact typed bag
      (p_breakdown_key='plan'; hero interval 'day'; bars interval range-aware — 'day' at 7d, 'week' at
      30d/90d; the funnel step array and window; the scatter bag), all derived from the one UTC-day-floored
      window so query keys stay stable within a day.
    implemented_by: [F3, F4]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/model/window.test.ts::derives every bento arg bag from the one shared range window
    failure: A cell on a divergent window, a missing breakdown key, a 7d range rendering 1-2 stacked bars, or an un-floored `to`.
  - id: AC7
    statement: >-
      Given the widget, when the boundary gates run, then it imports only downward (entities, components/ui,
      components/charts, shared, lib) and imports NO other widget — in particular HeroChart mirrors
      TrendsChart's structure without importing `@/widgets/trends-explorer` — and no new kit primitive is added.
    implemented_by: [F13, F15, F17, F19, F21, F23]
    oracle:
      kind: command
      ref: npm run check:fsd && npm run check:boundaries
    failure: A widget→widget import (the FSD trap), an upward import, or a new primitive added without registration.
  - id: AC8
    statement: >-
      Given the changed imports, when the design-system gates run, then every primitive's node usedIn and its
      design-intent meta.usedIn agree EXACTLY and in lockstep — panel loses OverviewDashboard and gains the
      four new cells (→14); metric-hero loses KpiCard and gains HeroChart (PacingCard stays →2); mono-data
      gains PacingCard AND HeroChart (KpiCard stays →7); status-indicator gains HeroChart (→3) — with no node
      added or removed.
    implemented_by: [F7, F9, F13, F23, F25, F26, F27, F28, F29]
    oracle:
      kind: command
      ref: npm run check:graph && npm run check:design-intent
    failure: >-
      A stale entry (e.g. OverviewDashboard left in panel.usedIn after it stops importing Panel) — the gates
      are exact-set, so a stale entry fails as hard as a missing one — or meta.usedIn drifting from the node.
  - id: AC9
    statement: >-
      Given the bento copy, when the widget renders against the real catalog, then every string resolves from
      the Overview namespace, the orphaned standalone Signals heading is gone, and the goal cell reads "vs the
      previous period" and never claims a target the data cannot back (no goals table exists); ICU/parity stay
      intact.
    implemented_by: [F9, F24, F30]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx::renders every bento string from the catalog with no orphaned signal heading and no target claim
    failure: >-
      A hard-coded string, an orphaned key, or copy promising a target the data cannot back. NOTE: check:i18n
      cannot prove any of these — with one locale its parity check is vacuous by its own header
      (scripts/check-i18n-parity.mjs:7) and it never reads src/ — so the widget test is the real oracle and
      check:i18n runs only as an ICU/parity backstop.
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "MUST NOT merge to dev before PR #39 (the precursor this stacks on); rebase onto dev once #39 lands"
  - "check:tokens + check:contrast green in both compositions; axe green over the new stories in both themes"
  - "check:graph + check:design-intent green after the coupled usedIn reconciliation INCLUDING the two removals"
  - "check:fsd + check:boundaries green (no widget→widget import — the HeroChart trap)"
  - "check:i18n parity (ICU backstop only — it cannot prove orphans); gen:tokens swap-only self-test unchanged"
  - "tsc / lint / format:check / build green; test:coverage >= 80% (incl. the browser-mode geometry play)"
  - "progress doc updated BEFORE the PR"
  - "Chromatic re-baseline CANNOT run (CHROMATIC_PROJECT_TOKEN unprovisioned, 👤) — state this in the PR rather than claiming the gate ran; the accepted visual proof is AC3 + the axe stories + human review"
  - "Conventional Commits; single human-reviewed PR into dev; no AI attribution"
gates:
  test: npm run test
```

## Data & Config

**N/A — no database or config change.** The one migration this feature needs (`fn_segment_scatter` + the
`fn_overview_signal.purchasers` column) and `gen:types` shipped in the precursor
(`overview-signal-and-scatter-rpcs`, PR #39); this branch is cut from that branch, so the migrations and the
regenerated `database.types.ts` are already present. This spec adds no migration, env var, feature flag, or
config key. **Demo data:** the bento needs `npm run seed:events` volume at the generator's default wall-clock
anchor (a pinned anchor makes every KPI look like a decline and flatlines the sparklines).

## Chosen Approach

One reviewable PR rebuilding the Overview UI to the frozen reference on top of the shipped precursor SQL:

1. **Zero new SQL** — the precursor already landed the only new function. `fn_event_trends`'s existing
   breakdown drives the hero and the stacked bars; `fn_overview_kpis` drives the hero headline, the mini
   metrics and the goal rows; the **retained** `fn_overview_signal` (now with `purchasers`) drives the minis'
   sparklines; `fn_funnel` drives the funnel; `fn_segment_scatter` drives the scatter.
2. **Reuse over new** — `KpiCard` becomes the reference's mini (metric + delta + sparkline, dropping
   MetricHero); `PacingCard` becomes the goal cell (radial + four **target-free** rows); `SignalChart` is
   **retained and gains two derived measures** (`conversion`/`arpu`) so the ratio minis get honest per-bucket
   sparklines. New only where the reference is genuinely new: `HeroChart`, `StackedBars`, `FunnelPreview`,
   `SegmentScatter`, plus a presentational `BentoGrid`.
3. **The geometry, made provable (F21/F22)** — extracting `BentoGrid` as a presentational shell is what lets
   the reference layout be asserted in browser-mode CSS (`getComputedStyle`), because the fetching
   `OverviewDashboard` cannot be storied and jsdom performs no layout. Without this the "hole is gone" claim
   would have **no** automated proof.
4. **The coupled reconciliation, both directions (F25–F29)** — two removals and five additions across four
   primitives, node + design-intent in lockstep. Exact-set gates: a stale entry is as fatal as a missing one.
5. **Gates + docs** — dark+light surface-decorator stories per cell, contrast both themes, i18n, progress
   entry.

**Stack compliance:** NATIVE — visx (incl. `BarStack`), TanStack Query, nuqs, the kit primitives, the shared
charts layer, and the shipped `fn_segment_scatter`/entity all exist. No new dependency, token, or ADR.
**Future alignment:** N/A — no VISION.md.

**Stack extensions required:** none.

## Why this over alternatives

- **Ship the SQL and the UI in one 38-file PR (rejected, 👤 — done differently).** The SQL/entity was carved
  out as the precursor (PR #39) so its RLS surface got a focused review; this leaves the UI as a coherent
  ~31-file slice that cannot itself be split (exact-set graph gates couple each component to its `usedIn`
  delta).
- **Geometry-only — keep the current content, just add spans (rejected, 👤).** Removes the hole but still
  misses the hero chart, sparkline minis, bars, funnel and scatter — not the "curated bento" ADR 0099
  mandates.
- **A goals/targets table so the cell can say "78% of Q3 target" (rejected, 👤).** Spec 003 deferred it to
  its own ADR and that stands. **Consequence, disclosed:** three of the reference's four kv rows
  (Booked/target, Forecast, Remaining) are target-derived and cannot be built — so the cell takes 👤-chosen
  **target-free** rows (revenue vs previous · pace · purchasers · ARPU) on the same existing scalars. A
  deviation in **content**, not only copy.
- **Delete `SignalChart` because "the reference has no sparkline row" (rejected — spec-critic catch).** The
  sparklines are **inside the minis** (`:1544-1569`); `SignalChart` is that sparkline and `fn_overview_signal`
  its data. Deleting them was a first-draft error from motivated reading.
- **Give the ratio minis no sparkline, or plot raw `purchasers`/`value_sum` as a proxy (rejected).** A
  decorative proxy would not match the mini's headline metric's trend. The derived-measure path plots the
  actual per-bucket conversion/arpu — honest, and it is presentation (a same-row ratio of two reduced
  scalars), not aggregation.
- **Import `TrendsChart` for the hero (rejected — an FSD violation).** Sibling widget; widget→widget breaks
  same-layer isolation (Steiger). Phase D's `SignalChart` set the mirror-don't-import precedent.
- **Promote a shared multi-series chart into `@/components/charts` and refactor trends-explorer onto it
  (rejected — scope).** Defensible long-term; it drags a shipped widget into this PR with its own graph
  story. Recorded as a Future Consideration.
- **Prove the geometry with the widget test in jsdom (rejected — it cannot).** jsdom performs no CSS layout
  (`vitest.config.mts:27-28`), so className assertions would be tautological and a "hole" invisible. Hence
  F21/F22 and the AC2/AC3 split.

## Test Plan

- **Harness:** Vitest (`npm run test` — the unit jsdom project **and** the Storybook browser project, which
  runs real CSS + the axe WCAG 2.2 AA gate, ADR 0039); coverage `npm run test:coverage` (≥80%). The
  in-database RPC proof already shipped in the precursor's `e2e/overview.spec.ts`; this spec adds no e2e.
- **Test locations:** colocated — the widget's `model/window.test.ts` / `model/kpis.test.ts` /
  `ui/OverviewDashboard.test.tsx`; stories `ui/*.stories.tsx` (incl. the browser-mode `BentoGrid.stories.tsx`).
- **Conventions:**
  - Widget behaviour: mirror the existing `OverviewDashboard.test.tsx` — `vi.mock` the entity fetchers (incl.
    `@/entities/segment`) + `@/lib/supabase/client`; REAL hooks under `QueryClientProvider` +
    `NextIntlClientProvider` + `NuqsTestingAdapter`; render against the real `messages/en.json`.
  - Stories: CSF3, light default + a `globals:{theme:'dark'}` Dark story each, wrapped in a
    `bg-surface-panel` surface decorator (the Phase-E rule — mission-control text on the shadcn
    `--background` is the reverse half-mix and fails axe); deterministic fixtures; presentational → no `play`
    **except** `BentoGrid` (whose `play` is the geometry oracle, running in the browser project).
  - Model tests: plain Vitest over the window builders and the KPI descriptor partition.

## Definition of Done

- [ ] `npm run test` green (incl. the browser-mode geometry play); `npm run test:coverage` ≥ 80%.
- [ ] `check:tokens` + `check:contrast` green in **both** compositions; axe green over the new stories in both themes.
- [ ] `check:graph` + `check:design-intent` green after the coupled reconciliation **including the two
      removals**; `check:fsd` + `check:boundaries` green.
- [ ] `check:i18n` green (ICU/parity backstop only); `gen:tokens` swap-only self-test unchanged.
- [ ] `tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run build` green.
- [ ] Progress doc updated — **before the PR**.
- [ ] **Chromatic cannot run** (token unprovisioned) — the PR says so plainly; the accepted visual proof is
      AC3 + the axe stories + human review. Do not write "pending Chromatic re-baseline".
- [ ] **Not merged before PR #39**; rebased onto `dev` after #39 lands.
- [ ] Single human-reviewed PR into `dev`; Conventional Commits; no AI attribution.

## Non-goals

- Any new SQL, migration, RPC, or database.types change — all shipped in the precursor (PR #39).
- A goals/targets table or any write path for a configurable target (deferred to its own ADR by spec 003) —
  hence the target-free goal rows.
- Promoting a shared multi-series chart into `@/components/charts` and refactoring `trends-explorer` onto it.
- Any new token, per-theme override, new kit primitive, or new ADR.
- Chart interactivity (tooltip/crosshair/brush) on the bento cells — they are static readouts; `role="img"` +
  summary keeps the single-announcement rule.
- Re-skinning anything outside `overview-dashboard`; changing the events-explorer/trends/funnel/retention/
  segment surfaces.
- Reconciling the two sources of `plan` (event properties vs profile traits) — recorded as an Assumption.

## Assumptions

- **Cell → data mapping** (from the seed's vocabulary): hero = `fn_event_trends(event='page_view',
interval='day', breakdown='plan', limit=3)`; bars = `fn_event_trends(event='sign_up', breakdown='plan',
interval range-aware)`; funnel = `fn_funnel(steps=['page_view','sign_up','feature_used'])` mapping the
  reference's "Visited → Signed up → Activated"; minis' sparklines = the retained `fn_overview_signal`
  (`new_signups` column; `conversion`/`arpu` derived). Seeded plans are `free | pro | enterprise` (3 series,
  matching the reference's 3-entry legend).
- **Two sources of `plan`, knowingly.** `fn_event_trends` breaks down by the **event's**
  `properties->>'plan'`, while the shipped `fn_segment_scatter` reads `profiles.traits->>'plan'`. They agree
  only because the seed stamps both (`seed-events.mjs:122,174`); real ingest (ADR 0085) carries no such
  guarantee. Acceptable for a seeded demo; reconciling them is a stated non-goal.
- **`fn_event_trends` counts events, not distinct users**, so the hero series is activity-by-plan while the
  headline is distinct active users (from `fn_overview_kpis`). The copy says "activity by plan" rather than
  implying the series sums to the headline.
- **The hero's headline value/delta** come from the already-fetched `fn_overview_kpis` scalars, not re-derived
  from the trend rows — keeping it two-scalar presentation (ADR 0087/0088), not an app-code reduction.
- **The derived sparkline measures** (`conversion` = purchasers/active_users, `arpu` = value_sum/active_users)
  are computed per bucket inside SignalChart from two columns of the SAME already-reduced row, each guarding a
  zero denominator to 0 — presentation, not a cross-row reduction.
- The bento's fr ratios are copied from the reference; the collapse is at the reference's ~1080px threshold
  but implemented as a CONTAINER query (not the reference's viewport `@media`) — a deliberate divergence so the
  geometry is deterministically provable at fixed-width wrappers (the storybook project has no viewport control).
  Asserted by AC3's Desktop + Mobile stories.

## Open Questions

none

## Security / NFR

- **Auth/RLS:** N/A here — the RLS-bearing function shipped and was reviewed CLEAN in the precursor; this spec
  adds no data-access surface, only presentational consumers of already-shipped fetchers.
- **PII:** the scatter renders `distinct_id` (a pseudonymous tracked-user key, ADR 0083) as anonymous points;
  no identifier is displayed.
- **a11y/i18n:** WCAG 2.2 AA via `check:contrast` + axe stories in both themes; charts are `role="img"` with a
  summary label and no live region (single-announcement); `--text-tertiary` is not used for text; all copy via
  next-intl.
- **Performance:** the cells consume already-reduced rows; no aggregation in app code; poll-based refresh.
- **Rollout:** presentation-only and reversible; no migration in this PR.

## Critic Verdict & Overrides

- **Round 1 (on the pre-split draft): BLOCK** — five blockers, all accepted and fixed in this revision:
  the `mono-data` self-contradiction (HeroChart imports Panel/MetricHero/StatusIndicator only; PacingCard is
  mono-data's new consumer); the exact-set **removals** (`panel` drops OverviewDashboard, `metric-hero` drops
  KpiCard) now explicit in F25–F29 and AC8; the un-provable geometry oracle split into AC2 (presence, jsdom) +
  AC3 (a browser-mode `BentoGrid` `getComputedStyle` assertion); AC9's `check:i18n` demoted to an ICU backstop
  with the widget test as the real oracle; and the confirmation-bias catch — the minis carry sparklines
  (`SignalChart` retained) and `b-goal` has a 4-row kv block (target-free rows). Warnings also addressed:
  "breaks down by trait" corrected to event `properties`; the `--text-tertiary` carve-out withdrawn; the
  MonoData size-role hazard removed; the bars interval made range-aware; `KPI_DESCRIPTORS` partitioned.
- **Round 2 (on the pre-split draft): BLOCK** — the conversion mini's sparkline needed a per-bucket
  `purchasers` that `fn_overview_signal` did not have, so "only the scatter needs new SQL" was false.
  **Resolved by splitting the SQL into the precursor** (`overview-signal-and-scatter-rpcs`, PR #39, which
  added the `purchasers` column) and, here, extending `SignalMeasure` with the two **derived** measures that
  column makes computable. F1–F6/F37 (the scatter RPC + entity + e2e) moved to the precursor; this spec is now
  UI-only and `depends_on` the precursor (enforced by the branch base).
- **Round 3 (on this split, UI-only spec): BLOCK → resolved.** One blocker + four warnings, all accepted;
  the critic independently confirmed the exact-set graph reconciliation is correct against the live nodes and
  that both prior BLOCKs are genuinely resolved (not papered over).
  - **Blocker — the geometry oracle was non-deterministic.** The reference collapses via a viewport
    `@media (max-width:1080px)`, but a fixed-width story wrapper can't fire a viewport query, and the headless
    storybook iframe runs at an unpinned width (no viewport addon) — so both the 3-track and the collapse
    assertions were uncontrolled. **Fixed:** BentoGrid's collapse is now a **container query** (F21), so a
    fixed-width wrapper deterministically drives both states (F22/AC3); the divergence from the reference's
    `@media` is disclosed.
  - **Warning — F9 didn't state PacingCard keeps MetricHero**, but F27's non-removal requires it → F9 now says
    it KEEPS MetricHero for the gauge-center %.
  - **Warning — F13's "NOT MonoData" was an exact-set trap** (the natural delta pattern, KpiCard.tsx:74, uses
    MonoData) → HeroChart now USES MonoData for the delta digits (ADR-0099-consistent), and F25/F28/AC8 add it
    to mono-data.usedIn (→7).
  - **Warning — F30's signal-label reconciliation was imprecise** → now explicit: keep `new_signups`, add
    `conversion`+`arpu`, REMOVE the orphaned `active_users`+`value_sum` (no gate catches an orphan).
  - **Warning — AC3's fr-ratio assertion needs `min-width:0` on grid items** (default `min-width:auto` would
    distort the resolved pixels) → F21 now sets `min-w-0 min-h-0` on every slot.
  - **Warning (minor, a11y) — the mini sparkline** is `aria-hidden` in the reference (the metric announces the
    value) → F11 makes the mini SignalChart `aria-hidden` (decorative), reference-faithful, sidestepping the
    single-announcement question; the informative bento charts keep role="img"+summary.
    **Override:** proceeding on these fixes (each the critic's own prescribed resolution, verified against the
    code) without a 4th critic round — AC3 is a real executable browser-mode oracle, so an incorrect geometry
    would fail the gate at implementation, which is the backstop.

## Design Notes

- **I mis-read the frozen reference in my own favour, twice** (the minis "are literally the current KpiCard";
  "the reference has no sparkline row"). Both omissions made a deletion story work. When a convenient reading
  and the source disagree, the source wins — re-read `console-build-reference.html` cell-by-cell.
- **The ratio-sparkline chain is why there are two PRs.** Retaining SignalChart (round-1) surfaced that its
  minis need series (round-2), which surfaced that `fn_overview_signal` had no `purchasers` — new SQL. That
  SQL is the precursor; this PR consumes it via the derived measures. Fixing one finding surfaced the next.
- **The FSD trap is the #1 implementation risk.** `HeroChart` looks like `TrendsChart`; importing
  `@/widgets/trends-explorer` is a Steiger violation. Mirror the structure; import only `@/components/charts`.
- **The coupled `usedIn` reconciliation is the #2 risk, and it has REMOVALS** — `panel` loses
  `OverviewDashboard`, `metric-hero` loses `KpiCard`. Exact-set gates: a stale entry is as fatal as a missing
  one.
- **Story surface decorators are mandatory** (the Phase-E lesson): mission-control text on the shadcn
  `--background` is the reverse half-mix and turns axe RED.
- **Grid track ratios are not tokens.** `1.55fr 0.95fr 1.1fr` are layout proportions; ADR 0058 governs
  colour/size literals in tokenizable properties and no token exists for grid tracks. `getComputedStyle`
  returns pixels — assert the RATIO, not the `fr` string.
- **Honest copy AND honest content on the goal cell.** No targets table, so the cell shows prior-period pacing
  with target-free rows and says "vs the previous period". The radial fill diverges from the reference's
  decorative `viz` gradient to semantic `status-nominal/caution` — a deliberate, disclosed deviation.
- **Chromatic cannot verify this work** — the token is unprovisioned and the job skips. The visual proof is
  AC3's browser-mode geometry assertions + the axe stories + human eyes on the running demo. Do not write
  "pending Chromatic re-baseline".

## Future Considerations

- Promote a shared multi-series area chart into `@/components/charts` and refactor `TrendsChart` +
  `HeroChart` onto it, killing the mirrored duplication this spec accepts.
- A goals/targets table (its own ADR) would let the goal cell state a real target and restore the reference's
  Booked/target · Forecast · Remaining rows.
- Reconcile the two sources of `plan` (event properties vs profile traits) so breakdowns survive real ingest.
- Chart interactivity (tooltip/crosshair) on the bento cells via the ADR 0093 layer.

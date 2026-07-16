---
slug: overview-bento-fidelity
type: feature
status: draft
created: 2026-07-15
tracker: docs/capcom/console-redesign-progress.md (post-initiative follow-up)
supersedes: none
stack: typescript, sql
risk: medium
breaking: false
spike_required: false
test_command: npm run test
---

# Overview bento fidelity — bring the console home up to the frozen design reference

## Goal

Rebuild the project Overview as the **six-cell asymmetric bento of the frozen design reference**
(`docs/capcom/design-reference/console-build-reference.html`, the design source of truth named by ADR
0099), replacing the flat uniform grid Phase D shipped. Five of six cells run on **existing** RPCs; only
the freq×LTV scatter needs new SQL. No new token, no new kit primitive, no new ADR.

## Context

- **The defect.** `src/widgets/overview-dashboard/ui/OverviewDashboard.tsx:96` is
  `grid gap-4 sm:grid-cols-2 lg:grid-cols-3` with **no `col-span`/`row-span`** → five cards render as row
  1 (three) + row 2 (two **and a visible hole**); the Signals row (`:127`) is the same flat grid. ADR 0099
  mandates a "first-class, curated **bento**" and names the build reference as the design source. Raised by
  the 👤 against the running demo.
- **The reference bento**, transcribed from the frozen file (immutable per its README):
  `.bento { display:grid; grid-template-columns: 1.55fr 0.95fr 1.1fr; grid-auto-rows: minmax(10px,auto);
gap: var(--sp4) }` (`:502`), collapsing to `1fr` at the mobile breakpoint (`:1092`). Six cells:
  - `b-hero` (col 1, `row 1/span 2`, `:509`) — eyebrow "Active users", `metric-hero` value, delta chip,
    a legend (one entry per plan), and a **multi-series area chart**.
  - `b-stack` (col 2, `row 1/span 2`, `:515`) — a **bare flex column** (`:1538`) of **three
    `<div class="panel mini">`** (`:1539/1573/1607`). **Each mini is eyebrow + metric + delta AND a
    sparkline `<svg viewBox="0 0 240 48">` with a gradient area + polyline** (`:1544-1569`). This is
    load-bearing and was mis-read in the first draft (see Design Notes).
  - `b-goal` (col 3, `row 1/span 2`, `:522`) — a `.phead` (eyebrow + a right-hand caption), a **radial**,
    a `.gauge-center`, **and a 4-row `.kv` block** (`:1645-1710`) — the reference's rows are
    Booked/target · Pace · Forecast · Remaining. The cell spans two rows, so it needs all of that to not
    be sparse.
  - `b-bars` (col 1, row 3, `:526`) — "Weekly sign-ups by plan", **stacked bars**.
  - `b-funnel` (col 2, row 3, `:530`) — "Activation funnel": an overall %, three labelled steps with
    proportional gradient fills, a step-over-step footnote.
  - `b-seg` (col 3, row 3, `:534`) — "Segments · freq × LTV", a **scatter**.
- **Existing RPCs cover five of six cells (verified against the live schema):**
  - `fn_event_trends(p_project_id, p_event_name, p_from, p_to, p_interval, p_breakdown_key,
p_breakdown_limit)` → `TABLE(bucket timestamptz, series text, count bigint)`
    (`20260625150535_create_event_trends.sql:35-49`). **Correction to the first draft:** it breaks down by
    the **event's** `e.properties->>p_breakdown_key` (`:76-79`), **not** `profiles.traits`. It works for
    `plan` only because `scripts/seed-events.mjs` stamps `plan` onto both event properties (`:122`) and
    profile traits (`:174`) — a **seed** guarantee, not an ingest guarantee (ADR 0085). Recorded as an
    Assumption, not glossed. With `p_breakdown_limit=3` against exactly 3 seeded plans the top-N+`Other`
    folding (`:88-100`) yields no `Other` series, matching the reference's 3-entry legend.
  - `fn_overview_kpis` returns all eight scalars incl. every `_prev`
    (`20260714120000_create_overview_kpis.sql:39-49`) → the hero value/delta, the mini metrics/deltas, and
    the goal cell's rows.
  - `fn_overview_signal(p_project_id, p_from, p_to, p_interval)` → per-bucket `active_users` /
    `new_signups` / `value_sum` — **the minis' sparkline data. It is NOT dead** (the first draft wrongly
    deleted its consumer).
  - `fn_funnel(p_project_id, p_steps text[], p_from, p_to, p_window)` → `(step_index, step_event, users)`
    (`20260626103244_create_funnel.sql:42-49`) → `b-funnel`.
  - **Only `b-seg` lacks an RPC** — `fn_segment_distribution` is a 1-dimension distribution, not a 2-D
    per-user scatter.
- **Component mapping (reuse over new).** `KpiCard` becomes the reference's `.panel.mini` (eyebrow +
  metric + delta + a **`SignalChart` sparkline**), dropping `MetricHero` for a denser metric; `PacingCard`
  becomes the goal cell (radial + the kv block); `SignalChart` **survives** as the mini's sparkline; only
  genuinely-new visuals become components (`HeroChart`, `StackedBars`, `FunnelPreview`, `SegmentScatter`,
  and a presentational `BentoGrid` layout shell). All are widget-internal `ui/` segments, **not** kit
  primitives (the Phase-D precedent) — no graph **node** is added or removed.
- **Exact current graph state (verified — these gates are exact-set):** `panel.usedIn` = 11 files (overview
  consumers: `KpiCard`, `OverviewDashboard`, `PacingCard`); `metric-hero` = 2 (`KpiCard`, `PacingCard`);
  `mono-data` = 5 (`KpiCard`); `status-indicator` = 2 (`KpiCard`). `check-composition-graph.mjs:109-118`
  compares as a **set** (a stale entry fails as hard as a missing one) and
  `check-design-intent.mjs:244` requires `sortedEq(meta.usedIn, node.usedIn)`. **`OverviewDashboard` must be
  REMOVED from `panel.usedIn`** — it imports `Panel` (`:6`) only to wrap the SignalCharts (`:129`), and after
  F29 every cell owns its own Panel.
- **FSD constraint (load-bearing).** `b-hero`'s chart resembles
  `src/widgets/trends-explorer/ui/TrendsChart.tsx`, but **a widget may not import another widget**
  (ADR 0065/0066, Steiger). Phase D's `SignalChart` set the mirror-don't-import precedent (its docstring
  says so). `@/components/charts` is outside FSD and **is** importable from widgets.
- Sibling specs: `.marvin/task/003-console-phase-d-overview-dashboard.md` and
  `.marvin/task/004-console-phase-e-analytics-reskin.md` — both shipped; not build dependencies.
- Constraints: mission-control tokens only (ADR 0099); no aggregation in app code (ADR 0084) — ratios over
  already-reduced scalars stay presentation (ADR 0087/0088); small text uses `--text-secondary`, **never**
  `--text-tertiary` (`mono-data.tsx:12-14` states it is not AA-guaranteed) — the first draft's "decorative
  marks" carve-out for the scatter axes is **withdrawn**.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: supabase/migrations/20260716120000_create_segment_scatter.sql
    action: new
    intent: >-
      One SECURITY INVOKER aggregation RPC (ADR 0084) mirroring the shipped fn_overview_kpis /
      fn_segment_distribution idiom exactly (language sql, stable, security invoker, set search_path='',
      schema-qualified public.*, revoke execute from public/anon + grant execute to authenticated; no new
      table/policy). public.fn_segment_scatter(p_project_id uuid, p_from timestamptz, p_to timestamptz,
      p_limit integer default 300) returns table(distinct_id text, frequency bigint, ltv numeric, plan
      text): per tracked user inside [p_from,p_to) — frequency = count of that user's events, ltv = sum of
      numeric properties->>'amount' over their 'purchase' events (jsonb_typeof gate as in
      fn_events_summary; 0 when none), plan = profiles.traits->>'plan' (null-safe). Ordered by ltv desc,
      capped at p_limit in SQL so the point set is bounded. Isolation inherited from the ADR 0083
      membership join; the profiles join is safe under SECURITY INVOKER via the "Members read profiles in
      their projects" policy.
    satisfies: [AC1, AC8]
  - id: F2
    path: src/lib/supabase/database.types.ts
    action: edit
    intent: Regenerated by `npm run gen:types` after F1 (never hand-edited); adds fn_segment_scatter Args + Returns. Committed for the CI drift gate (ADR 0015).
    satisfies: ["—"]
    anchor: src/lib/supabase/database.types.ts:1
  - id: F3
    path: src/entities/segment/model/types.ts
    action: edit
    intent: Add SegmentScatterPoint / SegmentScatterArgs derived from the generated Functions["fn_segment_scatter"]["Returns"][number] | ["Args"] (ADR 0015, never hand-written).
    satisfies: [AC2]
  - id: F4
    path: src/entities/segment/api/queries.ts
    action: edit
    intent: Add fetchSegmentScatter(supabase, args) — calls supabase.rpc('fn_segment_scatter', args) forwarding the typed bag verbatim, returns data ?? [], throws on error, no client-side reduction (ADR 0084).
    satisfies: [AC2]
  - id: F5
    path: src/entities/segment/api/queries.test.ts
    action: edit
    intent: Add a describe block for fetchSegmentScatter using the existing rpcReturning mock — exact RPC name + arg bag, rows on success, [] on null, throw-on-error.
    satisfies: [AC2]
  - id: F6
    path: src/entities/segment/index.ts
    action: edit
    intent: Re-export fetchSegmentScatter + the two new types from the segment entity's public API (ADR 0066).
    satisfies: [AC2]
  - id: F7
    path: src/lib/query/keys.ts
    action: edit
    intent: >-
      Extend the `overview` key factory with hero(args) / bars(args) / funnel(args) / scatter(args), each
      keyed by the exact RPC arg bag. **Retain** overview.signal — SignalChart survives as the minis'
      sparkline, so the key is not orphaned.
    satisfies: [AC3]
    anchor: src/lib/query/keys.ts:28
  - id: F8
    path: src/widgets/overview-dashboard/api/use-overview.ts
    action: edit
    intent: >-
      Add useOverviewHero(args) + useOverviewBars(args) wrapping the EXISTING fetchEventTrends (no new
      SQL), useActivationFunnel(args) wrapping the existing funnel fetcher, and useSegmentScatter(args)
      wrapping F4 — all keyed by F7. **Retain useOverviewSignal** (the minis' sparkline data). No "use
      client" here (ADR 0002); the hooks own no aggregation.
    satisfies: [AC3]
  - id: F9
    path: src/widgets/overview-dashboard/model/window.ts
    action: edit
    intent: >-
      Add arg builders, all derived from the SAME nuqs `range` so one control drives the whole bento:
      toHeroArgs (event='page_view', interval='day', breakdown='plan', breakdown_limit=3); toBarsArgs
      (event='sign_up', breakdown='plan', interval **range-aware** — 'day' at 7d, 'week' at 30d/90d, so a
      7d range does not render 1-2 bars; mirrors the shipped signalInterval posture at :42-44); toFunnelArgs
      (steps ['page_view','sign_up','feature_used'], window = the range span); toScatterArgs. **Retain**
      signalInterval/toSignalArgs (the minis' sparklines). Keep the UTC-day-floored window so query keys stay
      stable within a day.
    satisfies: [AC3, AC7]
  - id: F10
    path: src/widgets/overview-dashboard/model/window.test.ts
    action: edit
    intent: >-
      Extend the unit tests: each new builder emits its exact typed bag (p_breakdown_key='plan', the
      range-aware bars interval incl. the 7d='day' case, the funnel steps + window, the scatter bag) and all
      builders derive from the one shared range window. Signal-arg tests retained.
    satisfies: [AC7]
  - id: F11
    path: src/widgets/overview-dashboard/model/kpis.ts
    action: edit
    intent: >-
      Partition KPI_DESCRIPTORS (:24-29) explicitly: export HERO_KPI ('activeUsers' — the hero's headline)
      and STACK_KPIS (the other three: newSignups, conversion, arpu — the reference's three minis), so F29
      slices a named export rather than indexing the array. Add the goal cell's target-free row descriptors
      (revenue current/prev, pace, purchasers, arpu) as a GOAL_ROWS registry. deriveKpis/formatters unchanged
      — still pure presentation over already-reduced scalars (ADR 0087/0088).
    satisfies: [AC3, AC4]
  - id: F12
    path: src/widgets/overview-dashboard/model/kpis.test.ts
    action: edit
    intent: >-
      Extend the unit tests — HERO_KPI + STACK_KPIS partition the descriptor set with no overlap or
      omission; GOAL_ROWS derive from already-reduced scalars with divide-by-zero guarded to null.
    satisfies: [AC4]
  - id: F13
    path: src/widgets/overview-dashboard/ui/KpiCard.tsx
    action: edit
    intent: >-
      Becomes the reference's `.panel.mini` (console-build-reference.html:1539-1569): Panel + eyebrow +
      the metric (MonoData at its existing tone axis — no new kit variant) + the delta (StatusIndicator) +
      a **SignalChart sparkline** fed the matching fn_overview_signal measure. **Drops the MetricHero
      import** (the mini's metric is denser than the metric-hero role) → metric-hero.usedIn loses this file
      (F31/F33). Keeps Panel/MonoData/StatusIndicator. Presentational; owns no fetching.
    satisfies: [AC4, AC6, AC10]
  - id: F14
    path: src/widgets/overview-dashboard/ui/KpiCard.stories.tsx
    action: edit
    intent: Update stories for the mini form incl. the sparkline (WithData / NoDelta / Loading / Empty / Error, light + Dark) on the bg-surface-panel decorator. Deterministic fixtures.
    satisfies: [AC6]
  - id: F15
    path: src/widgets/overview-dashboard/ui/PacingCard.tsx
    action: edit
    intent: >-
      Becomes the goal cell (b-goal, :1645-1710): Panel + a phead (eyebrow + caption) + the reference's
      **radial** gauge (an SVG arc swept by the EXISTING pacingRatio — value_sum/value_sum_prev, no new
      data), a gauge-center %, **and the 4-row kv block** filled with 👤-chosen **target-free** rows from
      F11's GOAL_ROWS (revenue this period vs previous · pace · purchasers · ARPU) via MonoData — so the
      2-row span is dense, not sparse. **Gains the MonoData import** (F31/F34). Track on
      --color-surface-elevated; the fill diverges from the reference's decorative viz gradient to
      --color-status-nominal-fg / -caution-fg by threshold (a semantic-over-decorative deviation, disclosed).
      Copy is honest: "vs the previous period", never "Q3 target" (no goals table exists). role="img" +
      summary aria-label.
    satisfies: [AC4, AC6, AC10, AC11]
  - id: F16
    path: src/widgets/overview-dashboard/ui/PacingCard.stories.tsx
    action: edit
    intent: Update stories for the radial + kv rows (AheadOfPace / BehindPace / Loading / Empty / Error, light + Dark) on the surface decorator.
    satisfies: [AC6]
  - id: F17
    path: src/widgets/overview-dashboard/ui/SignalChart.tsx
    action: edit
    intent: >-
      **Retained** (the first draft wrongly deleted it) — it is the reference mini's sparkline. Adapt to the
      mini: the reference's 240×48 viewBox proportion, gradient area + line, no axes. Stays presentational,
      non-interactive (role="img" + summary label, no live region — the single-announcement rule), imports
      only @/components/charts. No kit primitive → no graph node.
    satisfies: [AC4, AC6]
  - id: F18
    path: src/widgets/overview-dashboard/ui/SignalChart.stories.tsx
    action: edit
    intent: Retained; update fixtures/viewBox for the mini sparkline form (WithData / Loading / Empty / Error, light + Dark) on the surface decorator.
    satisfies: [AC6]
  - id: F19
    path: src/widgets/overview-dashboard/ui/HeroChart.tsx
    action: new
    intent: >-
      The b-hero cell: Panel + eyebrow + the MetricHero active-users value + a delta chip (StatusIndicator)
      + the shared ChartLegend (one entry per plan) + a presentational visx multi-series **area** chart over
      fetchEventTrends rows. MIRRORS TrendsChart's STRUCTURE (fixed viewBox, aspect-ratio box, AreaGradient
      per series, MotionIn, a Message state box) but does NOT import it — widget↛widget is an FSD violation;
      @/components/charts is importable. Imports Panel + MetricHero + StatusIndicator (**not** MonoData) →
      F31/F32/F33/F35. Series colours var(--color-viz-*); chrome on mission-control tokens. Receives reduced
      rows + the derived value/delta as props; owns no fetching/aggregation.
    satisfies: [AC4, AC6, AC9, AC10]
  - id: F20
    path: src/widgets/overview-dashboard/ui/HeroChart.stories.tsx
    action: new
    intent: CSF3 stories on a bg-surface-panel decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures. Presentational → no play.
    satisfies: [AC6]
  - id: F21
    path: src/widgets/overview-dashboard/ui/StackedBars.tsx
    action: new
    intent: >-
      The b-bars cell: Panel + eyebrow + a presentational visx **stacked** bar chart (@visx/shape BarStack)
      over the same fetchEventTrends shape (buckets × plan series), token'd colour scale
      (var(--color-viz-*)), fixed viewBox, MotionIn, a Message state box, role="img" + summary label (no
      per-datum labels and no live region). Imports Panel. Presentational.
    satisfies: [AC4, AC6, AC9, AC10]
  - id: F22
    path: src/widgets/overview-dashboard/ui/StackedBars.stories.tsx
    action: new
    intent: CSF3 stories on the surface decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures.
    satisfies: [AC6]
  - id: F23
    path: src/widgets/overview-dashboard/ui/FunnelPreview.tsx
    action: new
    intent: >-
      The b-funnel cell: Panel + eyebrow + the overall conversion % + three labelled steps with proportional
      gradient fills + the step-over-step footnote, fed already-reduced fn_funnel rows. Step %s are a ratio of
      two returned counts = presentation (ADR 0087). Gradients between var(--color-viz-*) tokens; widths are
      computed styles, not raw literals (the GroupRollup precedent). Message state box. Imports Panel.
    satisfies: [AC4, AC6, AC9, AC10]
  - id: F24
    path: src/widgets/overview-dashboard/ui/FunnelPreview.stories.tsx
    action: new
    intent: CSF3 stories on the surface decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures.
    satisfies: [AC6]
  - id: F25
    path: src/widgets/overview-dashboard/ui/SegmentScatter.tsx
    action: new
    intent: >-
      The b-seg cell: Panel + eyebrow + a presentational visx **scatter** of F1's rows (x = frequency,
      y = ltv), points coloured per plan from var(--color-viz-*), **axis captions on --color-text-secondary**
      (the first draft's --text-tertiary carve-out is withdrawn — the repo states tertiary is not
      AA-guaranteed and neither check:contrast nor axe can measure SVG text), fixed viewBox, MotionIn, a
      Message state box, role="img" + summary label. Imports Panel. Presentational.
    satisfies: [AC4, AC6, AC9, AC10]
  - id: F26
    path: src/widgets/overview-dashboard/ui/SegmentScatter.stories.tsx
    action: new
    intent: CSF3 stories on the surface decorator — WithData / Loading / Empty / Error / Dark. Deterministic fixtures.
    satisfies: [AC6]
  - id: F27
    path: src/widgets/overview-dashboard/ui/BentoGrid.tsx
    action: new
    intent: >-
      A **presentational layout shell** carrying the reference geometry and nothing else: a grid of
      `1.55fr 0.95fr 1.1fr` with named slots (hero/stack/goal spanning rows 1-2; bars/funnel/seg on row 3)
      and the single-column mobile collapse. Exists so the geometry is STORYABLE and therefore provable in
      browser mode (the fetching OverviewDashboard cannot be storied — the Phase-D precedent). Takes the six
      cells as ReactNode props; imports no kit primitive (a layout div) → no graph node. Grid track ratios
      are layout proportions, not tokenizable colour/size — arbitrary-value utilities are correct here
      (ADR 0058 unaffected).
    satisfies: [AC5, AC9]
  - id: F28
    path: src/widgets/overview-dashboard/ui/BentoGrid.stories.tsx
    action: new
    intent: >-
      The **geometry proof** (AC5) — the one oracle that can actually see the defect. CSF3 stories with a
      `play` running in the Storybook **browser** project (real CSS, unlike jsdom): assert
      getComputedStyle(grid).gridTemplateColumns resolves **three** non-zero tracks in the reference ratio,
      that each of the six slots reports its expected gridColumn/gridRow (hero/stack/goal spanning two rows),
      and that **no grid cell is empty**. Plus a Mobile story at the narrow viewport asserting the single-column
      collapse, and a Dark story.
    satisfies: [AC5, AC6]
  - id: F29
    path: src/widgets/overview-dashboard/ui/OverviewDashboard.tsx
    action: edit
    intent: >-
      Replace the two flat uniform grids with <BentoGrid> (F27), passing HeroChart / the three mini KpiCards
      (b-stack is a bare flex column, per the reference) / PacingCard / StackedBars / FunnelPreview /
      SegmentScatter. Drives every cell from the ONE nuqs `range`; calls the new hooks + the retained
      useOverviewSignal; slices F11's HERO_KPI / STACK_KPIS / GOAL_ROWS; threads isPending/isError/empty into
      the presentational children; drops the Signals section (its sparklines now live inside the minis).
      **Stops importing Panel** (every cell owns its own) → panel.usedIn REMOVES this file (F31/F32). All copy
      via useTranslations('Overview').
    satisfies: [AC3, AC4, AC10]
    anchor: src/widgets/overview-dashboard/ui/OverviewDashboard.tsx:96
  - id: F30
    path: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx
    action: edit
    intent: >-
      Update the behaviour test (existing idiom: vi.mock the entity fetchers + the supabase client; real hooks
      under QueryClientProvider + NextIntlClientProvider + NuqsTestingAdapter). Assert: every hook is called
      with its derived arg bag (incl. p_breakdown_key='plan' and the funnel steps); the six cells render from
      the mocked reduced rows with no client re-aggregation; loading/error/empty thread through; the standalone
      Signals section is GONE (queryByText of its heading is null — a genuine orphan-copy proof, since
      check:i18n cannot detect orphans); the goal cell renders the target-free rows and no "target" copy.
    satisfies: [AC3, AC4, AC11]
  - id: F31
    path: src/design-system/composition-graph.json
    action: edit
    intent: >-
      Coupled reconciliation — the gates are EXACT-SET, so removals matter as much as additions.
      panel.usedIn: **REMOVE** src/widgets/overview-dashboard/ui/OverviewDashboard.tsx (F29 stops importing
      Panel); **ADD** HeroChart, StackedBars, FunnelPreview, SegmentScatter. metric-hero.usedIn: **REMOVE**
      KpiCard.tsx (F13 drops MetricHero); **ADD** HeroChart. mono-data.usedIn: **ADD** PacingCard.tsx (F15
      gains MonoData). status-indicator.usedIn: **ADD** HeroChart. No node added or removed (SignalChart /
      BentoGrid import no kit primitive; nodes are src/components/ui only).
    satisfies: [AC10]
  - id: F32
    path: src/components/ui/panel.design-intent.ts
    action: edit
    intent: Mirror F31's panel deltas in meta.usedIn (−OverviewDashboard, +HeroChart/StackedBars/FunnelPreview/SegmentScatter), in lockstep — check:design-intent requires exact equality with the node.
    satisfies: [AC10]
  - id: F33
    path: src/components/ui/metric-hero.design-intent.ts
    action: edit
    intent: Mirror F31's metric-hero deltas in meta.usedIn (−KpiCard, +HeroChart), in lockstep.
    satisfies: [AC10]
  - id: F34
    path: src/components/ui/mono-data.design-intent.ts
    action: edit
    intent: Mirror F31's mono-data delta in meta.usedIn (+PacingCard), in lockstep.
    satisfies: [AC10]
  - id: F35
    path: src/components/ui/status-indicator.design-intent.ts
    action: edit
    intent: Mirror F31's status-indicator delta in meta.usedIn (+HeroChart), in lockstep.
    satisfies: [AC10]
  - id: F36
    path: messages/en.json
    action: edit
    intent: >-
      Extend the `Overview` namespace with the bento copy (hero eyebrow + chart label; the three mini labels;
      the goal eyebrow + caption + the four target-free row labels + "vs the previous period"; the bars
      eyebrow + chart label; the funnel eyebrow + step labels + overall/step-over-step captions; the scatter
      eyebrow + axis captions + chart label; per-cell loading/empty/error). Remove the standalone
      signalHeading (the sparklines moved into the minis) but KEEP the per-measure signal labels. Authored via
      the add-translation discipline (ICU intact; one catalog, ADR 0030/0055).
    satisfies: [AC11]
    anchor: messages/en.json:1
  - id: F37
    path: e2e/overview.spec.ts
    action: edit
    intent: >-
      Extend the existing SQL-fixture spec (the ADR-0084 RPC-math proof idiom, :17-20/:90-186) with
      fn_segment_scatter: as a seeded member, assert tenant-scoped invariants over the seed — every frequency
      >= 1, every ltv >= 0, at most p_limit rows, plan in the seeded set or null — and ADR 0083 isolation: a
      non-member (carol@capcom.dev vs the Aurora project) gets **zero rows** (a set-returning function has no
      zero-fill spine) with NO error, while seeing rows for her own tenant. Requires db:reset + a pinned
      SEED_EVENTS_ANCHOR (documented in the header, like funnels.spec.ts); runs locally via npm run test:e2e
      (bootstrap-deferred from CI).
    satisfies: [AC8]
  - id: F38
    path: docs/capcom/console-redesign-progress.md
    action: edit
    intent: >-
      Add a dated follow-up entry: the Phase-D gap (uniform grid + hole vs the frozen reference), the 👤
      decisions (radial on existing prior-period pacing with target-free kv rows — no goals table; a new
      scatter RPC), the spec-critic's catch that the reference minis carry sparklines (so SignalChart is
      retained, not deleted), what landed, and the gate results — including that **Chromatic could not run**
      (token unprovisioned). The Phase 0–E status table is unchanged; this is a post-initiative fidelity
      follow-up.
    satisfies: ["—"]
build_order:
  [
    F1,
    F2,
    F3,
    F4,
    F5,
    F6,
    F7,
    F9,
    F10,
    F11,
    F12,
    F8,
    F17,
    F18,
    F13,
    F14,
    F15,
    F16,
    F19,
    F20,
    F21,
    F22,
    F23,
    F24,
    F25,
    F26,
    F27,
    F28,
    F31,
    F32,
    F33,
    F34,
    F35,
    F29,
    F30,
    F36,
    F37,
    F38,
  ]
depends_on: [overview-signal-and-scatter-rpcs]
contract:
  kind: function
  signature: |
    -- new SECURITY INVOKER RPC (ADR 0084), invoked as supabase.rpc(...)
    public.fn_segment_scatter(p_project_id uuid, p_from timestamptz, p_to timestamptz,
                              p_limit integer default 300)
      returns table(distinct_id text, frequency bigint, ltv numeric, plan text)
    // entity fetcher (forwards the arg bag; no client reduction)
    fetchSegmentScatter(supabase, args: SegmentScatterArgs): Promise<SegmentScatterPoint[]>  // throws on rpc error
    // presentational layout shell (the geometry proof surface)
    BentoGrid(props: { hero, stack, goal, bars, funnel, seg }: Record<string, React.ReactNode>): JSX.Element
criteria:
  - id: AC1
    statement: >-
      Given a signed-in member and a non-member, when each calls fn_segment_scatter, then it runs SECURITY
      INVOKER with search_path='' and authenticated-only EXECUTE, so the member gets per-user points and the
      non-member gets no rows under the ADR 0083 membership-join RLS — no privilege-escalating path, no new
      table or policy.
    implemented_by: [F1]
    oracle:
      kind: prose-review
    failure: SECURITY DEFINER, an unpinned search_path, EXECUTE granted to anon/public, or a reduction depending on a client-supplied tenant id.
  - id: AC2
    statement: >-
      Given the new RPC, when fetchSegmentScatter is called, then it invokes supabase.rpc with the exact
      function name and typed argument bag, returns rows (or [] on null), and throws on error — performing no
      client-side reduction.
    implemented_by: [F3, F4, F5, F6]
    oracle:
      kind: test
      ref: src/entities/segment/api/queries.test.ts::fetchSegmentScatter calls the fn_segment_scatter RPC with the exact name and argument bag
    failure: A wrong fn name, a dropped/renamed arg, a client-side reduce, or a swallowed error.
  - id: AC3
    statement: >-
      Given the bento, when OverviewDashboard mounts, then every cell is driven from the ONE nuqs `range` via
      queryKeys.overview.*(args) — hero and bars through the EXISTING fn_event_trends with
      p_breakdown_key='plan' (no new SQL), the minis' sparklines through the retained fn_overview_signal, the
      funnel through fn_funnel, the scatter through the new RPC — and the presentational children receive
      reduced rows as props (no fetching or key literals in children).
    implemented_by: [F7, F8, F9, F11, F29, F30]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx::drives every bento cell from the shared range with the derived arg bags
    failure: Inline key literals, a child that fetches, a cell on its own range, or a hook called with the wrong arg bag.
  - id: AC4
    statement: >-
      Given the Overview route, when it renders, then all six reference cells are PRESENT and fed reduced
      rows — hero (value + delta + legend + area chart), three minis each with metric + delta + sparkline,
      the goal cell with the radial and its four target-free rows, stacked bars, the activation funnel, and
      the scatter — and the standalone Signals section is gone.
    implemented_by: [F11, F12, F13, F15, F17, F19, F21, F23, F25, F29, F30]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx::renders the six reference bento cells and no standalone signal row
    failure: A missing cell, a mini without its sparkline, a goal cell without its rows, or a surviving Signals section.
  - id: AC5
    statement: >-
      Given the bento layout, when the BentoGrid stories run in the Storybook BROWSER project (real CSS),
      then getComputedStyle reports three non-zero grid tracks in the reference ratio, each of the six slots
      occupies its expected gridColumn/gridRow (hero/stack/goal spanning rows 1-2; bars/funnel/seg on row 3),
      **no grid cell is empty**, and the narrow-viewport story collapses to a single column.
    implemented_by: [F27, F28]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/BentoGrid.stories.tsx::resolves three grid tracks with every slot placed and no empty cell
    failure: >-
      The hole this spec exists to remove survives, a track collapses, or the mobile breakpoint does not
      single-column — none of which jsdom can see (it performs no CSS layout), which is precisely why the
      geometry is proven in browser mode rather than by the widget test.
  - id: AC6
    statement: >-
      Given the new/changed cell components with their dark and light surface-decorator stories, when the
      token and contrast gates and the Storybook axe run execute, then they use only allowlisted
      mission-control tokens (no shadcn value layer, no raw colour/size literals, no --text-tertiary for
      text) and clear WCAG 2.2 AA in BOTH compositions.
    implemented_by:
      [
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
        F23,
        F24,
        F25,
        F26,
        F28,
      ]
    oracle:
      kind: command
      ref: npm run check:tokens && npm run check:contrast && npm run test
    failure: A shadcn foreground on a --surface bg failing AA (caught by the axe story under `npm run test`, not by check:tokens/check:contrast), or a raw literal flagged by check:tokens.
  - id: AC7
    statement: >-
      Given a selected range, when the arg builders run, then each emits its exact typed bag
      (p_breakdown_key='plan'; hero interval 'day'; bars interval range-aware — 'day' at 7d, 'week' at
      30d/90d; the funnel step array and window; the scatter bag), all derived from the one UTC-day-floored
      window so query keys stay stable within a day.
    implemented_by: [F9, F10]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/model/window.test.ts::derives every bento arg bag from the one shared range window
    failure: A cell on a divergent window, a missing breakdown key, a 7d range rendering 1-2 stacked bars, or an un-floored `to`.
  - id: AC8
    statement: >-
      Given the seeded local database, when a member calls fn_segment_scatter over a pinned window, then the
      reduction holds its invariants (frequency >= 1, ltv >= 0, at most p_limit rows, plan in the seeded set
      or null), and a non-member gets zero rows with NO error while seeing rows for their own tenant —
      proving the reduction and the ADR 0083 isolation at runtime.
    implemented_by: [F1, F37]
    oracle:
      kind: test
      ref: e2e/overview.spec.ts::fn_segment_scatter reductions and cross-tenant isolation
    failure: A wrong reduction, an unbounded result, or a non-member seeing another tenant's users (or an error instead of no rows).
  - id: AC9
    statement: >-
      Given the widget, when the boundary gates run, then it imports only downward (entities, components/ui,
      components/charts, shared, lib) and imports NO other widget — in particular HeroChart mirrors
      TrendsChart's structure without importing `@/widgets/trends-explorer` — and no new kit primitive is added.
    implemented_by: [F19, F21, F23, F25, F27, F29]
    oracle:
      kind: command
      ref: npm run check:fsd && npm run check:boundaries
    failure: A widget→widget import (the FSD trap), an upward import, or a new primitive added without registration.
  - id: AC10
    statement: >-
      Given the changed imports, when the design-system gates run, then every primitive's node usedIn and its
      design-intent meta.usedIn agree EXACTLY and in lockstep — panel loses OverviewDashboard and gains the
      four new cells; metric-hero loses KpiCard and gains HeroChart; mono-data gains PacingCard;
      status-indicator gains HeroChart — with no node added or removed.
    implemented_by: [F13, F15, F19, F29, F31, F32, F33, F34, F35]
    oracle:
      kind: command
      ref: npm run check:graph && npm run check:design-intent
    failure: >-
      A stale entry (e.g. OverviewDashboard left in panel.usedIn after it stops importing Panel) — the gates
      are exact-set, so a stale entry fails as hard as a missing one — or meta.usedIn drifting from the node.
  - id: AC11
    statement: >-
      Given the bento copy, when the widget renders against the real catalog, then every string resolves from
      the Overview namespace, the orphaned standalone Signals heading is gone, and the goal cell reads "vs the
      previous period" and never claims a target the data cannot back (no goals table exists); ICU/parity stay
      intact.
    implemented_by: [F15, F30, F36]
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
  - "gen:types regenerated + committed (database.types.ts drift gate green)"
  - "check:tokens + check:contrast green in both compositions; axe green over the new stories in both themes"
  - "check:graph + check:design-intent green after the coupled usedIn reconciliation INCLUDING the two removals"
  - "check:fsd + check:boundaries green (no widget→widget import — the HeroChart trap)"
  - "check:i18n parity (ICU backstop only — it cannot prove orphans); gen:tokens swap-only self-test unchanged"
  - "supabase-rls-reviewer clean on the migration (SECURITY INVOKER / search_path / GRANTs)"
  - "e2e/overview.spec.ts green locally (npm run test:e2e after db:reset + a pinned SEED_EVENTS_ANCHOR)"
  - "tsc / lint / format:check / build green; test:coverage >= 80%"
  - "progress doc updated BEFORE the PR"
  - "Chromatic re-baseline CANNOT run (CHROMATIC_PROJECT_TOKEN unprovisioned, 👤) — state this in the PR rather than claiming the gate ran; the accepted visual proof is AC5 + the axe stories + human review"
  - "Conventional Commits; single human-reviewed PR into dev; no AI attribution"
gates:
  test: npm run test
```

## Data & Config

- **Migration (forward):** `supabase/migrations/20260716120000_create_segment_scatter.sql` adds one
  `SECURITY INVOKER` function + least-privilege GRANTs. **No new table, policy, index, or column.**
- **Rollback:** `drop function if exists public.fn_segment_scatter(uuid, timestamptz, timestamptz, integer);`
  — functions only. Local: `npm run db:reset`.
- **Codegen:** `npm run gen:types` after the migration (CI drift gate). No env vars, flags, or config keys.
- **Demo data:** the bento needs `npm run seed:events` volume; the generator's **default wall-clock anchor**
  keeps data in the trailing 90 days. A **pinned** `SEED_EVENTS_ANCHOR` makes every KPI look like a decline
  and flatlines the sparklines — the e2e run (F37) pins it deliberately; the demo must not.

## Chosen Approach

One reviewable PR rebuilding the Overview to the frozen reference, reusing everything that exists:

1. **One new RPC (F1)** — `fn_segment_scatter`, the only cell without SQL, mirroring the shipped SECURITY
   INVOKER idiom; typed by `gen:types`; an entity fetcher + mock-rpc unit test.
2. **Zero new SQL for the other five cells** — `fn_event_trends`'s existing breakdown drives the hero and
   the stacked bars; `fn_overview_kpis` drives the hero headline, the mini metrics and the goal rows;
   the **retained** `fn_overview_signal` drives the minis' sparklines; `fn_funnel` drives the funnel.
3. **Reuse over new** — `KpiCard` becomes the reference's mini (metric + delta + sparkline, dropping
   MetricHero); `PacingCard` becomes the goal cell (radial + four **target-free** rows); `SignalChart` is
   **retained** as the sparkline. New only where the reference is genuinely new: `HeroChart`, `StackedBars`,
   `FunnelPreview`, `SegmentScatter`, plus a presentational `BentoGrid`.
4. **The geometry, made provable (F27/F28)** — extracting `BentoGrid` as a presentational shell is what lets
   the reference layout be asserted in browser-mode CSS (`getComputedStyle`), because the fetching
   `OverviewDashboard` cannot be storied and jsdom performs no layout. Without this the "hole is gone" claim
   would have **no** automated proof.
5. **The coupled reconciliation, both directions (F31–F35)** — two removals and five additions across four
   primitives, node + design-intent in lockstep.
6. **Gates + docs** — dark+light surface-decorator stories per cell, contrast both themes, i18n, the e2e RPC
   proof, progress entry.

**Stack compliance:** NATIVE — visx (incl. `BarStack`), TanStack Query, nuqs, Supabase RPC, the kit
primitives and the shared charts layer all exist. No new dependency, token, or ADR.
**Future alignment:** N/A — no VISION.md.

**Stack extensions required:** none.

## Why this over alternatives

- **Geometry-only — keep the current content, just add spans (rejected, 👤).** Removes the hole but still
  misses the hero chart, sparkline minis, bars, funnel and scatter — not the "curated bento" ADR 0099
  mandates.
- **A goals/targets table so the cell can say "78% of Q3 target" (rejected, 👤).** Spec 003 deferred it to
  its own ADR and that stands. **Consequence, now disclosed:** three of the reference's four kv rows
  (Booked/target, Forecast, Remaining) are target-derived and cannot be built — so the cell takes 👤-chosen
  **target-free** rows (revenue vs previous · pace · purchasers · ARPU) on the same existing scalars. This
  is a deviation in **content**, not only copy — the first draft claimed only copy deviated, which was wrong.
- **Delete `SignalChart` because "the reference has no sparkline row" (rejected — the spec-critic's catch).**
  The reference has no sparkline _row_ because the sparklines are **inside the minis** (`:1544-1569`).
  `SignalChart` is exactly that sparkline and `fn_overview_signal` is exactly its data; deleting them was a
  first-draft error driven by motivated reading of the reference.
- **Import `TrendsChart` for the hero (rejected — an FSD violation).** Sibling widget; widget→widget breaks
  same-layer isolation (Steiger). Phase D's `SignalChart` set the mirror-don't-import precedent.
- **Promote a shared multi-series chart into `@/components/charts` and refactor trends-explorer onto it
  (rejected — scope).** Defensible long-term and it would kill the mirrored duplication, but it drags a
  shipped widget into this PR with its own graph story. Recorded as a Future Consideration.
- **Prove the geometry with the widget test in jsdom (rejected — it cannot).** jsdom performs no CSS layout
  (`vitest.config.mts:27-28`), so className assertions would be tautological and a "hole" invisible. Hence
  F27/F28 and the AC4/AC5 split.
- **Replace the scatter with existing `fn_segment_distribution` bars (rejected, 👤).** Zero new SQL, but not
  the reference's cell.

## Test Plan

- **Harness:** Vitest (`npm run test` — the unit jsdom project **and** the Storybook browser project, which
  runs real CSS + the axe WCAG 2.2 AA gate, ADR 0039); coverage `npm run test:coverage` (≥80%). Playwright
  (`npm run test:e2e`) for the in-database RPC proof — bootstrap-deferred from CI, run locally.
- **Test locations:** colocated — `src/entities/segment/api/queries.test.ts`, the widget's
  `model/window.test.ts` / `model/kpis.test.ts` / `ui/OverviewDashboard.test.tsx`; stories `ui/*.stories.tsx`
  (incl. the browser-mode `BentoGrid.stories.tsx`); the SQL fixture `e2e/overview.spec.ts`.
- **Conventions:**
  - RPC fetchers: the existing `rpcReturning` mock — assert `(name, args)`, rows, `[]` on null, throw-on-error.
  - Widget behaviour: mirror the existing `OverviewDashboard.test.tsx` — `vi.mock` the entity fetchers +
    `@/lib/supabase/client`; REAL hooks under `QueryClientProvider` + `NextIntlClientProvider` +
    `NuqsTestingAdapter`; render against the real `messages/en.json`.
  - Stories: CSF3, light default + a `globals:{theme:'dark'}` Dark story each, wrapped in a
    `bg-surface-panel` surface decorator (the Phase-E rule — mission-control text on the shadcn
    `--background` is the reverse half-mix and fails axe); deterministic fixtures; presentational → no `play`
    **except** `BentoGrid` (whose `play` is the geometry oracle).
  - In-database SQL fixture: mirror `e2e/funnels.spec.ts` — seeded `bob@capcom.dev` (Aurora) /
    `carol@capcom.dev` (Globex), pinned window constants, invariants + cross-tenant isolation.
  - RLS: the `supabase-rls-reviewer` agent on the migration diff (static properties, AC1); runtime isolation
    by AC8.

## Definition of Done

- [ ] `npm run test` green (incl. the browser-mode geometry play); `npm run test:coverage` ≥ 80%.
- [ ] `npm run test:e2e` green locally for `e2e/overview.spec.ts` (after `db:reset` + a pinned
      `SEED_EVENTS_ANCHOR`).
- [ ] `npm run gen:types` run and `database.types.ts` committed (no drift).
- [ ] `check:tokens` + `check:contrast` green in **both** compositions; axe green over the new stories in both themes.
- [ ] `check:graph` + `check:design-intent` green after the coupled reconciliation **including the two
      removals**; `check:fsd` + `check:boundaries` green.
- [ ] `check:i18n` green (ICU/parity backstop only); `gen:tokens` swap-only self-test unchanged.
- [ ] `supabase-rls-reviewer` clean on the migration.
- [ ] `tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run build` green.
- [ ] Progress doc updated — **before the PR**.
- [ ] **Chromatic cannot run** (token unprovisioned) — the PR says so plainly; the accepted visual proof is
      AC5 + the axe stories + human review. Do not write "pending Chromatic re-baseline".
- [ ] Single human-reviewed PR into `dev`; Conventional Commits; no AI attribution.

## Non-goals

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
  reference's "Visited → Signed up → Activated"; minis' sparklines = the retained `fn_overview_signal`.
  Seeded plans are `free | pro | enterprise` (3 series, matching the reference's 3-entry legend).
- **Two sources of `plan`, knowingly.** `fn_event_trends` breaks down by the **event's**
  `properties->>'plan'`, while F1's scatter reads `profiles.traits->>'plan'`. They agree only because the
  seed stamps both (`seed-events.mjs:122,174`); real ingest (ADR 0085) carries no such guarantee.
  Acceptable for a seeded demo; reconciling them is a stated non-goal.
- **`fn_event_trends` counts events, not distinct users**, so the hero series is activity-by-plan while the
  headline is distinct active users (from `fn_overview_kpis`). The reference does not disambiguate; the copy
  says "activity by plan" rather than implying the series sums to the headline.
- **The hero's headline value/delta** come from the already-fetched `fn_overview_kpis` scalars, not re-derived
  from the trend rows — keeping it two-scalar presentation (ADR 0087/0088), not an app-code reduction.
- **The scatter is capped** at `p_limit` (default 300) ordered by `ltv desc` — bounded in SQL, not the client.
- The bento's fr ratios and the mobile breakpoint are copied from the reference; the exact breakpoint value is
  a presentation detail asserted by AC5's Mobile story.

## Open Questions

none

## Security / NFR

- **Auth/RLS (touched):** `fn_segment_scatter` is `SECURITY INVOKER`, `search_path` pinned,
  authenticated-only EXECUTE; isolation inherited from the ADR 0083 membership join. The `profiles` join is
  safe under the existing "Members read profiles in their projects" policy. No service-role path; the client
  never supplies a tenant id. Static properties by `supabase-rls-reviewer` (AC1); runtime by AC8.
- **PII:** the scatter returns `distinct_id` — a pseudonymous tracked-user key (ADR 0083), never an
  `auth.users` identity — plus aggregates. Rendered as anonymous points; no identifier displayed.
- **Injection:** no dynamic SQL — a static set-based query with typed parameters; the fetcher passes a typed
  arg bag.
- **a11y/i18n:** WCAG 2.2 AA via `check:contrast` + axe stories in both themes; charts are `role="img"` with a
  summary label and no live region (single-announcement); `--text-tertiary` is not used for text; all copy via
  next-intl.
- **Performance:** set-based reductions over the existing `(project_id, ts)` index at seeded-demo volume; the
  scatter is capped in SQL. Poll-based refresh.
- **Rollout:** additive, reversible by dropping one function.

## Critic Verdict & Overrides

- **Round 1: BLOCK** (marvin-tm-spec-critic) — five blockers, all accepted and fixed:
  1. **`mono-data` contradiction** (F28 claimed HeroChart imports MonoData; F16 didn't; no design-intent
     entry) → HeroChart imports Panel/MetricHero/StatusIndicator only; mono-data's delta is now PacingCard,
     with F34 covering its design-intent.
  2. **`panel.usedIn` must DROP `OverviewDashboard`** (it imports Panel only to wrap the SignalCharts; every
     cell now owns its own) — the gates are exact-set, so a stale entry fails as hard as a missing one → F31
     and F32 now state both removals explicitly, and AC10 names them.
  3. **AC4's oracle could not prove the defect** — jsdom performs no CSS layout, so "no empty cell" was
     unprovable → split into **AC4** (presence, jsdom) and **AC5** (geometry, a browser-mode `BentoGrid`
     story asserting `getComputedStyle`), with F27/F28 extracting the layout shell precisely so it is
     storyable.
  4. **AC11's oracle detected none of its failures** — `check:i18n` is vacuous with one locale (its own header
     says so) and never reads `src/` → AC11 now hangs on the widget test rendering against the real catalog,
     with check:i18n demoted to an ICU backstop and the limitation stated in the failure line.
  5. **The reference description was incomplete in exactly the direction that made the reuse story work**
     (the confirmation-bias catch): (a) each `.panel.mini` **carries a sparkline** (`:1544-1569`), so
     `SignalChart` + `fn_overview_signal` are the minis' component and data — **un-deleted**, retained; (b)
     `b-goal` has a **4-row `.kv` block** (`:1645-1710`), so radial+% alone would re-create a sparse cell in
     the spec that exists to remove one → 👤 chose target-free rows on existing scalars.
     All warnings also addressed: the "breaks down by trait" error corrected to event `properties` (with the
     two-sources-of-`plan` Assumption recorded); the `--text-tertiary` carve-out withdrawn; the MonoData
     size-role hazard removed (the mini uses MonoData's existing tone axis, no kit variant); the bars interval
     made range-aware (7d no longer renders 1-2 bars); `queryKeys.overview.signal` retained; `KPI_DESCRIPTORS`
     partitioned via F11 with `model/kpis.ts` added to the contract; the F-id gap closed by renumbering.
- **Round 2:** pending — the critic re-runs on this revision before the spec is sealed.

## Design Notes

- **I mis-read the frozen reference in my own favour, twice.** The first draft said the minis were "literally
  the current KpiCard" and that "the reference has no sparkline row" — both omissions made the reuse/deletion
  story work. The minis carry sparklines; `b-goal` carries a 4-row block. When a spec's convenient reading and
  the source disagree, the source wins: re-read `console-build-reference.html` cell-by-cell before touching
  this widget.
- **The FSD trap is the #1 implementation risk.** `HeroChart` looks like `TrendsChart`; importing
  `@/widgets/trends-explorer` is a Steiger violation. Mirror the structure; import only `@/components/charts`.
- **The coupled `usedIn` reconciliation is the #2 risk, and this time it has REMOVALS** — `panel` loses
  `OverviewDashboard`, `metric-hero` loses `KpiCard`. Exact-set gates: a stale entry is as fatal as a missing
  one.
- **Story surface decorators are mandatory** (the Phase-E lesson): mission-control text measured against the
  shadcn `--background` is the reverse half-mix and turns axe RED.
- **Grid track ratios are not tokens.** `1.55fr 0.95fr 1.1fr` are layout proportions; ADR 0058 governs
  colour/size literals in tokenizable properties and no token exists for grid tracks.
- **Honest copy AND honest content on the goal cell.** No targets table exists, so the cell shows prior-period
  pacing with target-free rows and says "vs the previous period". The radial fill also diverges from the
  reference's decorative `viz` gradient to semantic `status-nominal/caution` — a deliberate, disclosed
  deviation.
- **Chromatic cannot verify this work** — the token is unprovisioned and the job skips. The visual proof is
  AC5's browser-mode geometry assertions + the axe stories + human eyes on the running demo. Do not write
  "pending Chromatic re-baseline" as if it will run.

## Future Considerations

- Promote a shared multi-series area chart into `@/components/charts` and refactor `TrendsChart` +
  `HeroChart` onto it, killing the mirrored duplication this spec accepts.
- A goals/targets table (its own ADR) would let the goal cell state a real target and restore the reference's
  Booked/target · Forecast · Remaining rows.
- Reconcile the two sources of `plan` (event properties vs profile traits) so breakdowns survive real ingest.
- Chart interactivity (tooltip/crosshair) on the bento cells via the ADR 0093 layer.

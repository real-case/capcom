# CAPCOM — mission-control console re-skin · progress

> **Plan:** [`console-redesign-plan.md`](./console-redesign-plan.md) ·
> **Decision:** [ADR 0099](../decisions/0099-mission-control-product-console-surface.md)

## ⚠️ Requirement — update this file after every phase

**A phase is not "done" until this file is updated.** At the end of each phase, **before opening the
PR**, you MUST:

1. Set the phase's **State** in the status table (`☐ not started → 🔧 in progress → ✅ done`), fill
   its **PR** and **Updated** (absolute date).
2. Add a dated entry to the **Phase log** below — what landed, gate results (contrast / axe / tokens /
   coverage), and the **Chromatic re-baseline** approval status (human-only).
3. Rewrite the **Resume point** to the next concrete step.

This mirrors the whole-project [`PROGRESS.md`](./PROGRESS.md) convention ("update it at the end of each
PR"). If you finished a phase and this file still says `☐`/`🔧` for it, the phase is **not** finished.

## Status

| Phase | Theme                                                           | State   | PR                                                 | Updated    |
| ----- | --------------------------------------------------------------- | ------- | -------------------------------------------------- | ---------- |
| 0     | Accept ADR 0099 (human-only) + CLAUDE.md sync                   | ✅ done | —                                                  | 2026-07-13 |
| A     | Skin foundation — console primitives + stories                  | ✅ done | —                                                  | 2026-07-13 |
| B     | App shell re-skin (`app-shell`)                                 | ✅ done | [#35](https://github.com/real-case/capcom/pull/35) | 2026-07-13 |
| C     | Events explorer re-skin (`events-explorer`)                     | ✅ done | [#36](https://github.com/real-case/capcom/pull/36) | 2026-07-14 |
| D     | Overview home (`overview-dashboard` + KPI RPCs)                 | ✅ done | [#37](https://github.com/real-case/capcom/pull/37) | 2026-07-14 |
| E     | Remaining widgets (funnel/retention/segment/trends) + seam docs | ✅ done | [#38](https://github.com/real-case/capcom/pull/38) | 2026-07-15 |

Legend: ☐ not started · 🔧 in progress · ✅ done · ⛔ blocked (note why).

## Resume point

**The console-redesign initiative is COMPLETE** (all phases 0 / A / B / C / D / E done). Phase E re-skinned
the last four analytics widgets (`trends-explorer`, `funnel-builder`, `retention-grid`, `segment-builder`)
**and** the shared ADR-0093 chart-interaction layer they render (`src/components/charts/{tooltip,legend,
crosshair,brush}`) off the shadcn value layer onto the mission-control surface, and documented the
marketing↔console palette seam ([`palette-seam.md`](./palette-seam.md), linked from
[`src/design-system/README.md`](../../src/design-system/README.md)).

**Remaining human-only gates before this ships:** review + **Chromatic re-baseline** (ADR 0043/0095) + merge
the Phase-E PR into `dev`; then the `dev → main` promotion (v0.2.x) is the human-only production step that
carries the whole console re-skin (Phases B–E) live. No further agent phase remains.

**Phase-D reusable facts (for E):**

- **Aggregation RPCs** live at `supabase/migrations/*_create_overview_kpis.sql`; the fetcher-idiom is the
  `rpcReturning` mock in `src/entities/event/api/queries.test.ts`; the executable RPC-math proof is a
  Playwright e2e SQL-fixture spec (`e2e/overview.spec.ts`, modeled on `e2e/funnels.spec.ts`) run locally
  (`npm run test:e2e` after `db:reset` + `SEED_EVENTS_ANCHOR=… npm run seed:events`) — the "RLS test on new
  RPCs" the plan asks for. Windowed KPI deltas/ratios are **presentation** (a ratio of already-reduced
  scalars, ADR 0087/0088), never app-code aggregation — the `_prev`-columns-in-the-same-RPC-row design is
  what keeps it so.
- **Coupled graph reconciliation (SPEC GAP, reuse in E):** a new widget consuming an EXISTING kit primitive
  is **not** "no graph change" — `check:graph` demands the primitive's node `usedIn` gain the new consumer,
  AND the primitive's `design-intent.ts` `meta.usedIn` must be updated in lockstep (the coupled
  reconciliation). Phase D updated `panel` / `metric-hero` / `mono-data` / `status-indicator`. Budget for
  this in E for every primitive the re-skinned widgets touch.
- **Steiger `insignificant-slice` warning** is expected for every widget imported only by its app-router
  page (trends-explorer, overview-dashboard both show it); `check:fsd` exits 0 — non-blocking.

**Carry forward — the palette trap (confirmed live in Phase B, held clean in Phase C/D):**
`--text-tertiary` is **not** AA-guaranteed for small text. Use `--text-secondary` for any small text;
`--text-tertiary` only for large/decorative. `check:tokens`/`check:contrast` do NOT catch a leftover
shadcn foreground on a `--surface-*` bg — only an **axe story** does, so every re-skinned surface needs a
dark **and** light story.

**Phase C 👤 decisions (RESOLVED 2026-07-14, this session):**

1. **Categorical pill → NEW governed `CategoryPill` primitive** (over badge-through-surface). It
   **composes `Badge`** (`compositionSignature ["badge"]`, `kind composite`, `archetype
categorical-indicator`, `usageRole null`) — a distinct signature that reuses rather than duplicates the
   chip, dodging the ADR 0059 collision that dropped StatusPill in Phase A. A viz-categorical hue dot +
   themed Badge; `hue` takes a `var(--color-viz-*)` token from `eventHue`. Consumed by the plan column
   (EventsTable) + the group-roll-up label (GroupRollup).
2. **Axe coverage → per-component stories** for the 7 toolbar-row components (they're only rendered by the
   fetching `EventsExplorer`, so had no coverage). `StatusIndicator` was **rejected** for the pulsing
   stream dot (a severity pill is the wrong fit — the dot stays a bare inline dot).

## Phase log

> Newest entry first. Template per entry:
>
> ```
> ### Phase X — <title> — <YYYY-MM-DD> — <🔧 in progress | ✅ done | ⛔ blocked>
> - **Landed:** <what changed, which slices/files>
> - **Gates:** check:contrast <both themes?> · axe · check:tokens · test:coverage · build
> - **Chromatic:** <re-baseline approved by whom / pending>
> - **PR:** <link> · merged to dev? <yes/no>
> - **Next:** <the next concrete step>
> ```

### Bento-fidelity precursor — the SQL + entity layer (`fn_segment_scatter` + a `purchasers` column) — 2026-07-16 — ✅ done

- **Why this exists.** Reviewing the running demo, the 👤 found that Phase D shipped a **flat uniform grid**
  (`OverviewDashboard.tsx:96` — `grid … lg:grid-cols-3`, no spans → 3 cards + 2 cards **and a hole**), not the
  "curated bento" ADR 0099 mandates against the frozen build reference. The rebuild (sibling spec
  `overview-bento-fidelity`, ~31 UI files) cannot be split internally — its component edits are atomically
  coupled to their `usedIn` deltas by exact-set gates — so this is the **one clean seam**: SQL + entity, no
  component, no render, no graph node. 👤 decision.
- **Landed:**
  - **`fn_segment_scatter`** (`supabase/migrations/20260716120000_create_segment_scatter.sql`) — the only
    bento cell with no existing RPC (`fn_segment_distribution` is 1-dimension, not a 2-D per-user scatter).
    `SECURITY INVOKER`, `search_path=''`, **events-driven** (groups `public.events` by `distinct_id`, LEFT
    JOINs `profiles` for plan → `frequency >= 1` by construction), `ltv` via the `jsonb_typeof` numeric gate,
    **capped in SQL** by `p_limit` ordered `ltv desc`.
  - **A `purchasers` column on `fn_overview_signal`**
    (`supabase/migrations/20260716120100_overview_signal_purchasers.sql`) — the reference's three `b-stack`
    minis each carry a **sparkline**, and `conversion = purchasers / active_users` had **no per-bucket
    source**. Same reduction as `fn_overview_kpis`' scalar, so sparkline and KPI cannot drift.
  - Entity layer on `segment` (generated types, `fetchSegmentScatter`, mock-rpc tests, barrel), the
    `SignalChart` story fixture, and the stale doc comments.
  - **Five of the bento's six cells need no new SQL** — `fn_event_trends` already takes `p_breakdown_key`
    (hero + stacked bars), `fn_overview_kpis` covers the hero value / mini stack / goal pacing, `fn_funnel`
    covers the funnel.
- **Gates:** `db:reset` ✅ (both migrations apply) · **ACL verified live: `fn_overview_signal →
postgres=X/postgres | authenticated=X/postgres` — no `anon`, no PUBLIC** · both confirmed SECURITY INVOKER
  (never DEFINER) with a pinned empty search path · `gen:types` ✅ · **e2e ✅ 7/7** (`npm run test:e2e`,
  pinned anchor) · `npm run test` ✅
  **723/723** · `tsc` / lint (`src`) / build ✅ · `check:tokens` / `graph` / `design-intent` / `fsd` /
  `boundaries` / `i18n` / `spelling` / `citations` ✅.
- **What the spec-critic caught (3 rounds — none of these were cosmetic):**
  1. **The migration would not have applied.** The draft said `CREATE OR REPLACE`; Postgres rejects a changed
     `RETURNS TABLE` row type. The repo has **zero** such migrations — the shipped idiom is drop-first
     (`20260709120000_events_filtered_summary_and_facets.sql:27-32`). Proven: `db:reset` now passes.
  2. **A privilege escalation.** The DROP that fix forces silently discards the GRANTs, and `CREATE FUNCTION`
     grants EXECUTE to **PUBLIC** by default → `anon` would have gained EXECUTE, in the PR carved out _for_
     the security review. The migration now re-issues `revoke`/`grant`/`comment`; the ACL above is the proof.
  3. **A `tsc` break behind a "nothing breaks" claim** — `gen:types` marks columns required, so the typed
     `SignalChart.stories.tsx` fixture failed TS2739. The additive claim is now scoped to **runtime**, and the
     AC moved off prose-review to a command oracle (it was prose-review that let this through).
  4. **Three oracles that could not fail** — `rows <= p_limit` (300 cap vs ~160 seeded users passes with no
     LIMIT at all), `frequency >= 1` / `ltv >= 0` (true by construction), and `purchasers <= active_users`
     (seeded purchases are far too rare to catch a `count(*)` bug). Replaced by an explicit `p_limit=10` and a
     **non-empty-bucket identity** against `fn_overview_kpis`.
- **Disclosed, not papered over:** the identity proves window/filter/spine **parity**; it does **not** prove
  distinct-vs-row-count — a same-day repeat purchase is under one expected user-day across the whole seed, so
  **no deterministic proof of that property exists against this seed**. The distinct-user reduction is asserted
  by construction (it mirrors `fn_overview_kpis`' own filter).
- **Chromatic:** **N/A** — no render change (verified: `SignalChart` reads only `row[measure]` over the
  hand-written `SignalMeasure` union). Note the Chromatic job is inert repo-wide until a 👤 provisions
  `CHROMATIC_PROJECT_TOKEN`.
- **Process:** sealed spec
  [`006-overview-signal-and-scatter-rpcs.md`](../../.marvin/task/006-overview-signal-and-scatter-rpcs.md)
  (contract_sha `ff5444615a753231`; DoR PASS, spec-critic **BLOCK → BLOCK → PASS WITH WARNINGS**).
- **Next:** the bento rebuild — spec
  [`005-overview-bento-fidelity.md`](../../.marvin/task/005-overview-bento-fidelity.md) (`draft`,
  `depends_on: [overview-signal-and-scatter-rpcs]`), which must lose its own F1–F6 (they shipped here) and be
  re-crystallized once this merges.

### Phase E — Remaining analytics widgets + chart-interaction layer + seam doc (final) — 2026-07-14 — ✅ done

- **Landed:** the last four analytics widgets re-skinned off the shadcn value layer onto the mission-control
  surface (ADR 0099), **behavior unchanged** (all 0097/0084/0086/0093 filters / URL-state / interactions
  preserved), completing the initiative. One PR (👤 decision), zero new tokens / dependencies / SQL /
  i18n-strings.
  - **Containers → `Panel`** (`TrendsExplorer` / `FunnelBuilder` / `RetentionGrid` / `SegmentBuilder`): each
    `<section bg-card>` became `<Panel role="region" aria-label>` (landmark + queried `h2` preserved);
    headings → `text-text-primary`, captions/legends → `text-text-secondary`, the raw button/input recipes →
    the Phase-C mission-control recipe (`border-border-hairline bg-surface-elevated text-text-secondary
hover:text-text-primary focus-visible:ring-text-primary`).
  - **Widget charts** (`TrendsChart` / `TopEventsBar` / `FunnelChart` / `CohortGrid` / `SegmentDistribution`):
    `Message` boxes → `border-border-hairline` / `text-status-critical-fg` / `text-text-secondary`; SVG
    `<text fill>` `--color-foreground`/`--color-muted-foreground` → `--color-text-primary`/`-secondary`; bar
    tracks `--color-muted` → `--color-surface-elevated`; cell strokes `--color-border` →
    `--color-border-hairline`; focus rings → `text-primary`; CohortGrid in-cell `SCALE_TEXT` swapped 1:1. The
    `--viz-*` series/scale palette is untouched; the one exception is `TrendsChart`'s neutral **'Other'
    rollup line** (`OTHER_COLOR`), moved off `--color-muted-foreground` to `--color-text-tertiary` (a chart
    line, so the small-text AA caveat doesn't apply).
  - **The shared chart-interaction layer** `src/components/charts/{tooltip,legend,crosshair,brush}` — the
    **spec-critic Round-1 catch**: they render _inside_ the re-skinned Panels, so leaving them shadcn was the
    half-mix ADR 0099 forbids. Re-skinned onto mission-control (tooltip box → `bg-surface-overlay
border-border-hairline text-text-primary`; legend/crosshair/brush → text/surface tokens). They are
    console-only and **not** in the composition graph, so this was a pure token swap (no graph/design-intent
    churn).
  - **Story surface decorators** on all 9 chart + interaction-primitive stories (`bg-surface-panel`) so axe +
    Chromatic exercise the re-skinned chrome on the real surface in both light default and the existing Dark
    story — REQUIRED (else the mission-control text is measured against the shadcn `--background`, a reverse
    half-mix that fails axe).
  - **Route-page headers** (the four `p/[projectId]/{trends,funnels,retention,segments}/page.tsx` `<h1>`) →
    `text-text-primary` (the Phase-D Overview-header fix; `src/app` isn't scanned by `check:tokens`, so the
    AC1 grep covers it).
  - **The palette-seam doc** [`docs/capcom/palette-seam.md`](./palette-seam.md) (the two palettes, which
    surface each world uses, the half-mix failure mode + traps, the never-cross-pair rule, and the one
    documented intra-console shadcn-kit-label residual), linked from a new
    [`src/design-system/README.md`](../../src/design-system/README.md).
  - **Coupled graph reconciliation:** `panel.usedIn` (composition-graph.json + `panel.design-intent.ts`
    `meta.usedIn`) gained the four container files, in lockstep (the Phase-D gotcha, budgeted).
- **Gates:** AC1 clean-swap grep ✅ **0 matches** over the four widget slices + `src/components/charts` + the
  four route pages · `check:tokens` ✅ · `check:contrast` ✅ both compositions · **axe ✅ both compositions —
  `npm run test` 719/719 (136 files)**; the `bg-surface-panel` surface decorator did its job — it caught a
  real fixture half-mix (`brush.stories.tsx` "Whole window" `text-muted-foreground` at 4.49:1 on the light
  panel), fixed to `text-text-secondary` · `check:graph` / `check:design-intent` ✅ (panel `usedIn` +4, no new
  node) · `check:fsd` / `check:boundaries` ✅ · `check:i18n` ✅ (no string change) · `check:spelling` /
  `check:citations` ✅ · `gen:tokens` swap-only self-test ✅ + **zero token drift** · `tsc` ✅ · lint ✅ (`src`
  clean) · build ✅ · coverage ✅ (90.38% stmts / 82.88% br / 87.14% fn / 92.69% ln, all ≥ 80%) · behavior tests
  ✅ (containers + `brush.test.ts` unchanged).
- **Residuals / SPEC GAPs (recorded, non-blocking):** (1) the F28 brush story needed its "Whole window"
  fixture caption swapped (`text-muted-foreground → text-text-secondary`), not just the decorator added — an
  in-file clean-swap the new surface decorator surfaced via axe (within F28's allowlisted file). (2) The two
  remaining `src/components/charts` stories `gradient.stories.tsx` / `motion.stories.tsx` demoed on the shadcn
  `bg-card`. The diff-critic flagged this as a split Chromatic catalog; it was **outside the sealed
  F-allowlist**, so it was first recorded as a scope boundary and then re-skinned **at the 👤's explicit
  direction** — a deliberate, user-authorized addition beyond the sealed contract, not silent scope creep.
  `gradient`'s demo `<svg>` → `border-border-hairline bg-surface-panel`; `motion`'s decorator →
  `bg-surface-panel` with its demo card as `bg-surface-elevated` / `text-text-primary` /
  `border-border-hairline` (the production analogue — `MotionIn` wraps content **inside** a Panel), so the
  whole `src/components/charts` catalog now renders on one surface. (3) F31
  (`.cspell/project-words.txt`) was a no-op — fixing British→American spelling in the seam doc needed no
  dictionary additions. Diff-critic (`marvin-tm-diff-critic`) **PASS WITH WARNINGS** on the full
  diff (no blockers; all 5 ACs independently verified).
- **Process:** produced via the marvin task pipeline — sealed spec
  [`004-console-phase-e-analytics-reskin.md`](../../.marvin/task/004-console-phase-e-analytics-reskin.md)
  (contract_sha `353dee15094bd1ea`; DoR PASS-with-warnings over the 32-file one-PR scope note; spec-critic
  **BLOCK → PASS WITH WARNINGS** over 2 rounds — the critic caught the chart-interaction-layer half-mix that
  grew the scope 24→32 files, plus the `OTHER_COLOR` data-series and a `FOCUS_RING` wording fix), then
  interactive implementation.
- **Chromatic:** new/changed snapshots — the re-skinned charts + interaction primitives on their new
  surface decorators (dark + light), plus the re-skinned containers — **pending human approval** (the agent
  never approves its own baseline, ADR 0043/0095).
- **PR:** [#38](https://github.com/real-case/capcom/pull/38) — branch `feat/console-phase-e-analytics-reskin`
  → `dev`; merged to dev? **no** (awaiting human review + Chromatic re-baseline). Review before opening:
  `marvin-tm-diff-critic` **PASS WITH WARNINGS** (no blockers).
- **Next:** initiative complete — human review + Chromatic re-baseline + merge, then the `dev → main` v0.2.x
  promotion (human-only) carries Phases B–E live.

### Phase D — Overview home (`overview-dashboard` + KPI RPCs) — 2026-07-14 — ✅ done

- **Landed:** the curated bento Overview home — the console's first-class instrument-panel home (ADR 0099),
  deliberately distinct from the user-composed dashboards of ADR 0090.
  - **Two `SECURITY INVOKER` KPI RPCs** (`supabase/migrations/20260714120000_create_overview_kpis.sql`,
    ADR 0084, mirroring the `fn_events_summary` / `fn_event_trends` idiom): `fn_overview_kpis` returns one
    row of the scalar KPIs over the current window **and** the equal-length preceding window (`*_prev`
    columns) — active users / new sign-ups / purchasers / revenue; `fn_overview_signal` returns the
    zero-filled per-bucket signal series. No new table/policy/GRANT; `gen:types` regenerated.
  - **New widget `src/widgets/overview-dashboard`:** a `"use client"` fetching container reading a nuqs
    `range` (7d/30d/90d, Zod-validated) → the two TanStack Query hooks → `deriveKpis` (conversion,
    ARPU, deltas, goal-pacing computed as **presentation** — a ratio of already-reduced scalars,
    ADR 0087/0088, never app-code aggregation) → a bento of **presentational** children composing the
    shipped primitives: `KpiCard` ×4 + `PacingCard` (Panel + MetricHero + MonoData + StatusIndicator) +
    `SignalChart` (a token-only visx sparkline, non-interactive `role="img"` + summary — no live region).
    **No new kit primitive.**
  - **Overview route** (`p/[projectId]/page.tsx`): the bento is the hero; `ProjectHub` is retained below
    under an "Explore" heading. The page **header was re-skinned** off the shadcn value layer onto
    mission-control (`text-text-primary/secondary`, Badge themed-through) — the palette-trap half-mix the
    spec-critic caught. New `Overview` i18n namespace (one catalog, key parity).
- **Gates:** `check:contrast` ✅ both compositions (8/8) · axe a11y ✅ over the new KpiCard / PacingCard /
  SignalChart stories in **both** compositions (719 tests pass, 0 fail) · `check:tokens` ✅ (0 errors) ·
  `check:graph` ✅ (23 nodes) · `check:design-intent` ✅ (23 specs) · `check:boundaries` ✅ · `check:fsd` ✅
  (exit 0) · `check:i18n` ✅ (413 keys) · `check:stories` ✅ · `gen:tokens` swap-only self-test ✅ + **zero
  token drift** · `tsc` ✅ · lint ✅ (`src` clean) · unit ✅ (52 new: queries/window/kpis/OverviewDashboard) ·
  **e2e ✅ `e2e/overview.spec.ts` 4/4** (the `_prev` adjacent-window identity + cross-tenant isolation,
  against the seeded DB) · build ✅ · coverage ✅ (90.4% stmts / 82.97% br / 87.11% fn / 92.5% ln, all ≥ 80%).
- **SPEC GAPs (recorded, mechanical):** (1) **coupled graph reconciliation** — the spec's AC8 said "no
  composition-graph/design-intent change", true only for a _new_ primitive; a new widget consuming EXISTING
  primitives requires each primitive's node `usedIn` **and** its `design-intent.ts` `meta.usedIn` to gain the
  new consumers. Updated `panel` / `metric-hero` / `mono-data` / `status-indicator` (graph + design-intent,
  in lockstep) — the design-intent comments already anticipated Phase D. (2) The RPC verification was
  upgraded (spec-critic round-1) from prose-review-only to the existing Playwright e2e SQL-fixture harness
  (`e2e/overview.spec.ts`). (3) ARPU currency formatted as USD (the demo amount unit) — presentation detail.
- **Process:** produced via the marvin task pipeline — sealed spec
  [`003-console-phase-d-overview-dashboard.md`](../../.marvin/task/003-console-phase-d-overview-dashboard.md)
  (contract_sha `dd6eb6e46d3b72a1`; DoR PASS-with-warnings, spec-critic **BLOCK → PASS WITH WARNINGS** over 2
  rounds — the critic found the e2e harness the draft missed and the page-header palette-trap), then
  interactive implementation.
- **Chromatic:** new snapshots — the `KpiCard` / `PacingCard` / `SignalChart` stories (dark + light) and the
  re-skinned Overview route — **pending human approval** (the agent never approves its own baseline, ADR
  0043/0095).
- **PR:** [#37](https://github.com/real-case/capcom/pull/37) — branch `feat/console-phase-d-overview-dashboard`
  → `dev`; merged to dev? **no** (awaiting human review + Chromatic re-baseline). Reviews before opening:
  `supabase-rls-reviewer` **CLEAN** (AC1) + `marvin-tm-diff-critic` **PASS WITH WARNINGS** (no blockers).
- **Next:** Phase E — remaining analytics widgets + seam docs (see Resume point); initiative completion.

### Phase C — Events explorer re-skin (+ a governed CategoryPill) — 2026-07-14 — ✅ done

- **Landed:** the events-explorer flagship (`EventsTable`, `EventsToolbar`, `FacetFilter`, `BulkActionsBar`,
  `ViewTabs`, `SaveViewPopover`, `ColumnsMenu`, `GroupByMenu`, `GroupRollup`, `EventDetail`, `EventsExplorer`)
  re-skinned off the shadcn value layer onto the mission-control surface (ADR 0099) — **behavior unchanged**
  (the 0097/0098 filters / selection / saved-views / density / group-by all preserved; `data-density` was
  already wired in 0098 and stays). Numeric cells adopt **`MonoData`** (value / user / country / time /
  footer / pager / detail rows), container surfaces adopt **`Panel`** (BulkActionsBar / GroupRollup /
  EventDetail cards). **One new governed kit primitive: `CategoryPill`** — the 👤 decision (see Resume
  point): a composite that themes `Badge` through the surface (`compositionSignature ["badge"]`) + a
  viz-categorical hue dot, consumed by the plan column + roll-up label; ships design-intent + dark/light
  stories + test + graph node. `planVariant` removed (CategoryPill + `eventHue` replace it). Reused shadcn
  `Button`/`Popover`/`Command`/`DropdownMenu` themed **through** the surface at the call site (never forked,
  ADR 0099). Per the 2nd 👤 decision, **7 new per-component stories** (EventsToolbar / FacetFilter / ViewTabs
  / SaveViewPopover / ColumnsMenu / GroupByMenu / GroupRollup, each dark + light) give the toolbar row axe
  coverage it lacked, plus an `ExpandedDark` EventsTable story for the detail panel.
- **Gates:** `check:contrast` ✅ both compositions (8/8) · axe a11y ✅ over the CategoryPill + 7 toolbar-row
  - EventsTable stories in **both** compositions (47 storybook browser tests) · `check:tokens` ✅ (0 errors) ·
    `check:graph` ✅ (23 nodes) · `check:design-intent` ✅ (23 specs) · `check:boundaries` ✅ · `check:fsd` ✅ ·
    `check:i18n` ✅ (392 keys) · `check:stories` ✅ (29 modules) · `gen:tokens` swap-only self-test ✅ + **zero
    token drift** (no new tokens) · `tsc` ✅ · lint ✅ (`src` clean) · unit ✅ (EventsExplorer 10/10 incl. the new
    behavior-preservation test, CategoryPill 3/3) · build ✅ · coverage ✅ (90.1% stmts / 82.6% br / 87.2% fn /
    92.2% ln, all ≥ 80%).
- **CategoryPill earns its existence (ADR 0059):** `Badge` is already a `categorical-indicator` leaf
  (signature `[]`); a new leaf would be a structural duplicate (the Phase-A StatusPill collision). Composing
  `Badge` gives `["badge"]` — a distinct signature that reuses the chip. `StatusIndicator` was **rejected**
  for the pulsing stream dot (a severity pill is the wrong fit; the dot stays a bare inline dot, so no
  `status-indicator` graph edge).
- **Palette trap held clean;** one **target-size** (not contrast) axe issue surfaced by the new EventsToolbar
  story: the search-clear button was 20px (< the WCAG 2.2 24px min) — a **pre-existing** size never caught
  because the toolbar had no story; fixed `size-5 → size-6` (the only tap-target fix needed; the chip-remove
  buttons pass on spacing). SPEC GAP recorded.
- **Process:** produced via the marvin task pipeline — sealed spec
  [`002-console-phase-c-events-explorer-reskin.md`](../../.marvin/task/002-console-phase-c-events-explorer-reskin.md)
  (DoR gate PASS, spec-critic BLOCK → PASS: added `ExpandedDark`, dropped StatusIndicator, tightened AC4),
  then interactive implementation.
- **Chromatic:** new/changed snapshots — `CategoryPill` + its stories, the 7 toolbar-row stories, the
  re-skinned `EventsTable` (incl. `ExpandedDark`), and the re-skinned `EventDetail`/`GroupRollup`/
  `BulkActionsBar` — **pending human approval** (the agent never approves its own baseline, ADR 0043/0095).
- **PR:** [#36](https://github.com/real-case/capcom/pull/36) — branch `feat/console-phase-c-events-explorer`
  → `dev`; merged to dev? **no** (awaiting human review + Chromatic re-baseline).
- **Next:** Phase D — overview-dashboard + KPI RPCs (see Resume point).

### Phase B — App shell re-skin (V2: extract chrome sub-primitives) — 2026-07-13 — ✅ done

- **Landed:** the app-shell chrome (`AppShell`, `SidebarNav`, `CommandPalette`, `ProjectHub`) re-skinned
  off the shadcn value layer onto the mission-control surface (ADR 0099), plus a static-reference-dressing
  `TelemetryFooter` (Ingestion / RLS / freshness / events-min). **Two new governed kit primitives** (the
  V2 choice, over the recommended V1): **`NavItem`** (`action-trigger`; `asChild` via the **`radix-ui`
  umbrella `Slot`** — no new dependency; the first interactive mission-control primitive) and
  **`TelemetryStat`** (`data-display` composite of `MonoData` + `StatusIndicator`). The Storybook theme
  toolbar was wired to drive `[data-theme]` **and** `.dark` (`preview.tsx`), mirroring production, so the
  console chrome flips light/dark in the workbench; new `AppShell` dark+light stories, a `Panel` light
  story, and the coupled composition-graph / design-intent `usedIn` reconciliation (card − ProjectHub,
  panel + ProjectHub, mono-data / status-indicator + telemetry-stat, two new nodes).
- **Gates:** `check:contrast` ✅ both compositions (8/8) · axe a11y ✅ over **all** stories in **both**
  compositions (228 storybook browser tests) · `check:tokens` ✅ (0 errors) · `check:graph` ✅ (22 nodes) ·
  `check:design-intent` ✅ (22 specs) · `check:boundaries` ✅ · `check:fsd` ✅ · `check:i18n` ✅ ·
  `check:stories` ✅ (28 modules) · `gen:tokens` swap-only self-test ✅ + **zero token drift** · `tsc` ✅ ·
  lint ✅ (source clean) · unit ✅ (418) · build ✅ · coverage ✅ (89.8% stmts / 82.2% br / 87.7% fn /
  91.9% ln, all ≥ 80%).
- **Palette-trap caught + fixed:** the axe **dark** story flagged `--text-tertiary` on
  `--surface-background` at 3.99:1 (< AA) in the breadcrumb — swapped to the AA-verified `--text-secondary`;
  re-ran green. (`check:tokens`/`check:contrast` don't catch this; only the axe story does.)
- **SPEC GAPs (3, minor):** (1) the telemetry footer separator is a `border-border-hairline` **utility**,
  not the `Hairline` component — importing it would need an out-of-allowlist `hairline.design-intent` edit;
  same token/visual, no graph churn. (2) dropped the `@radix-ui/react-slot` scoped dep for the existing
  `radix-ui` umbrella `Slot` (critic finding) — marker EXTENSION → **NATIVE**, no new dependency. (3) the
  **CommandPalette** is a Radix Dialog that **portals to `body`** (outside the story canvas), and no repo
  precedent axes a portal, so its themed-through overlay is **not** reached by the story axe run. Its
  contrast was instead verified by **direct oklch computation** (the diff-critic's finding): the
  `--surface-overlay` + `--text-secondary`/`--text-primary` pairs — which `check:contrast` does not cover —
  clear AA in **both** compositions (secondary ≈ 6–6.5:1, primary ≈ 12:1); the un-overridable
  `command-input-wrapper` `bg-input/30` (≈4% lightening) leaves it above AA. Final visual sign-off is the
  human Chromatic re-baseline. So the "228 axe" figure covers the **persistent chrome + primitives**, not
  the transient palette overlay.
- **Chromatic:** new/changed snapshots — the 4 chrome files, `NavItem` / `TelemetryStat` /
  `TelemetryFooter`, plus the `F22` global `[data-theme]` toolbar wiring flips several **existing**
  primitive default stories (mono-data / metric-hero / hairline / panel) dark → light, so the re-baseline
  is repo-wide — **pending human approval** (the agent never approves its own baseline, ADR 0043/0095).
- **Process:** produced via the marvin task pipeline — sealed spec
  [`001-console-phase-b-app-shell-reskin.md`](../../.marvin/task/001-console-phase-b-app-shell-reskin.md)
  (DoR gate PASS, spec-critic BLOCK → PASS-with-warnings), then interactive implementation.
- **PR:** [#35](https://github.com/real-case/capcom/pull/35) — branch `feat/console-phase-b-app-shell` →
  `dev`; merged to dev? **no** (awaiting human review + repo-wide Chromatic re-baseline).
- **Next:** Phase C — events-explorer re-skin (see Resume point).

### Phase A — Skin foundation (console primitives) — 2026-07-13 — ✅ done

- **Landed:** four console-surface primitives in `src/components/ui/` (component + `design-intent.ts`
  - stories + test each), registered in `composition-graph.json`:
  * **`Panel`** — `container` archetype (the `card` precedent), `--surface-*` elevation axis
    (panel/elevated/overlay), hairline border.
  * **`MetricHero`** — `archetype: null` leaf: large KPI value, geist-mono numeric face at the
    `metric-hero` type role, optional label.
  * **`MonoData`** — `archetype: null` leaf: inline tabular value at the `mono-data` role; `tone` =
    primary/secondary only (the AA-verified text roles; `--text-tertiary` deliberately excluded —
    not AA-guaranteed for small text).
  * **`Hairline`** — `archetype: null` leaf: 1px rule on the hairline/divider token, orientation +
    tone axes, `role="separator"` passthrough.
  * **Infra fix:** `src/lib/utils.ts` `cn()` now `extendTailwindMerge`s the generated `@theme`
    font-size roles (sourced from `SEMANTIC_OTHER_TOKENS`, single-source per ADR 0058) — without it
    twMerge misclassified `text-mono-data`/`text-metric-hero` as a color and silently dropped the size
    when merged with a `text-*` color. Zero existing components use these roles, so no regression
    (411 unit tests green).
- **Scope change vs the plan's "e.g." list:** **StatusPill dropped** (duplicate of `status-indicator`
  - `badge`, ADR 0059/0061 collision) — 👤 decision flagged in the PR + Resume point. Built 4, not 5.
- **Crux (from Phase 0) confirmed in practice:** the light `--surface-*`/`--text-*` composition is
  already AA-legible — no token-layer rebuild needed; Phase A was primitives + stories.
- **Gates:** `check:contrast` ✅ both compositions (8/8) · axe a11y ✅ over all **20** new stories in
  **both** compositions (dark default + `[data-theme="light"]`) · `check:tokens` ✅ (0 errors) ·
  `gen:tokens` swap-only self-test ✅ + **zero token drift** (no new tokens) · `check:design-intent` ✅
  (20 specs) · `check:graph` ✅ (20 nodes) · `check:boundaries` ✅ · `check:stories` ✅ (26 modules) ·
  `tsc` ✅ · unit ✅ (411) · full `check:design-system` bundle ✅.
- **Chromatic:** new snapshots for the 4 primitives' stories — **pending human approval** (the agent
  never approves its own baseline, ADR 0043/0095).
- **PR:** pending — Phase A branch `feat/console-phase-a-primitives`, **stacked on** the Phase-0 branch
  (`chore/adr-sync-0097-0099`, PR #32) since it depends on the accepted 0099 + CLAUDE.md sync. Rebase
  onto `dev` once #32 merges.
- **Next:** Phase B — app-shell re-skin (see Resume point; wire the Storybook theme toolbar to
  `[data-theme]` first).

### Phase 0 — Accept ADR 0099 + CLAUDE.md sync — 2026-07-13 — ✅ done

- **Landed:** ADR 0099 accepted by the human (`adr.py accept 0099`). CLAUDE.md synced to the accepted
  corpus via the `adr-sync-claude-md` skill — a **full faithful sync** that folded in the three
  accepted ADRs that were missing from CLAUDE.md: **0097** + **0098** (events-explorer) and **0099**
  (console surface). Added their Stack / Conventions / Restrictions bullets; Commands unchanged (no new
  npm scripts).
- **Gates:** `adr.py lint` clean (99 records, 0 errors) · `check:claude-md` OK (96 accepted, all
  reflected, every citation resolves) · `check:claude` OK. Crux de-risked (read-only): `check:contrast`
  already green in **both** compositions incl. the four surface/text pairs — the light composition of
  the mission-control surface/text set is already AA-legible, so Phase A is primitives-and-stories, not
  a token-layer rebuild.
- **Chromatic:** n/a — no visual change in Phase 0.
- **PR:** pending — Phase 0's governance changes (ADR accept + CLAUDE.md sync + this progress update)
  to be committed on a feature branch and human-merged to `dev`.
- **Next:** Phase A — add console primitives (`Panel`, `MetricHero`, `StatusPill`, `MonoData`,
  `Hairline`) themed only through mission-control semantic tokens, each with dark + light stories; run
  the Phase A gates.

## Environment reminders (shared with the whole-project PROGRESS.md)

- **Node 24 required**; local Supabase needs Docker (`npx supabase start`).
- Dev server: `npm run dev` → **http://localhost:20000** (use `localhost`, not `127.0.0.1`, or the
  client islands don't hydrate in Next 16 dev).
- Design-system gates for this initiative: `npm run check:contrast` (both themes),
  `npm run check:tokens`, `npm run check:design-system`, `npm run gen:tokens` (swap-only self-test),
  plus the standard `tsc` / `lint` / `test:coverage ≥80%` / `build`. Chromatic re-baseline is
  **human-approved** (ADR 0043/0095).

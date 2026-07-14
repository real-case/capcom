---
slug: console-phase-d-overview-dashboard
type: feature
status: in-progress
created: 2026-07-14
tracker: docs/capcom/console-redesign-progress.md (Phase D)
supersedes: none
stack: typescript, sql
risk: medium
breaking: false
spike_required: false
test_command: npm run test
contract_sha: dd6eb6e46d3b72a1
---

# Console re-skin Phase D — the curated bento Overview home (overview-dashboard + KPI RPCs)

## Goal

Turn the project Overview route into the console's **curated, first-class instrument-panel home** (ADR
0099): a new `src/widgets/overview-dashboard` widget — a bento of project-level KPI cards + visx signal
sparklines — fed **reduced rows** from two new `SECURITY INVOKER` aggregation RPCs (`fn_overview_kpis`,
`fn_overview_signal`, ADR 0084) via TanStack Query, on the mission-control surface, theme-aware
(light/dark, ADR 0092), zero new tokens, zero new dependencies. It is deliberately distinct from the
**user-composed** dashboards of ADR 0090.

## Context

- Related patterns:
  - **Aggregation RPC idiom (ADR 0084)** — `fn_events_summary`
    (`supabase/migrations/20260708093000_create_events_summary.sql:26`): `language sql`, `stable`,
    `security invoker`, `set search_path = ''`, every reference schema-qualified (`public.events`), the
    numeric-amount cast gated by `jsonb_typeof(... ) = 'number'`, and least-privilege GRANTs (`revoke
execute … from public/anon`, `grant execute … to authenticated`). Interval bucketing precedent:
    `fn_event_trends` (`supabase/migrations/20260625150535_create_event_trends.sql`) `date_trunc(p_interval,
e.ts)`. **Mirror both idioms; do not invent a new one.**
  - **Entity fetcher + type derivation** — the aggregation fetchers in
    `src/entities/event/api/queries.ts:132` (`fetchEventsSummary` unwraps `data?.[0] ?? zeros`; the
    others return `data ?? []`) forward the typed arg bag verbatim and perform **no** client reduction;
    types are `Database["public"]["Functions"]["fn_…"]["Returns"][number]` / `["Args"]`
    (`src/entities/event/model/types.ts:18`), never hand-written (ADR 0015).
  - **Fetcher unit-test idiom** — `src/entities/event/api/queries.test.ts:77` `rpcReturning` mock records
    `(name, args)` and asserts the exact RPC name + argument bag, rows-on-success, zeros/`[]` on null,
    throw-on-error. This is how every 0084 RPC is proven at the JS boundary.
  - **Fetching-widget shape (trends-explorer)** — `TrendsExplorer.tsx:34` is the `"use client"` island:
    nuqs URL-state (ADR 0027) → Zod-validated query (ADR 0017) → RPC-arg builders → TanStack Query hooks
    (`api/use-trends.ts`) → **presentational** visx chart segments that receive `isPending/isError/empty`
    as props and never fetch (ADR 0086). Query keys are built in `src/lib/query/keys.ts:28`, keyed by the
    exact arg bag; controls reuse `ComboField` from `@/shared/ui`.
  - **Presentational visx chart** — `TrendsChart.tsx:1`: fixed `viewBox`, `aspect-ratio` box, every color a
    `var(--color-viz-*)` token (ADR 0058/0081), reduced-motion `MotionIn`, `role="img"` + a summary
    `aria-label`, and a `Message` state box for loading/empty/error. Charts from `@/components/charts`.
  - **Console primitives already shipped (Phase A/B/C, all on `dev` except CategoryPill on the Phase-C
    branch)** — `Panel` (`src/components/ui/panel.tsx`, surface elevation), `MetricHero`
    (`metric-hero.tsx`, the large KPI value at the `metric-hero` type role), `MonoData` (`mono-data.tsx`,
    inline tabular value, tone primary/secondary **only** — never tertiary for small text, the palette
    trap), `StatusIndicator` (`status-indicator.tsx`, a severity pill: nominal/caution/warning/critical),
    `Hairline`, `TelemetryStat`. The KPI/pacing/signal components **compose these**; they are
    widget-internal `ui/` segments, **not** new kit primitives (contrast Phase C's CategoryPill).
  - **The Overview route already exists** — `src/app/[locale]/(app)/p/[projectId]/page.tsx:20` is a Server
    Component rendering the project header + `ProjectHub` (`src/widgets/app-shell/ui/ProjectHub.tsx:18`, a
    re-skinned grid of nav cards to the other surfaces). `sections.ts:42` already has the `overview`
    section (segment `""`). **No `sections.ts` change is needed** — Phase D changes the route's _content_.
  - **Seed data (`supabase/seed.sql`)** — events `page_view` / `sign_up` / `purchase`, purchases carry
    `properties.amount` (+ `plan`/`country`/`device`); `profiles` carry `traits`. These are the columns the
    KPI math reads.
  - **Storybook** — the theme toolbar drives both `.dark` and `[data-theme]` (`.storybook/preview.tsx`,
    wired in Phase B); default composition is **light**, `globals: { theme: "dark" }` forces dark;
    `a11y.test: "error"` (axe WCAG 2.2 AA, ADR 0039). Only ONE locale catalog: `messages/en.json`.
- Callers / reverse-deps:
  - The only caller of the changed surface is the Overview page
    (`src/app/[locale]/(app)/p/[projectId]/page.tsx`), which gains an `<OverviewDashboard>` mount above the
    retained `<ProjectHub>`. No other module imports the new widget. The new RPCs have no other consumer.
  - `src/entities/event/index.ts` re-exports the entity's public surface (fetchers + types) — the two new
    fetchers/types are added there so the widget imports them through the entity's public API (ADR 0066).
- Constraints:
  - **No aggregation in application code (ADR 0084).** All summation/grouping lives in the two RPCs.
    KPI **ratios and deltas** (conversion = purchasers/active*users, ARPU = value_sum/active_users, delta =
    (cur−prev)/prev, pacing = value_sum/value_sum_prev) are **presentation over already-reduced scalars** —
    the \_exact* posture ADR 0087/0088 fix ("a ratio of two already-reduced counts is presentation, not SQL
    reduction"). `deriveKpis` does only division of returned scalars; it never reduces rows.
  - **Token/contrast/boundary gates (ADR 0099/0058/0092/0066/0060).** No shadcn `bg-card`/`bg-background`
    in the widget, no raw color/size literals; the mission-control surface/text set pairs only with itself
    for AA (the palette trap — small text uses `--text-secondary`, never `--text-tertiary`); light + dark
    stories hold `check:contrast`; FSD downward-only, a widget imports no other widget.
  - **RPC verification (no NEW harness).** There is no pgTAP runner, but the repo already has a Playwright
    **e2e SQL-fixture harness** that proves each windowed aggregation RPC's math + ADR 0083 isolation over the
    seed — `e2e/funnels.spec.ts`, `e2e/retention.spec.ts`, `e2e/trends.spec.ts`, `e2e/segments.spec.ts` (sign
    in as a seeded member, call `.rpc(...)`, assert tenant-scoped properties + a non-member gets zeros). The
    novel `_prev` adjacent-window logic is exactly the kind of reduction those precedents cover, so Phase D
    **adopts that existing harness** (`e2e/overview.spec.ts`) alongside the fetcher-level unit tests and the
    `supabase-rls-reviewer` — no new tooling (the events-explorer summary RPCs skipped e2e; the windowed
    aggregation RPCs did not, and this is one).
- Sibling specs: `.marvin/task/001-console-phase-b-app-shell-reskin.md` (shipped, PR #35 — the primitives
  - Storybook theme toolbar), `.marvin/task/002-console-phase-c-events-explorer-reskin.md` (the Phase-C
    events-explorer re-skin + CategoryPill; on the current branch, PR #36 — **not a dependency**: Phase D
    reuses only Phase-A/B primitives, which are on `dev`).

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: supabase/migrations/20260714120000_create_overview_kpis.sql
    action: new
    intent: >-
      Two SECURITY INVOKER aggregation RPCs (ADR 0084), mirroring the fn_events_summary / fn_event_trends
      idiom (language sql, stable, security invoker, set search_path='', schema-qualified public.events,
      revoke execute from public/anon + grant execute to authenticated; no new table/policy/GRANT beyond
      these two functions). (1) public.fn_overview_kpis(p_project_id uuid, p_from timestamptz, p_to
      timestamptz) returns table(active_users bigint, active_users_prev bigint, new_signups bigint,
      new_signups_prev bigint, purchasers bigint, purchasers_prev bigint, value_sum numeric, value_sum_prev
      numeric) — the "_prev" columns are the SAME reductions over the equal-length preceding window
      [p_from - (p_to - p_from), p_from); active_users = count(distinct distinct_id) over any event;
      new_signups = count(distinct distinct_id) where event_name='sign_up'; purchasers = count(distinct
      distinct_id) where event_name='purchase'; value_sum = sum of numeric properties->>'amount' for
      purchases (jsonb_typeof gate as in fn_events_summary). (2) public.fn_overview_signal(p_project_id
      uuid, p_from timestamptz, p_to timestamptz, p_interval text) returns setof(bucket timestamptz,
      active_users bigint, new_signups bigint, value_sum numeric) — per-bucket reductions via
      date_trunc(p_interval, e.ts) (mirror fn_event_trends interval handling), ordered by bucket. The
      'sign_up'/'purchase' literals are the demo's canonical event names (documented Assumption).
    satisfies: [AC1, AC10]
  - id: F2
    path: src/lib/supabase/database.types.ts
    action: edit
    intent: >-
      Regenerated by `npm run gen:types` after F1 (never hand-edited); adds the fn_overview_kpis /
      fn_overview_signal Args + Returns signatures. Committed so the CI type-drift gate stays green (ADR 0015).
    satisfies: ["—"]
    anchor: src/lib/supabase/database.types.ts:1
  - id: F3
    path: src/entities/event/model/types.ts
    action: edit
    intent: >-
      Add OverviewKpis / OverviewKpisArgs / OverviewSignalBucket / OverviewSignalArgs derived from the
      generated Functions["fn_overview_kpis"|"fn_overview_signal"]["Returns"][number] | ["Args"] (ADR 0015),
      with the same doc-comment style as EventsSummary.
    satisfies: [AC2]
    anchor: src/entities/event/model/types.ts:18
  - id: F4
    path: src/entities/event/api/queries.ts
    action: edit
    intent: >-
      Add fetchOverviewKpis(supabase, args: OverviewKpisArgs): unwrap data?.[0] ?? a zeros row (mirror
      fetchEventsSummary), throw on error; and fetchOverviewSignal(supabase, args: OverviewSignalArgs):
      return data ?? [], throw on error. Both call supabase.rpc('fn_overview_kpis'|'fn_overview_signal',
      args), forward the arg bag verbatim, and perform NO client-side reduction (ADR 0084).
    satisfies: [AC2]
    anchor: src/entities/event/api/queries.ts:132
  - id: F5
    path: src/entities/event/api/queries.test.ts
    action: edit
    intent: >-
      Add describe blocks for fetchOverviewKpis + fetchOverviewSignal using the existing rpcReturning mock:
      assert the exact RPC name + argument bag, rows/row on success, zeros (kpis) / [] (signal) on null,
      and throw-on-error (no swallowing).
    satisfies: [AC2]
    anchor: src/entities/event/api/queries.test.ts:426
  - id: F6
    path: src/entities/event/index.ts
    action: edit
    intent: >-
      Re-export the two new fetchers and four new types from the event entity's public API (ADR 0066) so the
      widget reaches them through the slice's index.ts, never a deep import.
    satisfies: [AC2]
    anchor: src/entities/event/index.ts:1
  - id: F7
    path: src/lib/query/keys.ts
    action: edit
    intent: >-
      Add an `overview` key factory (all / kpis(args) / signal(args)) keyed by the exact RPC argument bag,
      following the trends/events convention (a control change is a distinct cache entry; overview.all
      cascades). No inline key literals at call sites.
    satisfies: [AC3]
    anchor: src/lib/query/keys.ts:28
  - id: F8
    path: src/widgets/overview-dashboard/index.ts
    action: new
    intent: Public API of the widget slice (ADR 0065/0066) — export { OverviewDashboard }.
    satisfies: [AC3]
  - id: F9
    path: src/widgets/overview-dashboard/model/window.ts
    action: new
    intent: >-
      The window model: RANGES = ['7d','30d','90d'] (default '30d'); resolveWindow(range, now) → {from, to}
      as UTC-day-floored ISO strings (stable within a day so query keys don't thrash, mirror
      trends resolveWindow); signalInterval(range) → 'day' | 'week'; toKpisArgs(range, projectId, now) and
      toSignalArgs(range, projectId, now) building the typed arg bags; nuqs parsers + a Zod schema (ADR
      0017/0027) for the single `range` URL param. The equal-length previous window is computed in SQL (F1),
      not here — this module only bounds the CURRENT [from,to).
    satisfies: [AC3, AC6]
  - id: F10
    path: src/widgets/overview-dashboard/model/window.test.ts
    action: new
    intent: >-
      Unit tests: resolveWindow yields a from/to whose span equals the range length and to is the UTC-day
      floor of now; toKpisArgs/toSignalArgs emit the exact typed bags (p_project_id/p_from/p_to[/p_interval]);
      an out-of-range URL value falls back to the '30d' default via the Zod schema.
    satisfies: [AC6]
  - id: F11
    path: src/widgets/overview-dashboard/model/kpis.ts
    action: new
    intent: >-
      The KPI presentation layer (NOT aggregation — division of already-reduced scalars, per ADR 0087/0088):
      a KPI descriptor registry (id, i18n label key, format kind count|currency|percent, delta polarity) and
      a pure deriveKpis(data: OverviewKpis) computing, for ALL FOUR delta-bearing KPIs, { value, deltaRatio |
      null }. The two count KPIs: activeUsers value = active_users, delta = (active_users − active_users_prev)
      / active_users_prev; newSignups likewise from new_signups/_prev. The two ratio KPIs are ratios of
      already-reduced scalars AND their delta is the ratio-of-ratios: conversion value =
      purchasers/active_users, deltaRatio = (conversion − conversion_prev)/conversion_prev with conversion_prev
      = purchasers_prev/active_users_prev; arpu value = value_sum/active_users, deltaRatio computed the same way
      from value_sum_prev/active_users_prev. Pacing is separate (PacingCard): pacingRatio = value_sum /
      value_sum_prev. Every division guards a zero denominator → null (the card renders '—', no delta chip).
    satisfies: [AC4]
  - id: F12
    path: src/widgets/overview-dashboard/model/kpis.test.ts
    action: new
    intent: >-
      Unit tests for deriveKpis: conversion/ARPU/deltas/pacing on known scalars; divide-by-zero →
      null (no NaN/Infinity leaks); delta sign correct for growth and decline.
    satisfies: [AC4]
  - id: F13
    path: src/widgets/overview-dashboard/api/use-overview.ts
    action: new
    intent: >-
      TanStack Query hooks useOverviewKpis(args) / useOverviewSignal(args) wrapping the entity fetchers via
      the browser client, keyed by queryKeys.overview.kpis/signal(args) (ADR 0025/0084/0013). No "use
      client" here — the directive lives on the leaf (ADR 0002). The hooks own no aggregation.
    satisfies: [AC3]
  - id: F14
    path: src/widgets/overview-dashboard/ui/KpiCard.tsx
    action: new
    intent: >-
      Presentational KPI card: Panel (surface=panel) + MetricHero (the value at the metric-hero role) + a
      label (--text-secondary) + a delta rendered via StatusIndicator (nominal for a favorable delta,
      caution/critical for unfavorable; polarity per descriptor) with the signed % in MonoData. Props:
      { label, value: string, deltaRatio: number | null, isLoading?, isError? }. Renders a loading, an
      empty ('—'), and an error state; owns no fetching. Mission-control tokens only.
    satisfies: [AC5, AC7]
  - id: F15
    path: src/widgets/overview-dashboard/ui/KpiCard.stories.tsx
    action: new
    intent: >-
      CSF3 stories (light default + a Dark story via globals:{theme:'dark'}): Positive delta, Negative
      delta, NoDelta, Loading, Empty, Error — the axe surface for the card in BOTH compositions.
      Presentational → no play.
    satisfies: [AC7]
  - id: F16
    path: src/widgets/overview-dashboard/ui/PacingCard.tsx
    action: new
    intent: >-
      Presentational goal-pacing gauge: Panel + the pace % (MetricHero/MonoData) + a token'd progress bar (a
      --surface-elevated track + a --status-nominal/-caution fill whose width is a computed style, not a raw
      color/size literal — the GroupRollup scaled-bar precedent) comparing value_sum to value_sum_prev.
      Props: { pacingRatio: number | null, isLoading?, isError? }. Loading/empty/error states; no fetching.
    satisfies: [AC5, AC7]
  - id: F17
    path: src/widgets/overview-dashboard/ui/PacingCard.stories.tsx
    action: new
    intent: >-
      CSF3 stories (light + Dark): AheadOfPace, BehindPace, Loading, Empty, Error — axe in both compositions.
      Presentational → no play.
    satisfies: [AC7]
  - id: F18
    path: src/widgets/overview-dashboard/ui/SignalChart.tsx
    action: new
    intent: >-
      Presentational visx area/line sparkline of one fn_overview_signal measure (a chosen column: active
      users, sign-ups, or revenue). Mirror TrendsChart's STRUCTURE only — fixed viewBox, aspect-ratio box,
      the line/area color a var(--color-viz-*) token, reduced-motion MotionIn, a state Message box — but NOT
      its chrome tokens: TrendsChart is a Phase-E target still on the shadcn value layer (its Message uses
      text-muted-foreground/text-destructive/border-border and its axes use var(--color-border)/
      var(--color-muted-foreground)); SignalChart's own chrome (message text, any axis/tick if drawn, focus
      ring) uses mission-control tokens (--text-secondary / --status-critical-fg / --border-hairline). NON-
      INTERACTIVE: a single role="img" + a summary aria-label, NO per-datum labels and NO live region (the
      chart-a11y single-announcement rule). Props: { data, measure, label, isLoading?, isError? }; owns no
      fetching/aggregation.
    satisfies: [AC5, AC7]
  - id: F19
    path: src/widgets/overview-dashboard/ui/SignalChart.stories.tsx
    action: new
    intent: >-
      CSF3 stories (light + Dark): WithData, Loading, Empty, Error — axe in both compositions. Deterministic
      seeded data for Chromatic (fixed viewBox, no measurement). Presentational → no play.
    satisfies: [AC7]
  - id: F20
    path: src/widgets/overview-dashboard/ui/OverviewDashboard.tsx
    action: new
    intent: >-
      The "use client" fetching container + bento layout. Reads the nuqs `range` (Zod-validated), builds the
      arg bags (F9), calls useOverviewKpis + useOverviewSignal (F13), runs deriveKpis (F11), and lays out a
      responsive bento grid of the FIVE KPIs: four KpiCards (active users, new sign-ups, conversion, ARPU) +
      the PacingCard (goal pacing), plus the SignalChart(s) fed the signal rows, and a range ComboField
      control (from @/shared/ui). Threads isPending/isError/empty into the presentational children (they never
      fetch, ADR 0086). All copy via useTranslations('Overview') (ADR 0030). Mission-control tokens only.
    satisfies: [AC3, AC5, AC8]
  - id: F21
    path: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx
    action: new
    intent: >-
      Behavior test (mirror EventsExplorer.test: mock @/entities/event fetchers via importOriginal + mock
      @/lib/supabase/client; REAL hooks run under QueryClientProvider + NextIntlClientProvider +
      NuqsTestingAdapter): (a) the hooks are called with the derived window arg bags; (b) rendered KPI values
      match deriveKpis over the mocked reduced rows (no client re-aggregation); (c) loading, error, and empty
      states are threaded to the cards/charts.
    satisfies: [AC3, AC4, AC5]
  - id: F22
    path: src/app/[locale]/(app)/p/[projectId]/page.tsx
    action: edit
    intent: >-
      Mount <OverviewDashboard projectId={projectId} /> as the hero above the retained <ProjectHub />, which
      moves under an "Explore" section heading (t('exploreHeading')). The page stays a Server Component (the
      widget is the client island). ALSO re-skin the page header off the shadcn value layer onto
      mission-control (it renders on AppShell's --surface-background, so the current text-foreground /
      text-muted-foreground / <Badge variant="outline"> is the half-mix ADR 0099 forbids and the palette trap
      that failed AA in Phase B): title text-foreground → text-text-primary; the org/lead
      text-muted-foreground → text-text-secondary (NEVER -tertiary for small text); the role Badge is themed
      THROUGH the surface at the call site (never forked), matching ProjectHub. These are AA-verified
      mission-control pairs; the page fetches so it is not storied — contrast is held by the correct token
      pairs + the human Chromatic re-baseline.
    satisfies: [AC7, AC9]
    anchor: src/app/[locale]/(app)/p/[projectId]/page.tsx:48
  - id: F23
    path: messages/en.json
    action: edit
    intent: >-
      Add the `Overview` namespace (title/lead, the five KPI labels + units, the delta a11y labels, the
      signal-chart labels, the range option labels, loading/empty/error copy) and the ProjectOverview
      `exploreHeading` key, authored via the add-translation discipline (ICU intact, key parity — one
      catalog, ADR 0030/0055).
    satisfies: [AC9]
    anchor: messages/en.json:1
  - id: F24
    path: docs/capcom/console-redesign-progress.md
    action: edit
    intent: >-
      Update the Phase D row to ✅ done (PR + date), add the dated Phase-D log entry (what landed, gate
      results incl. contrast both themes / axe / tokens / coverage, Chromatic re-baseline status), and
      rewrite the Resume point to Phase E. REQUIRED before the PR (working agreement).
    satisfies: ["—"]
    anchor: docs/capcom/console-redesign-progress.md:27
  - id: F25
    path: e2e/overview.spec.ts
    action: new
    intent: >-
      In-database KPI aggregation e2e test (the executable "RLS test on the new RPCs", mirroring
      e2e/funnels.spec.ts / retention.spec.ts): sign in as a seeded member (bob@capcom.dev @ Aurora), call
      fn_overview_kpis + fn_overview_signal over a PINNED window (so assertions don't drift with the wall
      clock), and assert tenant-scoped PROPERTIES not exact magnitudes — active_users > 0; purchasers ≤
      active_users and new_signups ≤ active_users (subset invariants); value_sum ≥ 0; signal buckets fall
      inside [from,to), are ordered, and none exceeds the window total. Prove the "_prev" crux by an
      identity: fn_overview_kpis over [from,to) returns "_prev" columns EQUAL to a second call whose CURRENT
      window is the adjacent preceding span [from−(to−from), from) — this pins the equal-length adjacent
      window (off-by-one / overlap / wrong-length all fail). Cross-tenant isolation (ADR 0083, inherited via
      SECURITY INVOKER): carol@capcom.dev (owner @ Globex, non-member @ Aurora) gets all-zero kpis / no
      signal rows for AURORA with NO error, and non-zero for her own GLOBEX project. Requires
      `npm run db:reset` + `SEED_EVENTS_ANCHOR=… npm run seed:events` (documented in the file header, like
      funnels.spec.ts). Runs locally via `npm run test:e2e` (bootstrap-deferred from CI, CLAUDE.md).
    satisfies: [AC10]
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
    F13,
    F8,
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
    F25,
    F24,
  ]
depends_on: []
contract:
  kind: function
  signature: |
    -- new SECURITY INVOKER RPCs (ADR 0084), invoked as supabase.rpc(...)
    public.fn_overview_kpis(p_project_id uuid, p_from timestamptz, p_to timestamptz)
      returns table(active_users bigint, active_users_prev bigint,
                    new_signups bigint, new_signups_prev bigint,
                    purchasers bigint, purchasers_prev bigint,
                    value_sum numeric, value_sum_prev numeric)   -- one row
    public.fn_overview_signal(p_project_id uuid, p_from timestamptz, p_to timestamptz, p_interval text)
      returns table(bucket timestamptz, active_users bigint, new_signups bigint, value_sum numeric)
    // entity fetchers (forward the arg bag; no client reduction)
    fetchOverviewKpis(supabase, args: OverviewKpisArgs): Promise<OverviewKpis>          // throws on rpc error
    fetchOverviewSignal(supabase, args: OverviewSignalArgs): Promise<OverviewSignalBucket[]>  // throws on rpc error
    // widget entry
    OverviewDashboard({ projectId }: { projectId: string }): JSX.Element
criteria:
  - id: AC1
    statement: >-
      Given a signed-in member and a non-member, when each calls fn_overview_kpis / fn_overview_signal for a
      project, then both functions run SECURITY INVOKER with search_path='' and authenticated-only EXECUTE so
      the member gets reduced rows and the non-member gets zeros / no rows under the ADR 0083 membership-join
      RLS — no privilege-escalating path.
    implemented_by: [F1]
    oracle:
      kind: prose-review
    failure: >-
      SECURITY DEFINER, an unpinned search_path, EXECUTE granted to anon/public, a new table/policy, or a
      reduction that depends on a client-supplied tenant id — any would break tenant isolation.
  - id: AC2
    statement: >-
      Given the two RPCs, when fetchOverviewKpis / fetchOverviewSignal are called, then each invokes
      supabase.rpc with the exact function name and the exact typed argument bag, unwraps the single kpis row
      (or zeros) / the signal rows (or []), and throws on error — performing no client-side reduction.
    implemented_by: [F3, F4, F5, F6]
    oracle:
      kind: test
      ref: src/entities/event/api/queries.test.ts::fetchOverviewKpis calls the fn_overview_kpis RPC with the exact name and argument bag
    failure: A wrong fn name, a dropped/renamed arg, a client-side reduce, or a swallowed error.
  - id: AC3
    statement: >-
      Given the widget, when OverviewDashboard mounts, then it fetches through useOverviewKpis /
      useOverviewSignal keyed by queryKeys.overview.*(args) built from the nuqs `range`, and the presentational
      children receive reduced rows as props (no fetching or key literals in the children).
    implemented_by: [F7, F8, F9, F13, F20, F21]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx::queries the KPI and signal RPCs with the derived window args
    failure: Inline key-array literals, a child that fetches, or the hooks called with the wrong arg bag.
  - id: AC4
    statement: >-
      Given a fn_overview_kpis row, when deriveKpis runs, then it yields values conversion =
      purchasers/active_users and ARPU = value_sum/active_users; a deltaRatio for each of the four KPIs — the
      count KPIs as (current−previous)/previous, the ratio KPIs as (ratio−ratio_prev)/ratio_prev where
      ratio_prev uses the "_prev" scalars (conversion_prev = purchasers_prev/active_users_prev, arpu_prev =
      value_sum_prev/active_users_prev); and pacingRatio = value_sum/value_sum_prev — with every zero
      denominator guarded to null (no NaN/Infinity). A pure presentation function (a ratio of already-reduced
      scalars, ADR 0087/0088), not aggregation.
    implemented_by: [F11, F12, F21]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/model/kpis.test.ts::derives conversion, ARPU, deltas, and pacing and guards divide-by-zero
    failure: A NaN/Infinity leaking to the UI, an inverted delta sign, a ratio-delta computed from raw counts instead of the prev ratios, or a wrong ratio.
  - id: AC5
    statement: >-
      Given the KPI/pacing/signal components, when data is loading, empty, or errored, then each renders a
      distinct loading, empty ('—' / no-data), and error state, and OverviewDashboard threads
      isPending/isError/empty down without crashing.
    implemented_by: [F14, F16, F18, F20, F21]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/ui/OverviewDashboard.test.tsx::threads loading, error, and empty states to the cards and charts
    failure: A perpetual spinner, a crash on an empty dataset, or a swallowed error.
  - id: AC6
    statement: >-
      Given a selected range, when the args are built, then resolveWindow yields a current [from,to] whose
      span equals the range length with `to` at the UTC-day floor of now, and toKpisArgs/toSignalArgs emit the
      exact typed arg bags; an out-of-range URL value falls back to the '30d' default via the Zod schema.
    implemented_by: [F9, F10]
    oracle:
      kind: test
      ref: src/widgets/overview-dashboard/model/window.test.ts::resolves the range to an equal-length current window and emits the typed arg bags
    failure: A current window whose span ≠ the range, an un-floored `to` that thrashes the query key, or a bad URL value that is not defaulted.
  - id: AC7
    statement: >-
      Given the new presentational components with their dark and light stories, when the token and contrast
      gates run, then they use only allowlisted mission-control semantic tokens (no shadcn bg-card/bg-background,
      no raw color/size literals) and the status/text-on-surface pairs clear WCAG 2.2 AA in BOTH compositions.
    implemented_by: [F14, F15, F16, F17, F18, F19, F20, F22]
    oracle:
      kind: command
      ref: npm run check:tokens && npm run check:contrast && npm run test
    failure: A shadcn foreground on a --surface bg failing AA — caught by the dark/light axe story under `npm run test` (the Storybook browser project), NOT by check:tokens/check:contrast — or a raw literal flagged by check:tokens.
  - id: AC8
    statement: >-
      Given the widget, when the FSD boundary gates run, then it imports only downward (entities/event,
      components/ui, components/charts, shared/ui, lib/query) and imports no other widget, and no new
      src/components/ui kit primitive is introduced (no composition-graph/design-intent change).
    implemented_by: [F8, F13, F14, F16, F18, F20]
    oracle:
      kind: command
      ref: npm run check:fsd
    failure: A widget→widget import, an upward import, or a new primitive added without graph registration.
  - id: AC9
    statement: >-
      Given the Overview route, when it renders, then the OverviewDashboard bento is the hero above the
      retained ProjectHub (under an "Explore" heading) and all new copy resolves from the Overview i18n
      namespace with key parity intact.
    implemented_by: [F22, F23]
    oracle:
      kind: command
      ref: npm run check:i18n
    failure: A hard-coded string, a missing/orphan i18n key, or ProjectHub dropped from the overview page.
  - id: AC10
    statement: >-
      Given the seeded local database, when a member calls fn_overview_kpis / fn_overview_signal over a pinned
      window, then the reductions hold their tenant-scoped invariants (active_users > 0; purchasers ≤
      active_users; new_signups ≤ active_users; value_sum ≥ 0; signal buckets inside the window and ordered),
      the "_prev" columns EQUAL a second call whose current window is the adjacent preceding span (pinning the
      equal-length adjacent window), and a non-member gets all-zero kpis / no signal rows with NO error while
      seeing non-zero for their own tenant — proving the reduction math and the ADR 0083 isolation at runtime.
    implemented_by: [F1, F25]
    oracle:
      kind: test
      ref: e2e/overview.spec.ts::fn_overview_kpis reductions, the _prev adjacent-window identity, and cross-tenant isolation
    failure: A wrong reduction, a "_prev" window of a different length/overlapping the current, or a non-member seeing another tenant's numbers (or an error instead of zeros).
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "console-redesign-progress.md updated (Phase D row + log + resume→Phase E) BEFORE the PR"
  - "gen:types regenerated + committed (database.types.ts drift gate green)"
  - "gen:tokens swap-only self-test unchanged — no new tokens, no per-theme semantic overrides"
  - "check:contrast green in both compositions (ADR 0099 confirmation)"
  - "check:tokens green over src/components + src/widgets + src/shared"
  - "check:design-system green (no new graph/design-intent nodes — none added this phase)"
  - "check:i18n key parity (ADR 0055)"
  - "supabase-rls-reviewer clean on the migration (SECURITY INVOKER / search_path / GRANTs)"
  - "e2e/overview.spec.ts green locally (npm run test:e2e after db:reset + seed:events) — the KPI/_prev/isolation proof"
  - "human-approved Chromatic visual re-baseline (ADR 0043/0095 — agent never approves its own)"
  - "Conventional Commits (commitlint); single human-reviewed PR into dev; no AI attribution"
gates:
  test: npm run test
```

## Data & Config

- **Migration (forward):** `supabase/migrations/20260714120000_create_overview_kpis.sql` adds the two
  `SECURITY INVOKER` functions and their least-privilege GRANTs. **No new table, policy, index, or column** —
  the functions read `public.events` under the existing ADR 0083 RLS (a non-member's call reduces zero rows).
  The exact filename timestamp is stamped at creation; the slug `create_overview_kpis` is the identity.
- **Rollback:** `drop function if exists public.fn_overview_kpis(uuid, timestamptz, timestamptz);` and
  `drop function if exists public.fn_overview_signal(uuid, timestamptz, timestamptz, text);` — no data
  migration to reverse (functions only). Local: `npm run db:reset`.
- **Codegen:** `npm run gen:types` after the migration regenerates `src/lib/supabase/database.types.ts`
  (CI drift gate). No env vars, feature flags, or config keys.
- **Demo data (not schema):** meaningful KPI/sparkline/`_prev` volume comes from the dense generator
  `scripts/seed-events.mjs` (`npm run seed:events`), not the sparse base `supabase/seed.sql`. A bare
  `db:reset` alone leaves the Overview mostly `'—'` (null deltas, empty sparklines) — a data condition the
  empty-state coverage handles, not a defect. `e2e/overview.spec.ts` requires
  `SEED_EVENTS_ANCHOR=… npm run seed:events` (pinned anchor, like `funnels.spec.ts`).

## Chosen Approach

A single reviewable PR delivering the Overview home as a curated bento, foundation-first behind the gates:

1. **Two aggregation RPCs (ADR 0084).** `fn_overview_kpis` returns one row with each KPI's reduced scalar
   for **both** the current window and the equal-length preceding window (`*_prev`) — so all five KPIs, all
   deltas, and goal-pacing come from a single call; `fn_overview_signal` returns per-bucket reduced rows for
   the sparklines. Both mirror the shipped `fn_events_summary`/`fn_event_trends` idiom exactly. `gen:types`
   types them.
2. **Entity layer.** Two fetchers on the `event` entity (the home of every 0084 aggregation fetcher) forward
   the typed arg bag and reduce nothing; four generated-derived types; mock-rpc unit tests; a query-key
   factory.
3. **Widget `overview-dashboard`.** A `"use client"` fetching container (nuqs `range` → Zod → arg bags →
   TanStack hooks → `deriveKpis`) laying out a bento of **presentational** children: `KpiCard` (×4),
   `PacingCard`, `SignalChart`. The children compose the shipped Phase-A/B primitives (`Panel`,
   `MetricHero`, `MonoData`, `StatusIndicator`) and the `@/components/charts` visx layer — **no new kit
   primitive**, so the composition-graph/design-intent surface is untouched. KPI ratios/deltas/pacing are
   **presentation over already-reduced scalars** (ADR 0087/0088 precedent), not aggregation.
4. **Page wiring.** The Server-Component Overview route mounts the widget as the hero and keeps `ProjectHub`
   below under an "Explore" heading.
5. **Gates + docs.** dark+light stories (axe), `check:contrast` both themes, `check:tokens`, FSD boundaries,
   `check:i18n`, coverage ≥80%; progress doc updated; human Chromatic re-baseline.

**Stack compliance:** NATIVE — visx, TanStack Query, nuqs, Supabase RPC, the primitives, and the charts
layer are all present; the SQL migration follows the existing function idiom. No new dependency.
**Future alignment:** N/A — no VISION.md.

**Stack extensions required:** none.

## Why this over alternatives

- **One RPC per KPI (rejected, Q1):** 5–6 functions + a signal fn multiplies the SQL surface, the fetcher
  tests, and the type churn for no expressive gain — one row of scalars powers every card and delta.
- **Reuse existing RPCs — compose the Overview from fn_events_summary + fn_funnel + fn_event_trends
  (rejected, Q1):** couples the curated home to other surfaces' semantics (funnel windows, trends breakdown)
  and departs from ADR 0099's explicit "new SECURITY INVOKER RPCs" intent; the two purpose-built functions
  are cleaner and independently reviewable.
- **Seeded constant goal target (rejected, Q2):** an arbitrary baked-in number is dishonest for a "real SQL"
  demo. Pacing against the previous same-length span is genuine SQL and always well-defined.
- **Replace ProjectHub entirely (rejected, Q3):** drops the in-page jump grid; keeping it below the bento
  preserves navigation while the KPIs become the curated home.
- **Verify the RPCs with prose-review only, no executable math proof (rejected — critic finding, refining
  Q4):** a **new** pgTAP harness is still out (scope), but the repo already has the Playwright e2e SQL-fixture
  harness that proves every windowed aggregation RPC (`e2e/funnels.spec.ts` et al.). The novel `_prev`
  adjacent-window logic is the error-prone crux; prose-review can confirm the security properties but cannot
  prove the window arithmetic. Phase D therefore **adopts the existing e2e harness** (`e2e/overview.spec.ts`,
  AC10) on top of the fetcher tests + `supabase-rls-reviewer` — matching the funnel/retention/trends
  precedent, adding no tooling.
- **Bake ratios/deltas into SQL (rejected):** ADR 0087/0088 fix ratios/percentages as _presentation_; the
  RPCs return counts, the widget divides — keeping the reduction in SQL and the ratio in the view.

## Test Plan

- **Harness:** Vitest (`npm run test` — the unit jsdom project + the Storybook browser project); coverage via
  `npm run test:coverage` (≥80%, ADR 0008). Story axe runs in the Storybook browser project (ADR 0039).
  Playwright (`npm run test:e2e`) for the in-database SQL-fixture test — bootstrap-deferred from CI, run
  locally against the seeded stack (CLAUDE.md), same as `funnels.spec.ts`.
- **Test locations:** colocated — `src/entities/event/api/queries.test.ts` (extend), and under the widget:
  `model/window.test.ts`, `model/kpis.test.ts`, `ui/OverviewDashboard.test.tsx`; stories `ui/*.stories.tsx`;
  the e2e fixture `e2e/overview.spec.ts`.
- **Conventions:**
  - RPC fetchers: the `rpcReturning` mock in `queries.test.ts` — assert `(name, args)`, success rows, null →
    zeros/[], throw-on-error.
  - Widget behavior: mirror `EventsExplorer.test.tsx` — `vi.mock('@/entities/event', importOriginal)` +
    `vi.mock('@/lib/supabase/client')`, run the REAL hooks under `QueryClientProvider` +
    `NextIntlClientProvider` (messages from `messages/en.json`) + `NuqsTestingAdapter`.
  - Pure model tests: plain Vitest over `deriveKpis` / window builders.
  - Stories: CSF3, light default + a `globals:{theme:'dark'}` Dark story each; deterministic seeded chart
    data for Chromatic; presentational → no `play`.
  - In-database SQL fixture (`e2e/overview.spec.ts`): mirror `funnels.spec.ts` — `signIn('bob@capcom.dev')`
    (member @ Aurora) and `signIn('carol@capcom.dev')` (non-member @ Aurora), pinned window constants, assert
    tenant-scoped invariants + the `_prev` adjacent-window identity + cross-tenant zeros. Requires
    `db:reset` + `seed:events`.
  - RLS: the `supabase-rls-reviewer` agent on the migration diff (static security properties, AC1) — the
    reduction math + runtime isolation are proven by the e2e test (AC10).

## Definition of Done

- [ ] `npm run test` green (new unit + story tests); `npm run test:coverage` ≥ 80%.
- [ ] `npm run test:e2e` green for `e2e/overview.spec.ts` locally (after `db:reset` + `seed:events`) — the
      in-database KPI/`_prev`/isolation proof (e2e is bootstrap-deferred from CI, CLAUDE.md).
- [ ] `tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run build` green.
- [ ] `npm run gen:types` run and `database.types.ts` committed (no drift).
- [ ] `npm run check:tokens` + `npm run check:contrast` green in **both** compositions.
- [ ] `npm run check:fsd` + `npm run check:boundaries` + `npm run check:graph` + `npm run
check:design-intent` green (no new kit primitive — graph/design-intent unchanged).
- [ ] `npm run check:i18n` key parity green; `gen:tokens` swap-only self-test unchanged (no new tokens).
- [ ] `supabase-rls-reviewer` clean on the migration.
- [ ] `docs/capcom/console-redesign-progress.md` updated (Phase D row + log + resume→Phase E) — **before the
      PR**.
- [ ] Human-approved Chromatic re-baseline (agent never approves its own, ADR 0043/0095).
- [ ] Single human-reviewed PR into `dev`; Conventional Commits; no AI attribution.

## Non-goals

- User-composed / saveable dashboards (that is ADR 0090's `reports`/`dashboards`; the Overview is the
  **curated** home, deliberately distinct).
- Any new token, per-theme semantic override, or new `src/components/ui` kit primitive.
- A goals/targets table or a write path for a configurable goal (pacing is derived from the prior span).
- A **new** test harness (pgTAP or otherwise), realtime, or materialized rollups (poll only, ADR 0012/0084)
  — the existing Playwright e2e harness is reused, not extended.
- Re-skinning `funnel-builder` / `retention-grid` / `segment-builder` / `trends` (Phase E) or the marketing/
  auth surfaces (deliberate seam, ADR 0099).
- Per-KPI drill-down, an interactive signal tooltip/crosshair, or additional KPI dimensions.
- Changing `sections.ts` (the `overview` nav section already exists).

## Assumptions

- The demo's canonical event names are `sign_up` and `purchase`, and purchase value is `properties.amount`
  (from `seed.sql`); the RPCs use these literals. First-touch-acquisition "new users" and a signup→purchase
  funnel-rate are alternative definitions, deliberately not chosen (recorded as boundaries).
- **Conversion = purchasers / active_users** ("share of active users who purchased") — bounded [0,1] and
  always defined; chosen over purchasers/new_signups to avoid small-denominator instability.
- **Goal pacing = value_sum(current span) / value_sum(previous equal-length span)** — >1 ahead of the prior
  span's pace, <1 behind; the "goal" is the prior span's revenue (no targets table).
- The default range is `30d` (7d/30d/90d offered); signal buckets are `day` (7d/30d) or `week` (90d).
- The KPI ratios/deltas are presentation (division of already-reduced scalars) — the ADR 0087/0088 posture —
  and therefore not a violation of "no aggregation in application code." The ratio-KPI **deltas** are the
  ratio-of-ratios ((cur−prev)/prev of the derived conversion/ARPU), computed from the `_prev` scalars in the
  same row — still two-scalar presentation, not a client reduction.
- Demo volume assumes `npm run seed:events` has run against the local stack; the empty/`'—'` state is the
  correct rendering when it has not.

## Open Questions

none

## Security / NFR

- **Auth/RLS (touched):** the RPCs are `SECURITY INVOKER` with pinned `search_path` and authenticated-only
  EXECUTE; tenant isolation is inherited from the ADR 0083 membership join (a non-member reduces zero rows).
  No service-role path; the client never supplies a tenant id. Static properties verified by
  `supabase-rls-reviewer` (AC1); the runtime isolation (a non-member gets zeros for a foreign tenant, non-zero
  for their own) is proven by `e2e/overview.spec.ts` (AC10).
- **Injection:** no dynamic SQL — the functions are static set-based queries with typed parameters; the
  fetchers pass typed arg bags through the Supabase client (no string assembly).
- **a11y/i18n:** WCAG 2.2 AA via `check:contrast` + the axe stories in both themes; all copy through
  next-intl (`Overview` namespace, key parity); the sparkline announces a single `role="img"` summary (no
  double-read).
- **Observability/rollout:** poll-based refresh (no realtime); the migration is additive and reversible by
  dropping the two functions. Performance: set-based reductions over the existing `(project_id, ts)` index at
  seeded-demo volume.

## Critic Verdict & Overrides

- **Round 1: BLOCK** (marvin-tm-spec-critic). Blocker: AC6's oracle (`window.test.ts`, a pure JS unit test)
  structurally could not prove the load-bearing SQL `_prev` adjacent-window computation — and the repo has an
  existing Playwright e2e SQL-fixture harness (`e2e/funnels.spec.ts` et al.) that proves exactly this class of
  RPC math, which the draft overlooked. **Resolved:** split AC6 (JS window only) and added **AC10 + F25
  `e2e/overview.spec.ts`** proving the reductions, the `_prev` adjacent-window identity, and cross-tenant
  isolation over the seed. All five warnings also addressed:
  1. F22 now re-skins the Overview page header off the shadcn value layer (the half-mix / palette trap the
     critic caught) instead of leaving it "unchanged";
  2. AC7's oracle now includes `npm run test` (the axe story run that actually catches a shadcn-fg-on-surface
     AA failure — `check:tokens`/`check:contrast` do not);
  3. F18 now says mirror TrendsChart's **structure**, not its (still-shadcn) chrome tokens;
  4. F11/F20/AC4 pin the KPI set (four KpiCards + PacingCard = five) and define the conversion/ARPU
     ratio-of-ratios deltas from the `_prev` scalars;
  5. Data & Config / Assumptions now name `npm run seed:events` as the demo-volume prerequisite.
- **Confirmed by the critic (no change needed):** the `deriveKpis` "presentation, not aggregation" defense is
  sound (ADR 0087 lines 101–104 bless a ratio of already-reduced scalars); the non-interactive `SignalChart`
  a11y choice correctly dodges the double-read; "widget-that-fetches is not storied" + "no new kit primitive"
  are correctly applied; the spec correctly overrides the stale resume-point note (the `overview` nav section
  already exists).
- **Round 2: PASS WITH WARNINGS** — blocker cleared (the AC6 split + AC10/F25 e2e proof verified against
  `e2e/funnels.spec.ts`; the `_prev` adjacent-window identity confirmed a sound magnitude-free proof; AC⇄files
  traceability clean). Two **disclosed limitations** (not defects), accepted:
  1. F22's header re-skin lives in `src/app`, which `check:tokens` does not scan and which has no axe story
     (the page fetches) — so its contrast rests on the AA-verified token pairs + the human Chromatic
     re-baseline, mirroring Phase B's accepted non-storied CommandPalette-portal residual.
  2. AC10's e2e oracle runs in the bootstrap-deferred local lane (`npm run test:e2e`), like every prior
     windowed-RPC e2e (funnels/retention/trends/segments) — enforced as a DoD checkbox + merge obligation,
     human-run, not a CI gate.
     The two cosmetic traceability asymmetries the critic flagged were tidied (F20 now `satisfies [AC3, AC5,
AC8]`; F22 dropped from AC8's scope → `satisfies [AC7, AC9]`). **Override:** proceeding with the two
     disclosed limitations recorded (no code change resolves them without extending the token-lint glob to
     `src/app` or promoting e2e into CI — both out of scope for this phase).

## Design Notes

- **The `_prev` columns are the crux.** Putting the previous-span reductions in the SAME RPC row is what
  keeps deltas and pacing as pure presentation (a ratio of two returned scalars) rather than a second query
  or a client-side reduction — the ADR 0087/0088 "ratio is presentation" line is the defense; state it in
  the PR so the diff-critic does not flag `deriveKpis` as app-code aggregation.
- **No new primitive on purpose.** Phase C added `CategoryPill` (a governed kit primitive with graph +
  design-intent). Phase D deliberately adds none — the cards/charts are widget-internal `ui/` segments — so
  `check:graph`/`check:design-intent` node counts are unchanged. If a card pattern later proves reusable
  across widgets, promoting it to `src/components/ui` is a separate, governed step.
- **Palette trap (carried from B/C).** `--text-tertiary` is not AA-guaranteed for small text; use
  `--text-secondary`. `check:tokens`/`check:contrast` do not catch a leftover shadcn foreground on a
  `--surface-*` bg — only the **axe story** does, so every new presentational component ships a dark **and**
  light story.
- **Widget-in-story mocking.** `OverviewDashboard` fetches, so (like `EventsExplorer`) it is **not** storied;
  the presentational children carry the axe coverage. Its wiring is proven by the behavior test.
- Keep `SignalChart` non-interactive (img + summary) to sidestep the per-datum-vs-live-region a11y choice; an
  interactive tooltip is a deferred enhancement.
- **Re-skin the page header too (F22).** The Overview page's own `<h1>`/org/lead/role-Badge are shadcn value
  layer (`text-foreground`, `text-muted-foreground`, `<Badge variant="outline">`) rendering on
  `--surface-background` — the exact half-mix that failed AA in Phase B (breadcrumb `--text-tertiary` 3.99:1).
  Swap them to `--text-primary` / `--text-secondary` and theme the Badge through the surface, matching the
  already-re-skinned `ProjectHub`. The page fetches so it is not storied; hold its contrast by the correct
  AA-verified token pairs + the human Chromatic re-baseline.
- **`e2e/overview.spec.ts` is the crux proof (F25/AC10).** Model it on `e2e/funnels.spec.ts`: seeded member
  emails `bob@capcom.dev` (Aurora) / `carol@capcom.dev` (Globex), the `AURORA_WEB_PROJECT` / `GLOBEX_PROJECT`
  uuids, `PASSWORD='password123'`, `signIn()` helper, PINNED window constants. The `_prev` identity —
  `fn_overview_kpis([from,to]).*_prev === fn_overview_kpis([from−span, from]).*` — is the cleanest way to pin
  the adjacent equal-length window without hard-coding magnitudes. Needs `db:reset` + `SEED_EVENTS_ANCHOR=…
npm run seed:events`.
- **Do NOT mirror TrendsChart's chrome tokens.** It is a Phase-E target still on shadcn tokens
  (`text-muted-foreground`, `var(--color-border)`); copy its _structure_ (fixed viewBox, token viz color,
  MotionIn, state box), not its chrome.

## Future Considerations

- **Phase E** re-skins the remaining analytics widgets (funnel/retention/segment/trends) and documents the
  marketing↔console palette seam — the last phase of the initiative.
- A configurable goal target (a `goals` table + write path under ADR 0090's RBAC) would replace the
  prior-span pacing baseline — its own ADR/spec.
- An interactive signal chart (tooltip/crosshair/brush via ADR 0093) and per-KPI drill-down deep-links into
  the analytics surfaces are natural follow-ups.
- Promoting a proven KPI-card pattern into a governed `src/components/ui` primitive (with graph +
  design-intent) if a second widget needs it.

## Delivery

- **PR:** [#37](https://github.com/real-case/capcom/pull/37) — `feat/console-phase-d-overview-dashboard` → `dev` (open, not merged).
- **Commits:** `6cb78f8` (implementation), `05bddaa` (progress-tracker PR record).
- **Reviews:** `supabase-rls-reviewer` CLEAN (AC1); `marvin-tm-diff-critic` PASS WITH WARNINGS (no blockers).
- **Verification:** all gates green — contrast (both compositions), axe (both compositions, 719 tests), tokens (0 errors), graph/design-intent (after the coupled `usedIn` reconciliation), i18n (413 keys), zero token drift, coverage 90.4%/82.97%/87.11%/92.5%, build; `e2e/overview.spec.ts` 4/4 (the `_prev` identity + isolation, live against the seeded DB).
- **Pending human gates:** review, Chromatic re-baseline (ADR 0043/0095), merge into `dev`.

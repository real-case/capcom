---
slug: console-phase-c-events-explorer-reskin
type: feature
status: in-progress
created: 2026-07-14
tracker: docs/capcom/console-redesign-progress.md (Phase C)
supersedes: none
stack: typescript
risk: medium
breaking: false
spike_required: false
test_command: npm run test
contract_sha: 5cc243d55ddc9485
---

# Console re-skin Phase C — events-explorer onto the mission-control surface (+ a governed CategoryPill)

## Goal

Move the shipped events-explorer flagship (`src/widgets/events-explorer`: the table, toolbar, facets,
tabs, menus, group roll-up, bulk bar, and expanded detail) off the neutral shadcn value layer onto the
mission-control instrument-panel surface so chrome and data read as one instrument (ADR 0099) — **behavior
unchanged** (the 0097/0098 filters / selection / saved views / density / group-by) — and extract one
governed **`CategoryPill`** kit primitive (a viz-categorical hued chip) that unifies the plan pill and the
group-roll-up label. Theme-aware (light/dark, ADR 0092), zero new tokens, zero new dependencies.

## Context

- Related patterns:
  - Phase-A/B primitives to consume — `Panel` (`src/components/ui/panel.tsx`, `surface` variant),
    `MonoData` (`src/components/ui/mono-data.tsx`, `tone` primary/secondary only), `Badge`
    (`src/components/ui/badge.tsx`). (`StatusIndicator` exists but is a severity pill — deliberately NOT
    adopted here; the stream dot stays a bare inline dot.)
  - The precedent for extracting a composite primitive is Phase B's `TelemetryStat`
    (`src/components/ui/telemetry-stat.tsx`, a `data-display` composite of MonoData + StatusIndicator) and
    the sealed spec `.marvin/task/001-console-phase-b-app-shell-reskin.md`.
  - Current shadcn-layer surface to swap (≈120 sites, `EventsTable` dominates at 65): `text-foreground`,
    `text-muted-foreground`, `border-border`, `bg-card`, `bg-muted[/40,/50]`, `bg-accent`/
    `text-accent-foreground`, `focus-visible:ring-ring`, `text-destructive`, `border-primary`,
    `accent-primary`, `text-primary`, and the plan `Badge`.
  - The token map is the Phase-B one: `text-foreground`→`text-text-primary`, `text-muted-foreground`→
    `text-text-secondary` (**never `-tertiary` for small text** — the palette trap), `border-border`→
    `border-border-hairline`, `bg-card`→`bg-surface-panel`, `bg-muted[/…]`→`bg-surface-elevated`,
    active `bg-accent text-accent-foreground`→`bg-surface-elevated text-text-primary`,
    `focus-visible:ring-ring`→`focus-visible:ring-text-primary` (Phase-B chrome precedent),
    `text-destructive`→`text-status-critical-fg`. The allowlist is generated
    (`src/design-system/tokens.agent-rules.md`), never re-listed in prose (ADR 0058).
  - **Already shipped, preserve, do not rebuild:** density is wired — `EventsExplorer.tsx:181` sets
    `data-density` and `EventsTable.tsx:131` reads the `--space-*` primitives (ADR 0082/0098). The viz
    colors are already token-clean — `eventHue` returns literal `var(--color-viz-categorical-*)`
    (`presentation.ts:15`), the roll-up bar `fill` uses it (`GroupRollup.tsx:88`); these stay.
  - Governance registries — archetypes `src/design-system/archetypes.ts` (`categorical-indicator` is
    badge/tag/chip; `data-display` added by ADR 0100), states `src/design-system/states.ts`
    (`categorical-indicator` mandates only the contentBounds axis), design-intent schema
    `src/design-system/design-intent.ts`, graph `src/design-system/composition-graph.json`.
  - Storybook: the theme toolbar drives BOTH `.dark` and `[data-theme]` (`.storybook/preview.tsx`, wired
    in Phase B); default composition is **light** (`context.globals.theme ?? "light"`), explicit
    `globals: { theme: "dark" }` stories force dark; `a11y.test: "error"` (axe at WCAG 2.2 AA, ADR 0039).
- Callers / reverse-deps (UNCHANGED — presentational, props stable): the mount is
  `src/app/[locale]/(app)/p/[projectId]/events/page.tsx:59` (`<EventsExplorer projectId=… />`). The
  re-skin adds no props → the route stays out of the allowlist. Behaviour tests
  (`EventsExplorer.test.tsx`, `EventsToolbar.test.tsx`, `BulkActionsBar.test.tsx`, `model/*.test.ts`)
  assert roles/text, **never classes** (grep-verified) → re-skin-safe.
- Constraints:
  - **Palette trap** (memory `capcom-token-palette-trap`): the mission-control surface/text set is AA
    only paired with itself; a leftover shadcn foreground on a `--surface-*` bg ≈ 1:1, caught by the
    **axe dark/light story**, not `check:tokens` / `check:contrast`. Hence the per-component stories
    (👤 decision) — the toolbar row (`EventsToolbar`/`FacetFilter`/`ViewTabs`/`SaveViewPopover`/
    `ColumnsMenu`/`GroupByMenu`/`GroupRollup`) is rendered only by the fetching `EventsExplorer`, so it
    has no axe coverage today; `EventsTable.stories` already covers the table + `BulkActionsBar` +
    `EventDetail` + `RelativeTime` transitively (in **light** via the default-theme stories; the **dark**
    composition of `BulkActionsBar`/`EventDetail` is covered by the `SelectedDark` and new `ExpandedDark`
    stories — F25).
  - **Badge-collision** (ADR 0059, the Phase-A StatusPill precedent): `Badge` is already
    `archetype: categorical-indicator`, `usageRole: categorical-status-indicator`,
    `compositionSignature []`. A new categorical leaf would be a structural duplicate. `CategoryPill`
    therefore **composes Badge** (`compositionSignature ["badge"]`, `kind composite`, `usageRole null`) —
    a distinct signature that reuses, not duplicates, the chip.
  - **Graph reconciliation** (`check:graph` / `check:design-intent`, ADR 0059/0060): every changed
    import edge must be mirrored in `composition-graph.json` and the affected `design-intent.ts`
    `meta.usedIn`. This is the #1 risk (as in Phase B), not the CSS.
  - The `src/components/ui` kit is outside FSD and imports no widget/app code; `CategoryPill` imports only
    `Badge` (a composite→primitive edge, the allowed direction, ADR 0060).
- Sibling specs: `.marvin/task/001-console-phase-b-app-shell-reskin.md` (Phase B, shipped — the
  primitives it added are already on `dev`). Phases D/E are downstream, not blockers.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: src/components/ui/category-pill.tsx
    action: new
    intent: "CategoryPill primitive — a governed viz-categorical hued chip. Composes Badge (variant=outline, themed THROUGH the mission-control surface via className: bg-surface-elevated / border-border-hairline / text-text-primary) with an optional leading hue dot. API: `CategoryPill({ hue?: string } & React.ComponentProps<'span'>)`; when `hue` is a var(--color-viz-*) token it renders the dot via inline style={{ background: hue }} (allowed — a variable, not a raw literal, ADR 0058; the eventHue precedent), label is children. Semantic tokens only; owns no external margin (ADR 0058)."
    satisfies: [AC1, AC3]
  - id: F2
    path: src/components/ui/category-pill.design-intent.ts
    action: new
    intent: "Typed design-intent (ADR 0062): kind composite, archetype categorical-indicator, compositionSignature ['badge'], composedOf ['badge'], meta.usedIn ['src/widgets/events-explorer/ui/EventsTable.tsx','src/widgets/events-explorer/ui/GroupRollup.tsx'] (mirrors the graph, F27), usageRole null; states = contentBounds axis (min-content/max-content/cjk applicable, line-wrap/truncation/rtl not, per the categorical-indicator registry — model on badge.design-intent.ts); presentational → no play (ADR 0038)."
    satisfies: [AC5]
  - id: F3
    path: src/components/ui/category-pill.stories.tsx
    action: new
    intent: "CSF3 stories (dark via globals:{theme:'dark'} + light default): Default (with a viz hue), NoHue (dot omitted), LongLabel (max-content contentBounds), CJK, and a Dark story — the axe surface for the primitive in both compositions. Presentational — no play."
    satisfies: [AC2]
  - id: F4
    path: src/components/ui/category-pill.test.tsx
    action: new
    intent: "Unit test: renders the label; with a viz `hue` renders a decorative (aria-hidden) dot carrying that hue and composes a Badge; without `hue` renders no dot; forwards className/aria."
    satisfies: [AC1]
  - id: F5
    path: src/widgets/events-explorer/ui/EventsTable.tsx
    action: edit
    intent: "Re-skin onto mission-control tokens (surfaces/text/border/rings per the map). Plan column Badge → CategoryPill (hue = eventHue(plan)); the value/user/country/time cells + the footer value + the pager page-count/live-rate → MonoData (mono-data role, tone primary/secondary); the event-name toggle keeps its inline eventHue dot + text (a toggle affordance, not a chip). The stream pulse dot STAYS a bare inline dot (its live branch is already the viz token var(--color-viz-categorical-3)); swap ONLY its paused-branch inline var(--color-muted-foreground) → a mission-control token via var() (aria-hidden, so no axe gate catches it). Drops the direct Badge import. No StatusIndicator (a severity pill is the wrong fit for a 2-state pulsing toggle dot). Behavior/markup/aria unchanged."
    satisfies: [AC2, AC3, AC4]
    anchor: src/widgets/events-explorer/ui/EventsTable.tsx:325
  - id: F6
    path: src/widgets/events-explorer/ui/EventsToolbar.tsx
    action: edit
    intent: "Swap text/border/ring tokens to mission-control; the search input and clear-all onto --surface/--text/--border-hairline; the removable filter chips keep Badge (variant=outline) themed THROUGH the surface at the call site (a removable filter token, deliberately NOT a CategoryPill). Behavior unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/EventsToolbar.tsx:98
  - id: F7
    path: src/widgets/events-explorer/ui/FacetFilter.tsx
    action: edit
    intent: "Swap text/border tokens; the count Badge (variant=secondary) and the Command/Popover reused primitives themed THROUGH the surface at the call site (never forked, ADR 0099); the facet-count text → mono/secondary. Behavior unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/FacetFilter.tsx:113
  - id: F8
    path: src/widgets/events-explorer/ui/BulkActionsBar.tsx
    action: edit
    intent: "Replace the `rounded-lg border border-border bg-card` container with the Panel primitive (surface=panel); count text → --text-primary; the Buttons stay themed-through. Behavior unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/BulkActionsBar.tsx:63
  - id: F9
    path: src/widgets/events-explorer/ui/ViewTabs.tsx
    action: edit
    intent: "Active/hover tab styling onto mission-control: active bg-accent/text-accent-foreground → bg-surface-elevated/text-text-primary; inactive text-muted-foreground/hover → text-secondary/hover text-primary; ring-ring → ring-text-primary. aria-pressed preserved."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/ViewTabs.tsx:30
  - id: F10
    path: src/widgets/events-explorer/ui/SaveViewPopover.tsx
    action: edit
    intent: "Input border-input/bg-transparent/text/ring → mission-control (--border-hairline / --text / ring-text-primary); label text-muted-foreground → text-secondary; error text-destructive → text-status-critical-fg; Popover themed-through. Behavior unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/SaveViewPopover.tsx:78
  - id: F11
    path: src/widgets/events-explorer/ui/ColumnsMenu.tsx
    action: edit
    intent: "Label/trigger text-muted-foreground → text-secondary; the DropdownMenu reused primitive themed-through. Behavior unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/ColumnsMenu.tsx:38
  - id: F12
    path: src/widgets/events-explorer/ui/GroupByMenu.tsx
    action: edit
    intent: "Active/inactive item text (text-foreground/text-muted-foreground) → text-primary/text-secondary; DropdownMenu themed-through. Behavior unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/GroupByMenu.tsx:39
  - id: F13
    path: src/widgets/events-explorer/ui/GroupRollup.tsx
    action: edit
    intent: "Container border/bg-card → Panel (surface=panel); the row-label dot+text → CategoryPill (hue = eventHue(value)); the count → MonoData (tone secondary); header/hint/empty text → --text-secondary; hover bg-muted → --surface-elevated; ring → ring-text-primary. The scaled bar `fill={eventHue(value)}` STAYS (ADR 0086 token fill). Behavior unchanged."
    satisfies: [AC2, AC4, AC5]
    anchor: src/widgets/events-explorer/ui/GroupRollup.tsx:38
  - id: F14
    path: src/widgets/events-explorer/ui/EventDetail.tsx
    action: edit
    intent: "The three inner cards + the recent-activity card → Panel (surface=panel); the key/value Rows adopt MonoData by wrapping the dt/dd CONTENT in a MonoData span (dt tone secondary, dd tone primary) — the <dl>/<dt>/<dd> description-list semantics are PRESERVED, not replaced; the outer expanded strip border-primary/bg-muted → border-status-nominal-border (or a viz accent) / bg-surface-elevated; the recent-activity leading dot inline var(--color-primary)|var(--color-muted-foreground) → a status/viz token via var(). Behavior/aria unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/events-explorer/ui/EventDetail.tsx:38
  - id: F15
    path: src/widgets/events-explorer/ui/EventsExplorer.tsx
    action: edit
    intent: "The saveFailed alert text-destructive → text-status-critical-fg. PRESERVE the data-density wiring (line 181) and every callback contract unchanged — the leaf's behavior is untouched."
    satisfies: [AC2, AC3]
    anchor: src/widgets/events-explorer/ui/EventsExplorer.tsx:196
  - id: F16
    path: src/widgets/events-explorer/model/presentation.ts
    action: edit
    intent: "Remove `planVariant` (now unused — the plan column uses CategoryPill + eventHue). KEEP `eventHue` (it feeds CategoryPill's hue AND the roll-up bar fill) and every other export."
    satisfies: [AC3]
  - id: F17
    path: src/widgets/events-explorer/model/presentation.test.ts
    action: edit
    intent: "Drop the `planVariant` describe block (the function is removed). All other cases stay."
    satisfies: [AC3]
  - id: F18
    path: src/widgets/events-explorer/ui/EventsToolbar.stories.tsx
    action: new
    intent: "CSF3 stories (light default + Dark via globals:{theme:'dark'}), wrapped in NextIntlClientProvider (the EventsTable.stories decorator pattern): no-filter and active-filter-chips states — the axe surface for the re-skinned toolbar in both compositions."
    satisfies: [AC2]
  - id: F19
    path: src/widgets/events-explorer/ui/FacetFilter.stories.tsx
    action: new
    intent: "CSF3 stories (light + Dark) inside NextIntlClientProvider + a QueryClientProvider (facets fetch on open) with a seeded/mocked client: closed trigger (no selection / with selection count Badge). Axe covers the trigger + count Badge in both compositions; the portaled open popover content is best-effort (documented residual)."
    satisfies: [AC2]
  - id: F20
    path: src/widgets/events-explorer/ui/ViewTabs.stories.tsx
    action: new
    intent: "CSF3 stories (light + Dark) in NextIntlClientProvider: All-events active, a saved-view active — axe over the active/inactive tab token pairs in both compositions."
    satisfies: [AC2]
  - id: F21
    path: src/widgets/events-explorer/ui/SaveViewPopover.stories.tsx
    action: new
    intent: "CSF3 stories (light + Dark) in NextIntlClientProvider: default trigger + an open-popover story (play opens it) covering the input and the error alert token — axe in both compositions."
    satisfies: [AC2]
  - id: F22
    path: src/widgets/events-explorer/ui/ColumnsMenu.stories.tsx
    action: new
    intent: "CSF3 stories (light + Dark) in NextIntlClientProvider: default trigger (+ an open-menu play) — axe over the trigger and menu labels in both compositions."
    satisfies: [AC2]
  - id: F23
    path: src/widgets/events-explorer/ui/GroupByMenu.stories.tsx
    action: new
    intent: "CSF3 stories (light + Dark) in NextIntlClientProvider: none-selected and a dimension-selected state (+ an open-menu play) — axe over active/inactive item tokens in both compositions."
    satisfies: [AC2]
  - id: F24
    path: src/widgets/events-explorer/ui/GroupRollup.stories.tsx
    action: new
    intent: "CSF3 stories (light + Dark) in NextIntlClientProvider + QueryClientProvider with seeded facet rows: populated roll-up (rows + bars + CategoryPill labels + MonoData counts) and empty — axe over the Panel surface, CategoryPill, and MonoData in both compositions."
    satisfies: [AC2]
  - id: F25
    path: src/widgets/events-explorer/ui/EventsTable.stories.tsx
    action: edit
    intent: "Reflect the re-skin: the plan cell now renders a CategoryPill and numeric cells MonoData. Keep the full state matrix and BOTH compositions (the existing light-default stories + Dark/SelectedDark) AND add an ExpandedDark story (globals:{theme:'dark'} + expandedId + a detail profile/activity) — EventDetail renders only when a row is expanded, and the current Expanded story is light-only, so without ExpandedDark the re-skinned EventDetail (Panel + MonoData) has NO dark axe coverage. This makes axe cover the table, BulkActionsBar (Panel), and EventDetail (Panel + MonoData) in both compositions."
    satisfies: [AC2]
  - id: F26
    path: src/widgets/events-explorer/ui/EventsExplorer.test.tsx
    action: edit
    intent: "Add/confirm a behavior-preservation assertion that survives the re-skin: applying dense density sets data-density='dense' on the widget root and changing a filter resets to page 1 (the 0098 contract) — proving the re-skin changed only presentation."
    satisfies: [AC3]
  - id: F27
    path: src/design-system/composition-graph.json
    action: edit
    intent: "Add the category-pill node (kind composite, archetype categorical-indicator, module src/components/ui/category-pill.tsx, composedOf ['badge'], compositionSignature ['badge'], usedIn [EventsTable.tsx, GroupRollup.tsx]). Update usedIn both directions: badge −EventsTable.tsx +category-pill.tsx; mono-data +EventsTable.tsx +EventDetail.tsx +GroupRollup.tsx; panel +BulkActionsBar.tsx +GroupRollup.tsx +EventDetail.tsx. (No status-indicator edge — the stream dot stays a bare inline dot; StatusIndicator is not adopted.)"
    satisfies: [AC5]
  - id: F28
    path: src/components/ui/badge.design-intent.ts
    action: edit
    intent: "meta.usedIn −src/widgets/events-explorer/ui/EventsTable.tsx (plan column now uses CategoryPill) +src/components/ui/category-pill.tsx (CategoryPill composes Badge)."
    satisfies: [AC5]
  - id: F29
    path: src/components/ui/mono-data.design-intent.ts
    action: edit
    intent: "meta.usedIn += src/widgets/events-explorer/ui/EventsTable.tsx, EventDetail.tsx, GroupRollup.tsx."
    satisfies: [AC5]
  - id: F31
    path: src/components/ui/panel.design-intent.ts
    action: edit
    intent: "meta.usedIn += src/widgets/events-explorer/ui/BulkActionsBar.tsx, GroupRollup.tsx, EventDetail.tsx."
    satisfies: [AC5]
  - id: F32
    path: docs/capcom/console-redesign-progress.md
    action: edit
    intent: "Phase C row → ✅ done + PR/date; add a dated Phase-log entry (gates + Chromatic re-baseline status + the CategoryPill decision + the axe residual); rewrite the Resume point to Phase D (overview-dashboard + KPI RPCs). REQUIRED before the PR."
    satisfies: [AC6]
build_order:
  [
    F1,
    F2,
    F4,
    F16,
    F17,
    F5,
    F13,
    F14,
    F8,
    F6,
    F7,
    F9,
    F10,
    F11,
    F12,
    F15,
    F26,
    F27,
    F28,
    F29,
    F31,
    F3,
    F25,
    F18,
    F19,
    F20,
    F21,
    F22,
    F23,
    F24,
    F32,
  ]
depends_on: []
contract:
  kind: function
  signature: |
    // src/components/ui/category-pill.tsx — a viz-categorical hued chip that composes Badge
    CategoryPill(props: { hue?: string } & React.ComponentProps<"span">): React.JSX.Element
      // renders <Badge variant="outline"> themed through the mission-control surface, with an optional
      // leading aria-hidden dot whose colour is `hue` (a var(--color-viz-*) token) via inline style;
      // label is children. compositionSignature ["badge"]; owns no external margin (ADR 0058).
criteria:
  - id: AC1
    statement: "Given CategoryPill with a viz `hue` token and a label, when rendered, then it shows the label, renders a decorative (aria-hidden) leading dot carrying that hue and composes a Badge; given no `hue`, then no dot renders. Token-only, no external margin."
    implemented_by: [F1, F4]
    oracle:
      kind: test
      ref: src/components/ui/category-pill.test.tsx::renders the hue dot and composes a badge
    failure: "The dot is missing/announced to AT when hue is set, a dot renders when hue is absent, or the label is dropped."
  - id: AC2
    statement: "Given the re-skinned events-explorer surfaces and the new CategoryPill, when the Storybook axe a11y gate runs over their stories in BOTH the dark and light compositions (EventsTable + the 7 new toolbar-row stories + CategoryPill), then no a11y (contrast) violations are reported — proving the mission-control surface/text pairing holds and no shadcn foreground leaked onto a --surface-* background."
    implemented_by:
      [
        F1,
        F3,
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
        F15,
        F18,
        F19,
        F20,
        F21,
        F22,
        F23,
        F24,
        F25,
      ]
    oracle:
      kind: command
      ref: npm run test
    failure: "A leftover shadcn foreground (e.g. text-muted-foreground) on a mission-control surface yields low contrast; axe errors in a dark or light story."
  - id: AC3
    statement: "Given the re-skin is presentational only, when the events-explorer behaviour tests run, then the 0097/0098 contract is unchanged — dense density sets data-density='dense' on the widget root, a filter change resets to page 1, and every model test (filter/url-state/bulk/presentation, minus the removed planVariant) passes."
    implemented_by: [F5, F15, F16, F17, F26]
    oracle:
      kind: test
      ref: src/widgets/events-explorer/ui/EventsExplorer.test.tsx::preserves density and page-reset behaviour after the re-skin
    failure: "Density stops setting data-density, a filter change no longer resets the page, or a model test breaks — the re-skin changed behaviour, not just presentation."
  - id: AC4
    statement: "Given the re-skin, when check:tokens runs over src/components + src/widgets, then only allowlisted mission-control semantic tokens are used — no raw color/size literals, no inline-style raw values, no Tailwind numbered palette (ADR 0058). (The gen:tokens swap-only 'no new tokens' invariant is a separate CI drift check, carried in the DoD/merge_obligations, not this oracle.)"
    implemented_by: [F5, F6, F7, F8, F9, F10, F11, F12, F13, F14, F15, F1]
    oracle:
      kind: command
      ref: npm run check:tokens
    failure: "A raw literal or a non-allowlisted class is introduced during the swap; check:tokens errors, or gen:tokens reports drift."
  - id: AC5
    statement: "Given the CategoryPill primitive and the changed import edges, when check:design-system runs (check:graph + check:design-intent), then the composition graph and every affected design-intent.ts reconcile against the actual import graph — the category-pill node exists (composedOf ['badge']), badge/mono-data/panel usedIn are updated both directions, and category-pill's design-intent carries meta.usedIn."
    implemented_by: [F2, F27, F28, F29, F31]
    oracle:
      kind: command
      ref: npm run check:design-system
    failure: "check:graph reports an unreconciled edge (e.g. Panel imported by GroupRollup but absent from panel.usedIn, or badge still listing EventsTable), or check:design-intent flags a meta↔graph mismatch."
  - id: AC6
    statement: "Given the phase is complete, when the progress doc is inspected, then the Phase C row is ✅ done with PR/date and a dated Phase-log entry records gates + the Chromatic re-baseline status + the CategoryPill decision + the axe residual, and the Resume point points to Phase D."
    implemented_by: [F32]
    oracle:
      kind: prose-review
    failure: "The progress doc still shows Phase C as not-started/in-progress, or has no log entry — the phase is not 'done' per the doc's own rule."
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "console-redesign-progress.md updated (Phase C row + log) BEFORE the PR"
  - "gen:tokens swap-only self-test unchanged — no new tokens, no per-theme semantic overrides"
  - "check:contrast green in both compositions (ADR 0099 confirmation)"
  - "check:tokens green over src/components + src/widgets"
  - "check:design-system green (graph + design-intent reconciled)"
  - "human-approved Chromatic visual re-baseline (ADR 0043/0095 — agent never approves its own)"
  - "Conventional Commits (commitlint); single human-reviewed PR into dev; no AI attribution"
gates:
  test: npm run test
```

## Data & Config

N/A — no migrations, env vars, or feature flags. No new RPC or data surface: the re-skin is
presentational and preserves the existing fetchers/hooks (ADR 0084 — reduction stays in the database).
No manifest change — `CategoryPill` composes the existing `Badge`; no new dependency.

## Chosen Approach

Re-skin the twelve events-explorer UI files onto the mission-control surface vocabulary using the
Phase-B token map, and extract **one governed kit primitive**:

- **`CategoryPill`** (`categorical-indicator`, `kind composite`) — a viz-categorical hued chip that
  **composes `Badge`** (themed through the surface) plus an optional leading `var(--color-viz-*)` hue dot.
  It unifies the two categorical-value displays: the plan pill (`EventsTable`, was a `Badge`) and the
  group-roll-up row label (`GroupRollup`, was an ad-hoc dot + text). Composing `Badge` gives it a
  `compositionSignature ["badge"]` distinct from `Badge`'s `[]`, resolving the ADR-0059 collision that
  dropped StatusPill in Phase A: it **reuses** the categorical-indicator chip rather than duplicating it.
  Ships design-intent + dark/light stories + test + graph node. `usageRole: null` (no role collision).

The widget files then adopt the existing primitives at their natural sites: `EventsTable` → CategoryPill
(plan), MonoData (numeric cells / footer / pager); `GroupRollup` / `EventDetail` / `BulkActionsBar`
container surfaces → `Panel`; `EventDetail` rows → MonoData; the stream dot stays a bare inline dot (its
live branch is already a viz token; only its paused-branch shadcn token is swapped); and every file's
text/border/ring/status tokens swap to mission-control. Reused shadcn primitives (`Button`,
`Popover`, `Command`, `DropdownMenu`, the removable filter `Badge`, the facet-count `Badge`) are themed
**through** the surface at the call site, never forked (ADR 0099). Density stays wired to `[data-density]`
(ADR 0082/0098, already shipped). `eventHue` stays (it feeds CategoryPill's hue and the roll-up bar fill);
`planVariant` is removed (now unused).

Per the 👤 decision, the seven toolbar-row components each get a colocated **dark + light story** so the
axe gate covers their re-skin — they are otherwise only rendered by the fetching `EventsExplorer` and have
no coverage today; `EventsTable.stories` already covers the table + `BulkActionsBar` + `EventDetail` +
`RelativeTime` transitively (light via the default stories; dark for `BulkActionsBar`/`EventDetail` via
`SelectedDark`/`ExpandedDark`, F25).

**Stack compliance:** NATIVE
**Future alignment:** ALIGNED — realizes ADR 0099's Phase C and seeds `CategoryPill` for Phases D–E.

**Stack extensions required:** none — `CategoryPill` composes the existing `Badge`.

## Why this over alternatives

- **Reuse Badge with no new primitive (badge-through-surface):** rejected by the 👤 (AskUserQuestion) in
  favour of the governed primitive — the portfolio goal is to showcase the design-system governance, and
  the plan pill + roll-up label are the concrete multi-use site that fixes a categorical-viz-chip API the
  neutral `Badge` and severity-toned `StatusIndicator` don't express. (Recorded so the collision caveat
  is inherited: CategoryPill earns its identity by composing Badge, not by being a second bare leaf.)
- **A CategoryPill leaf (compositionSignature []):** rejected — it would be a direct structural + role
  duplicate of `Badge` (the exact ADR-0059 collision that dropped StatusPill in Phase A). Composing Badge
  makes the signature distinct and reuses the chip.
- **One EventsExplorer.stories with a mocked data layer / clean-swap + manual verify:** rejected by the 👤
  in favour of per-component stories — isolated, reusable axe coverage of each re-skinned toolbar-row
  surface, at the cost of ~7 story files. (The manual/one-story options left the palette trap ungated for
  that row.)
- **Surface utilities instead of the Panel primitive for containers:** rejected for the standalone card
  surfaces (BulkActionsBar / GroupRollup / EventDetail cards) — ADR 0099 reuses the governed `Panel`; the
  EventsTable table wrapper (needs `overflow-x-auto`) and the EventDetail outer strip (border-l accent)
  stay on `bg-surface-*` utilities where layout precludes the box primitive.

## Test Plan

- Harness: Vitest (`npm run test` = unit jsdom + Storybook browser-mode with the axe a11y gate at WCAG
  2.2 AA, `a11y.test: "error"`). Component behaviour in `*.test.tsx`; a11y/contrast via the stories.
- Test locations: colocated — `src/components/ui/category-pill.{test,stories}.tsx` for the primitive;
  `src/widgets/events-explorer/ui/*.stories.tsx` for the toolbar-row axe coverage;
  `src/widgets/events-explorer/ui/EventsExplorer.test.tsx` for the behaviour-preservation assertion;
  `model/presentation.test.ts` loses the planVariant block.
- Conventions (from neighbours — `EventsTable.stories.tsx`): stories wrap in `NextIntlClientProvider` with
  the canonical `messages`; a `Dark` story uses `globals: { theme: "dark" }` (default is light);
  data-fetching stories (`FacetFilter`, `GroupRollup`) additionally wrap a `QueryClientProvider` with a
  seeded client; interactive play uses `storybook/test`. Gate suite beyond `npm run test`: `tsc --noEmit`,
  `npm run lint`, `npm run check:design-system` (tokens/contrast/boundaries/graph/design-intent/seals/
  i18n), `npm run check:stories`, `npm run build`, `npm run test:coverage` (≥80%).

## Definition of Done

- [ ] `npm run test` green (unit + Storybook axe, dark **and** light)
- [ ] `tsc --noEmit` / `npm run lint` / `npm run format:check` / `npm run build` green
- [ ] `npm run check:design-system` green — incl. `check:contrast` both compositions, `check:graph` +
      `check:design-intent` reconciled, `check:tokens` clean, `check:i18n` parity
- [ ] `npm run gen:tokens` drift-check unchanged (no new tokens)
- [ ] `npm run check:stories` green; `npm run test:coverage` ≥ 80%
- [ ] `docs/capcom/console-redesign-progress.md` updated (Phase C row + log) — **before** the PR (F32)
- [ ] Human-approved Chromatic re-baseline (ADR 0043/0095) — agent never approves its own; scope includes
      the new CategoryPill + toolbar-row stories and the re-skinned EventsTable snapshots
- [ ] Single human-reviewed PR into `dev`; Conventional Commits; no AI attribution

## Non-goals

- Any overview / funnel / retention / segment / trends re-skin (Phases D–E).
- New RPCs, new SQL, or live-data changes — behaviour and the data layer are untouched (ADR 0084).
- New tokens or per-theme semantic overrides — consume the existing semantic layer only.
- New dependencies — `CategoryPill` composes the existing `Badge`.
- Turning the removable filter chips or the key=value property chips into `CategoryPill` — those are a
  removable filter token and key=value metadata, deliberately distinct from the single categorical-value
  chip (keeps CategoryPill's signature crisp).
- Column reorder/resize, group-by via TanStack `getGroupedRowModel`, or any 0098 scope boundary.

## Assumptions

- The default Storybook composition is **light** (`context.globals.theme ?? "light"`), so a bare story
  proves the light composition and a `globals:{theme:"dark"}` sibling proves dark — each new story ships
  both.
- Passing a `var(--color-viz-*)` token through CategoryPill's `hue` prop into an inline
  `style={{ background: hue }}` is token-safe: `check:tokens` flags raw literals, not a variable
  (the shipped `eventHue` inline-style pattern is the precedent).
- `Panel` accepts a `className` for the layout needs of a re-used container (e.g. `overflow` is handled by
  a wrapping utility where the table body needs it); where that is impossible the file keeps a
  `bg-surface-*` utility (EventsTable wrapper, EventDetail strip) and does not import Panel — so those
  files are absent from `panel.usedIn` by design.
- The `CategoryPill`↔`Badge` structural similarity is an **expected** advisory `ds:signature` note (it
  composes Badge, so its signature is `["badge"]`, non-colliding) — recorded, not a blocking gate.

## Open Questions

none

## Security / NFR

N/A — no auth/crypto/PII/input-parsing surface. Presentational re-skin of an existing RLS-scoped surface
(ADR 0083); the fetchers/hooks are unchanged. NFR: a11y is the primary quality axis (axe gate, both
themes, an acceptance criterion); no new dependency (no supply-chain / license delta).

## Critic Verdict & Overrides

marvin-tm-spec-critic round 1: **BLOCK** (1 blocker + warnings) → revised → round 2: **PASS**. Resolutions,
verified by the critic against the real gate scripts: (1) BLOCKER — `EventDetail` renders only when a row
is expanded and the only `Expanded` story was light-only, so its dark composition was axe-unverified while
AC2 claimed "in both"; fixed by adding the load-bearing **`ExpandedDark`** story (F25). (2) Dropped the
`StatusIndicator` adoption (a severity pill is the wrong fit for the 2-state pulsing stream dot) and its
contingent `status-indicator += EventsTable` graph edge — the dot stays a bare inline dot with only its
paused-branch shadcn token swapped (F5); removed the old F30 + reconciled AC5/build_order. (3) AC4 no
longer over-claims `gen:tokens` (its oracle is `check:tokens`; the swap-only invariant lives in DoD).
(4) F14 clarified — `MonoData` wraps the `dt`/`dd` content, preserving `<dl>` semantics. Residual
(documented, accepted): the `EventsExplorer` saveFailed alert has no story (renders only on a failed save)
and the portaled popover/menu overlays are best-effort under the story axe run (Phase-B precedent). The
critic re-derived the post-re-skin importer set against `check-composition-graph.mjs` /
`check-design-intent.mjs` and confirmed F27–F29/F31 reconcile exactly.

## Design Notes

- **Largest risk is `check:graph`/`check:design-intent` reconciliation** (as in Phase B), not the CSS.
  The both-direction usedIn edits (F27–F29, F31) must be exact: `badge.usedIn` loses `EventsTable`, gains
  `category-pill`; `mono-data` gains EventsTable/EventDetail/GroupRollup; `panel` gains
  BulkActionsBar/GroupRollup/EventDetail; the `category-pill` node's `usedIn` = [EventsTable, GroupRollup].
  There is **no** status-indicator edge (the stream dot stays a bare inline dot — StatusIndicator, a
  severity pill, was rejected as the wrong fit). `check:graph` reconciles these against the real imports,
  so an import added without its graph edge (or vice-versa) fails.
- **Palette discipline:** verify each re-skinned file's **dark AND light story under axe** before
  assuming clean — the trap is invisible to `check:tokens`/`check:contrast`. `--text-tertiary` is not
  AA for small text; use `--text-secondary`. The critic caught that `EventDetail` renders only when a
  row is expanded and the sole `Expanded` story is light — hence the **`ExpandedDark`** story (F25) is
  load-bearing, not optional: without it the re-skinned `EventDetail` (Panel + MonoData) has no dark
  axe coverage.
- **Axe residuals (documented, accepted):** (1) the portaled popover/command content (`FacetFilter`,
  `SaveViewPopover`, the menus) renders outside the story canvas; opening it in a play brings it into the
  document, but per the Phase-B CommandPalette precedent portal contrast is best-effort under the story
  axe run — the triggers and inline content are covered; the overlay pairs (`--surface-overlay` +
  `--text-*`) are the same AA-verified pairs Phase B computed directly. (2) The `EventsExplorer`
  saveFailed alert (F15, `text-status-critical-fg`) renders only on a failed save from the fetching root,
  so it has no story — low risk, as `status-critical-fg`/surface is an AA-verified status pair. Final
  visual sign-off is the human Chromatic re-baseline.
- **Big but coherent PR (~32 files).** If review finds it unwieldy, the natural split mirrors Phase A's
  foundation-first rhythm: a primitive-first PR (CategoryPill F1–F4 + the graph/design-intent edges it
  needs) then the widget-consumption PR. Kept as one PR here to honour "one reviewable PR per phase".
- Advisory design-system loop before authoring CategoryPill: `ds:signature` (confirms the `["badge"]`
  signature is non-colliding), `ds:states` (categorical-indicator → contentBounds only).

## Future Considerations

- `CategoryPill` is reused by the Overview bento (Phase D) and the remaining analytics widgets (Phase E);
  its `usedIn` grows there.
- If the property chips or filter chips should later unify onto a chip primitive, that is a separate,
  deliberate API decision (they are a different shape today) — recorded, not done here.
- ADR 0100 (`data-display`) acceptance remains a human-only gate; this phase adds no new dependence on it
  (CategoryPill is `categorical-indicator`, the ratified class).

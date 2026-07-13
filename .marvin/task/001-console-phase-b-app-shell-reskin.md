---
slug: console-phase-b-app-shell-reskin
type: feature
status: in-progress
created: 2026-07-13
tracker: docs/capcom/console-redesign-progress.md (Phase B)
supersedes: none
stack: typescript
risk: medium
breaking: false
spike_required: false
test_command: npm run test
contract_sha: e71731b1469aa9f4
---

# Console re-skin Phase B — app-shell onto the mission-control surface (V2: extract chrome sub-primitives)

## Goal

Move the authenticated app shell (`src/widgets/app-shell`: `AppShell`, `SidebarNav`, `CommandPalette`,
`ProjectHub`) off the neutral shadcn value layer onto the mission-control instrument-panel surface so
chrome and data-viz read as one panel (ADR 0099), extracting two reusable console chrome primitives
(`NavItem`, `TelemetryStat`) into the kit and adding a static telemetry footer — theme-aware
(light/dark) with zero new tokens and zero new dependencies.

## Context

- Related patterns:
  - Phase-A primitives to consume — `Panel` (mission-control card, [panel.tsx](src/components/ui/panel.tsx)),
    `MonoData` ([mono-data.tsx](src/components/ui/mono-data.tsx)), `Hairline`
    ([hairline.tsx](src/components/ui/hairline.tsx)), `StatusIndicator`
    ([status-indicator.tsx](src/components/ui/status-indicator.tsx)).
  - Current shadcn-layer chrome to swap: [AppShell.tsx](src/widgets/app-shell/ui/AppShell.tsx) (`border-border`,
    `text-muted-foreground`, `bg-background`, `border-input`, `bg-muted`),
    [SidebarNav.tsx:34](src/widgets/app-shell/ui/SidebarNav.tsx) (`bg-accent`/`text-accent-foreground`),
    [ProjectHub.tsx:39](src/widgets/app-shell/ui/ProjectHub.tsx) (shadcn `Card`).
  - **`asChild` engine:** the repo's kit imports Radix through the **`radix-ui` umbrella** (a direct
    dependency) — [dialog.tsx:4](src/components/ui/dialog.tsx), [popover.tsx:4](src/components/ui/popover.tsx),
    [tabs.tsx:5](src/components/ui/tabs.tsx), [tooltip.tsx:4](src/components/ui/tooltip.tsx),
    [dropdown-menu.tsx:4](src/components/ui/dropdown-menu.tsx), [scroll-area.tsx:4](src/components/ui/scroll-area.tsx)
    all `import { … } from "radix-ui"`. The umbrella exports `Slot`, so `NavItem` follows the same
    convention with **no new dependency**.
  - Production theme resolver — [theme.ts:22](src/features/theme/model/theme.ts) sets **both** `.dark`
    and `[data-theme]`; the Storybook toolbar ([preview.tsx:25](.storybook/preview.tsx)) toggles only
    `.dark`, so mission-control surfaces (which flip via `[data-theme="light"]`,
    [globals.css:515](src/app/globals.css)) never flip in the workbench — the gap the resume point flags.
  - Governance registries — archetypes [archetypes.ts](src/design-system/archetypes.ts) (`data-display`
    added by ADR 0100; `action-trigger` existing), states [states.ts](src/design-system/states.ts),
    design-intent schema [design-intent.ts](src/design-system/design-intent.ts), graph
    [composition-graph.json](src/design-system/composition-graph.json).
- Callers / reverse-deps (UNCHANGED — presentational, props are stable):
  [p/[projectId]/layout.tsx:47](<src/app/[locale]/(app)/p/[projectId]/layout.tsx>) renders `<AppShell>`;
  [p/[projectId]/page.tsx:67](<src/app/[locale]/(app)/p/[projectId]/page.tsx>) renders `<ProjectHub>`. The
  telemetry footer is static reference dressing, so no new props → callers stay out of the allowlist.
- Constraints:
  - **Palette trap** (memory `capcom-token-palette-trap`): the mission-control surface/text set is AA
    only when paired with itself; a leftover shadcn foreground on a `--surface-*` bg = ~1:1 contrast,
    caught by the **axe dark/light story**, not `check:tokens`. Clean per-file swap, never a half-mix.
  - **Graph reconciliation** (`check:graph` / `check:design-intent`, ADR 0059/0060): every changed import
    edge must be mirrored in `composition-graph.json` and the affected `design-intent.ts` `meta.usedIn`.
  - The `src/components/ui` kit is outside FSD and must not import app routing (`@/i18n/navigation`);
    `NavItem` decouples via the umbrella `Slot` (`asChild`).
- Sibling specs: none depended on. Phase A (the four base primitives) is already merged to `dev`
  (PR #33/#34). Phases C–E (events-explorer, overview, remaining widgets) are downstream, not blockers.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: src/components/ui/nav-item.tsx
    action: new
    intent: "NavItem primitive — action-trigger, asChild via `Slot` from the `radix-ui` umbrella (already a direct dep; the convention every kit primitive follows) so the widget passes its i18n Link. `active` prop → aria-current='page' + active mission-control surface styling; icon+label are the child's content (as SidebarNav already renders). Semantic tokens only (ADR 0058)."
    satisfies: [AC1, AC6, AC8]
  - id: F2
    path: src/components/ui/nav-item.design-intent.ts
    action: new
    intent: "Typed design-intent (ADR 0062): archetype action-trigger, kind primitive, compositionSignature [], composedOf [], meta.usedIn = ['src/widgets/app-shell/ui/SidebarNav.tsx'] (mirrors the graph, F17), usageRole 'action-trigger'; states interaction+contentBounds (process N/A — sync nav); play required (ADR 0038)."
    satisfies: [AC3]
  - id: F3
    path: src/components/ui/nav-item.stories.tsx
    action: new
    intent: "CSF3 stories (dark+light via the global theme toolbar) with a play function proving keyboard focus + aria-current when active (ADR 0036/0038/0039)."
    satisfies: [AC1, AC6]
  - id: F4
    path: src/components/ui/nav-item.test.tsx
    action: new
    intent: "Unit test: renders icon+label content, sets aria-current when active, asChild delegates to a passed anchor, keyboard-focusable."
    satisfies: [AC6]
  - id: F5
    path: src/components/ui/telemetry-stat.tsx
    action: new
    intent: "TelemetryStat primitive — data-display composite: a compact telemetry cell composing StatusIndicator (leading dot, `level`) + label + MonoData value (children). Semantic tokens only."
    satisfies: [AC2, AC7]
  - id: F6
    path: src/components/ui/telemetry-stat.design-intent.ts
    action: new
    intent: "Typed design-intent: archetype data-display, kind composite, compositionSignature ['mono-data','status-indicator'], composedOf same, meta.usedIn = ['src/widgets/app-shell/ui/TelemetryFooter.tsx'] (mirrors the graph, F17), usageRole null; states contentBounds (data-display mandate); no play."
    satisfies: [AC3]
  - id: F7
    path: src/components/ui/telemetry-stat.stories.tsx
    action: new
    intent: "CSF3 stories (dark+light via the global theme toolbar): Default, WithStatus (each level), LongValue (contentBounds). Presentational — no play (ADR 0038)."
    satisfies: [AC1, AC7]
  - id: F8
    path: src/components/ui/telemetry-stat.test.tsx
    action: new
    intent: "Unit test: renders label + mono value; renders StatusIndicator dot at the given level; value carries the mono-data type role."
    satisfies: [AC7]
  - id: F9
    path: src/widgets/app-shell/ui/AppShell.tsx
    action: edit
    intent: "Re-skin frame/aside/breadcrumb bar/⌘K trigger to --surface-*/--text-*/--border-hairline (no bg-background/border-border/bg-muted); render the TelemetryFooter at the bottom of the main column. Behavior unchanged."
    satisfies: [AC2, AC4]
    anchor: src/widgets/app-shell/ui/AppShell.tsx:57
  - id: F10
    path: src/widgets/app-shell/ui/SidebarNav.tsx
    action: edit
    intent: "Render each section via `<NavItem asChild active={…}>` wrapping the i18n Link (icon+label as the Link's children); active/hover on mission-control surfaces (no bg-accent). aria-current preserved."
    satisfies: [AC2, AC5]
    anchor: src/widgets/app-shell/ui/SidebarNav.tsx:34
  - id: F11
    path: src/widgets/app-shell/ui/CommandPalette.tsx
    action: edit
    intent: "Theme the reused shadcn CommandDialog THROUGH --surface-overlay/--text-* at the call site via className overrides (ADR 0099 — never fork the shadcn command primitive). Navigation behavior unchanged."
    satisfies: [AC2]
    anchor: src/widgets/app-shell/ui/CommandPalette.tsx:48
  - id: F12
    path: src/widgets/app-shell/ui/ProjectHub.tsx
    action: edit
    intent: "Replace shadcn Card with the Panel primitive; icon tile + title/description on --surface-*/--text-* tokens. Same registry-driven grid, same links."
    satisfies: [AC2]
    anchor: src/widgets/app-shell/ui/ProjectHub.tsx:39
  - id: F13
    path: src/widgets/app-shell/ui/TelemetryFooter.tsx
    action: new
    intent: "Widget-internal footer strip composing TelemetryStat × (Ingestion / RLS / Freshness / Events per min) — STATIC reference dressing (illustrative constants + i18n labels), no data fetching, no new RPC (ADR 0083 shell fetches nothing). Separated by Hairline."
    satisfies: [AC2]
  - id: F14
    path: src/widgets/app-shell/ui/TelemetryFooter.test.tsx
    action: new
    intent: "Unit test: renders the four labeled stats with their status levels; no network/data dependency."
    satisfies: [AC2]
  - id: F15
    path: src/widgets/app-shell/ui/AppShell.stories.tsx
    action: new
    intent: "CSF3 stories (dark+light via the global toolbar, next-intl + app-router context) covering the full re-skinned chrome incl. sidebar (NavItem), breadcrumb, ⌘K trigger, and TelemetryFooter — the axe a11y surface for the console chrome in both compositions."
    satisfies: [AC1]
  - id: F16
    path: src/widgets/app-shell/ui/ProjectHub.stories.tsx
    action: edit
    intent: "Reflect the Panel re-skin; keep Default + Dark so axe covers both compositions (light via the newly-wired toolbar)."
    satisfies: [AC1]
  - id: F17
    path: src/design-system/composition-graph.json
    action: edit
    intent: "Add nav-item + telemetry-stat nodes; update usedIn: panel += ProjectHub.tsx, card -= ProjectHub.tsx, mono-data += telemetry-stat.tsx, status-indicator += telemetry-stat.tsx; telemetry-stat.usedIn = TelemetryFooter.tsx; nav-item.usedIn = SidebarNav.tsx."
    satisfies: [AC3]
  - id: F18
    path: src/components/ui/panel.design-intent.ts
    action: edit
    intent: "meta.usedIn += src/widgets/app-shell/ui/ProjectHub.tsx (Panel now consumed by ProjectHub)."
    satisfies: [AC3]
  - id: F19
    path: src/components/ui/card.design-intent.ts
    action: edit
    intent: "meta.usedIn -= ProjectHub.tsx (ProjectHub no longer uses Card)."
    satisfies: [AC3]
  - id: F20
    path: src/components/ui/mono-data.design-intent.ts
    action: edit
    intent: "meta.usedIn += src/components/ui/telemetry-stat.tsx."
    satisfies: [AC3]
  - id: F21
    path: src/components/ui/status-indicator.design-intent.ts
    action: edit
    intent: "meta.usedIn += src/components/ui/telemetry-stat.tsx."
    satisfies: [AC3]
  - id: F22
    path: .storybook/preview.tsx
    action: edit
    intent: "Theme decorator sets BOTH `.dark` and `[data-theme]` on the root (mirroring theme.ts), making the global toolbar the single source of `[data-theme]` so mission-control surfaces flip light/dark in the workbench like production. Phase-B stories use this global toolbar; the merged Phase-A primitives' local per-story mcTheme decorators still win for their own subtree (nearest-ancestor [data-theme]). This newly subjects Panel's light story to the light composition under axe (see F29) and broadens the Chromatic re-baseline to globally-affected stories."
    satisfies: [AC1]
    anchor: .storybook/preview.tsx:25
  - id: F23
    path: messages/en.json
    action: edit
    intent: "Add AppShell.telemetry namespace: labels for Ingestion / RLS / Freshness / Events per min (values stay illustrative constants in TelemetryFooter). Key parity trivial (single locale)."
    satisfies: [AC2]
  - id: F26
    path: docs/capcom/console-redesign-progress.md
    action: edit
    intent: "Phase B row → ✅ done + PR/date; add a dated Phase-log entry (gates + Chromatic re-baseline status); rewrite Resume point to Phase C. REQUIRED before the PR."
    satisfies: [AC9]
  - id: F27
    path: src/widgets/app-shell/ui/AppShell.test.tsx
    action: edit
    intent: "Assert the TelemetryFooter renders and ⌘K still opens the palette after the re-skin (behavior preserved)."
    satisfies: [AC4]
  - id: F28
    path: src/widgets/app-shell/ui/SidebarNav.test.tsx
    action: edit
    intent: "Assert each section renders as a NavItem-backed link and the active section carries aria-current='page'."
    satisfies: [AC5]
  - id: F29
    path: src/components/ui/panel.stories.tsx
    action: edit
    intent: "Add a light-composition story (global toolbar theme:light) so Panel stays axe-clean under the newly-wired [data-theme] toolbar (F22 newly subjects Panel to the light composition; today panel.stories only covers dark)."
    satisfies: [AC1]
build_order:
  [
    F1,
    F2,
    F4,
    F5,
    F6,
    F8,
    F17,
    F18,
    F19,
    F20,
    F21,
    F13,
    F14,
    F10,
    F28,
    F11,
    F12,
    F9,
    F27,
    F22,
    F3,
    F7,
    F15,
    F16,
    F29,
    F23,
    F26,
  ]
depends_on: []
contract:
  kind: function
  signature: |
    // src/components/ui/nav-item.tsx — asChild via `Slot` from the `radix-ui` umbrella (no new dep)
    NavItem(props: { active?: boolean; asChild?: boolean } & React.ComponentProps<"a">): React.JSX.Element
      // asChild ? Slot : "a"; sets aria-current="page" + data-current when active; merges nav styling onto the child.
      // icon+label are the child's content (the i18n Link's children), NOT rendered by NavItem — no Slottable needed.
    // src/components/ui/telemetry-stat.tsx
    TelemetryStat(props: { label: React.ReactNode; level?: "nominal" | "caution" | "warning" | "critical" } & React.ComponentProps<"div">): React.JSX.Element
      // renders a StatusIndicator dot (level) + label + MonoData value (children)
criteria:
  - id: AC1
    statement: "Given the re-skinned app-shell chrome and the new primitives, when the Storybook axe a11y gate runs over their stories in BOTH the dark and light compositions, then no a11y (contrast) violations are reported — proving the mission-control surface/text pairing holds and no shadcn foreground leaked onto a --surface-* background."
    implemented_by: [F1, F3, F5, F7, F9, F10, F11, F12, F13, F15, F16, F22, F29]
    oracle:
      kind: command
      ref: npm run test
    failure: "A leftover shadcn foreground (e.g. text-foreground) on a mission-control surface yields ~1:1 contrast; axe errors in the dark or light story."
  - id: AC2
    statement: "Given the re-skinned chrome and new primitives, when check:tokens runs over src/components + src/widgets, then only allowlisted mission-control semantic tokens are used — no raw color/size literals, no inline-style raw values, no Tailwind numbered palette (ADR 0058) — and gen:tokens reports no new tokens (swap-only invariant intact)."
    implemented_by: [F1, F5, F9, F10, F11, F12, F13, F23]
    oracle:
      kind: command
      ref: npm run check:tokens
    failure: "A raw literal or a non-allowlisted class is introduced during the re-skin; check:tokens errors."
  - id: AC3
    statement: "Given two new kit primitives and the changed import edges, when check:design-system runs (check:graph + check:design-intent), then the composition graph and every affected design-intent.ts reconcile against the actual import graph (2 new nodes; panel/card/mono-data/status-indicator usedIn updated both directions; both new intents carry meta.usedIn)."
    implemented_by: [F2, F6, F17, F18, F19, F20, F21]
    oracle:
      kind: command
      ref: npm run check:design-system
    failure: "check:graph reports an unreconciled edge (e.g. Panel imported by ProjectHub but absent from panel.usedIn, or card still listing ProjectHub), or check:design-intent flags a meta↔graph mismatch (e.g. card.design-intent still listing ProjectHub)."
  - id: AC4
    statement: "Given the re-skinned AppShell, when it renders and ⌘K is pressed, then the TelemetryFooter is present and the command palette still opens — behavior is unchanged by the re-skin."
    implemented_by: [F9, F13, F27]
    oracle:
      kind: test
      ref: src/widgets/app-shell/ui/AppShell.test.tsx::opens the command palette and renders the telemetry footer
    failure: "The ⌘K handler stops opening the palette, or the footer is missing."
  - id: AC5
    statement: "Given SidebarNav rendered on a section route, when it maps the section registry through NavItem, then each section is a focusable link and the active section carries aria-current='page'."
    implemented_by: [F10, F28]
    oracle:
      kind: test
      ref: src/widgets/app-shell/ui/SidebarNav.test.tsx::marks the active section with aria-current
    failure: "The active section loses aria-current, or a section is no longer a keyboard-focusable link."
  - id: AC6
    statement: "Given NavItem with active set and an asChild anchor, when rendered, then it sets aria-current='page', delegates to the passed anchor (the child's icon+label content preserved), and is keyboard-focusable."
    implemented_by: [F1, F3, F4]
    oracle:
      kind: test
      ref: src/components/ui/nav-item.test.tsx::sets aria-current and forwards asChild
    failure: "aria-current is absent when active, or asChild does not delegate to the passed element."
  - id: AC7
    statement: "Given TelemetryStat with a label, a value, and a level, when rendered, then it shows the label and the value in the mono-data type role and a StatusIndicator dot at that level — composing MonoData + StatusIndicator."
    implemented_by: [F5, F8]
    oracle:
      kind: test
      ref: src/components/ui/telemetry-stat.test.tsx::renders label, mono value and status dot
    failure: "The value is not in the mono face, or the status dot is missing/at the wrong level."
  - id: AC8
    statement: "Given NavItem's asChild implemented via the `radix-ui` umbrella `Slot` (no new dependency), when the app is type-checked and built, then it compiles green and the production build succeeds."
    implemented_by: [F1]
    oracle:
      kind: command
      ref: npm run build
    failure: "Type error from the Slot/asChild usage, or the build fails."
  - id: AC9
    statement: "Given the phase is complete, when the progress doc is inspected, then the Phase B row is ✅ done with PR/date and a dated Phase-log entry records gates + the Chromatic re-baseline status, and the Resume point points to Phase C."
    implemented_by: [F26]
    oracle:
      kind: prose-review
    failure: "The progress doc still shows Phase B as not-started/in-progress, or has no log entry — the phase is not 'done' per the doc's own rule."
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "console-redesign-progress.md updated (Phase B row + log) BEFORE the PR"
  - "i18n key parity green (check:i18n)"
  - "gen:tokens swap-only self-test unchanged — no new tokens, no per-theme semantic overrides"
  - "check:contrast green in both compositions (ADR 0099 confirmation)"
  - "human-approved Chromatic visual re-baseline (ADR 0043/0095 — agent never approves its own)"
  - "Conventional Commits (commitlint); single human-reviewed PR into dev; no AI attribution"
gates:
  test: npm run test
```

## Data & Config

N/A — no migrations, env vars, or feature flags. The telemetry footer is static reference dressing; the
shell fetches nothing (ADR 0083). No manifest change — `NavItem` uses the existing `radix-ui` umbrella
dependency.

## Chosen Approach

Re-skin the four app-shell chrome files onto the mission-control surface vocabulary and, per the V2
decision, extract **two governed kit primitives**:

- **`NavItem`** (`action-trigger`) — a nav link primitive that uses shadcn's `asChild` via `Slot` from
  the **`radix-ui` umbrella** (already a direct dependency; the import convention all six kit Radix
  consumers follow — dialog/popover/tabs/tooltip/dropdown-menu/scroll-area). `SidebarNav` composes
  `<NavItem asChild active={…}><Link…>{icon}{label}</Link></NavItem>`, keeping app routing out of the
  kit; `Slot` merges NavItem's nav styling + `aria-current` onto the child, so **no `Slottable` and no
  new dependency** are needed (icon+label are the child's content, exactly as SidebarNav renders today).
  Interactive ⇒ a `play` function (ADR 0038). Ships design-intent + dark/light stories + test + graph node.
- **`TelemetryStat`** (`data-display` composite) — a compact telemetry cell composing `StatusIndicator`
  (leading dot at `level`) + label + `MonoData` value (`children`). `usageRole: null`. `contentBounds`
  states only (data-display owns only how a present value renders; absence/loading is the widget's job,
  ADR 0100). Ships design-intent + dark/light stories + test + graph node.

The shell files then: `ProjectHub` swaps shadcn `Card` → `Panel`; `SidebarNav` renders `NavItem`;
`CommandPalette` themes the reused shadcn `CommandDialog` **through** `--surface-overlay` at the call
site (never forks it, ADR 0099); `AppShell` moves the frame/aside/breadcrumb/⌘K-trigger onto
`--surface-*`/`--text-*`/`--border-hairline` and renders a new widget-internal **`TelemetryFooter`**
(TelemetryStat × Ingestion/RLS/Freshness/Events-per-min, static reference dressing, `Hairline`-separated).
The Storybook theme decorator is wired to set both `.dark` and `[data-theme]` (mirroring `theme.ts`) so
the workbench flips both layers as production does; a new `AppShell.stories.tsx` (dark+light) plus the
primitives' stories give the axe gate full coverage. All coupled graph/design-intent `usedIn` edits keep
`check:graph`/`check:design-intent` reconciled.

**Stack compliance:** NATIVE
**Future alignment:** ALIGNED — realizes ADR 0099's console re-skin and seeds primitives reused in Phases C–D.

**Stack extensions required:** none — `NavItem` uses the existing `radix-ui` umbrella dependency.

## Why this over alternatives

- **V1 (reuse Phase-A primitives only, re-skin inline):** rejected by the user in favor of the fuller
  extraction — V2 showcases the design-system governance (a portfolio-demo goal) and dedups the nav row
  and telemetry cell into reusable primitives.
- **V3 (utilities-only, no primitives):** rejected — re-inlines the token choices the primitives exist
  to own; drifts from the single-source intent (ADR 0058).
- **`NavItem` as an inline `navItemVariants` cva (no primitive):** rejected in the V2 sub-decision —
  the user chose the full governed `NavItem` primitive with `asChild` over the lighter cva recipe.
- **Adding `@radix-ui/react-slot` as a scoped dependency:** rejected (critic finding) — the repo already
  depends on the `radix-ui` umbrella which exports `Slot`; the scoped package would diverge from the
  convention every kit primitive follows for no benefit (`Slottable` is not needed).
- **Wiring the footer to live data (fn_events_summary poll):** rejected — introduces a data surface into
  a shell that fetches nothing (ADR 0083) and a new RPC out of Phase-B scope; live KPIs are Phase D.

## Test Plan

- Harness: Vitest (`npm run test` = both projects — unit jsdom + Storybook browser-mode with the axe
  a11y gate at WCAG 2.2 AA, ADR 0039; confirmed: `.storybook/preview.tsx` sets `a11y.test: "error"`,
  `vitest.config.mts` runs the `storybook` browser project). Component behavior in `*.test.tsx`;
  a11y/contrast via the Storybook stories.
- Test locations: colocated — `src/components/ui/*.test.tsx` and `*.stories.tsx` for the primitives;
  `src/widgets/app-shell/ui/*.test.tsx` / `*.stories.tsx` for the shell.
- Conventions (from neighbors): stories wrap in `NextIntlClientProvider` with the canonical `messages`
  (see [ProjectHub.stories.tsx](src/widgets/app-shell/ui/ProjectHub.stories.tsx)); a `Dark` story uses
  `globals: { theme: "dark" }`; AppShell stories additionally need app-router context
  (`parameters.nextjs`) for `usePathname`/`useRouter`. Interactive primitives use `play` with
  `@storybook/test`. Gate suite beyond `npm run test`: `tsc --noEmit`, `npm run lint`,
  `npm run check:design-system` (tokens/contrast/boundaries/graph/design-intent/seals/i18n),
  `npm run check:stories`, `npm run build`, `npm run test:coverage` (≥80%).

## Definition of Done

- [ ] `npm run test` green (unit + Storybook axe, dark **and** light)
- [ ] `tsc --noEmit` / `npm run lint` / `npm run format:check` / `npm run build` green
- [ ] `npm run check:design-system` green — incl. `check:contrast` both compositions, `check:graph` +
      `check:design-intent` reconciled, `check:tokens` clean, `check:i18n` parity
- [ ] `npm run gen:tokens` drift-check unchanged (no new tokens)
- [ ] `npm run check:stories` green; `npm run test:coverage` ≥ 80%
- [ ] `docs/capcom/console-redesign-progress.md` updated (Phase B row + log) — **before** the PR (F26)
- [ ] Human-approved Chromatic re-baseline (ADR 0043/0095) — agent never approves its own; scope
      includes globally-affected stories from the F22 toolbar wiring
- [ ] Single human-reviewed PR into `dev`; Conventional Commits; no AI attribution

## Non-goals

- Any events-explorer / funnel / retention / segment / trends / overview re-skin (Phases C–E).
- New RPCs or live telemetry data — the footer is static reference dressing.
- New tokens or per-theme semantic overrides — consume the existing semantic layer only.
- New dependencies — `NavItem` uses the existing `radix-ui` umbrella.
- Accepting ADR 0100 (proposed) — a human-only gate, orthogonal to this implementation.
- Forking the shadcn `command`/`card` primitives — reused primitives are themed at the call site.

## Assumptions

- `TelemetryStat`'s `data-display` archetype is consistent with the already-merged MetricHero/MonoData
  classification (ADR 0100); ADR 0100 remains `proposed` but the archetype is present in `archetypes.ts`
  and code already depends on it — Phase B introduces no _new_ dependence on the still-proposed record.
- `NavItem` needs no `Slottable`: the caller supplies the icon+label as the Link's children (as
  SidebarNav does today), so the umbrella `Slot` (single-child prop-merge) suffices.
- Illustrative telemetry values (e.g. `1,240` events/min, `12s` freshness) are baked as constants in
  `TelemetryFooter`; only the labels are i18n keys.
- The `NavItem`↔`button` `usageRole: "action-trigger"` collision is an **expected** advisory Stage-4
  escalation (`ds:escalations`), not a blocking gate — recorded, not resolved here.

## Open Questions

none

## Security / NFR

N/A — no auth/crypto/PII/input-parsing surface. Presentational chrome only; the shell fetches nothing
(ADR 0083). NFR: a11y is the primary quality axis (axe gate, both themes) and is an acceptance criterion;
no new dependency (no supply-chain / license delta).

## Critic Verdict & Overrides

marvin-tm-spec-critic round 1: **BLOCK** (2 blockers) → revised → round 2: **PASS WITH WARNINGS** (both
blockers cleared, verified against the files). Resolutions: (1) dropped the `@radix-ui/react-slot` scoped
dep in favor of the existing `radix-ui` umbrella `Slot` (critic confirmed `radix-ui@1.5.0` exports `Slot`,
not `Slottable`; marker EXTENSION → NATIVE; removed the package.json/lockfile files and the dep-framed
AC); (2) AC3 oracle `check:graph` → `check:design-system` so it also runs `check:design-intent`'s
`meta.usedIn ≠ graph` check (catches a forgotten `card.design-intent` edit). Warnings folded in: AC2 made
discriminating (→`check:tokens`); F22 global-toolbar blast radius + Phase-A `mcTheme` coexistence +
broadened Chromatic re-baseline documented; Panel light story added (F29); F2/F6 `meta.usedIn` explicit.
Residual (advisory, accepted): F22's repo-wide axe re-run is the actual proof of the `[data-theme]`/`mcTheme`
coexistence; ADR 0100 acceptance timing (3rd `data-display` consumer) is left to the human.

## Design Notes

- **Largest risk is `check:graph`/`check:design-intent` reconciliation**, not the CSS. The coupled edits
  (F17–F21) must be exact: `card.usedIn` loses `ProjectHub`, `panel.usedIn` gains it, `mono-data` +
  `status-indicator` gain `telemetry-stat.tsx`, and the two new nodes' `usedIn` point at their consumers.
- **Palette discipline:** verify each re-skinned file's **dark AND light story under axe** before
  assuming clean — the trap is invisible to `check:tokens`/`check:contrast`.
- **F22 blast radius:** wiring the global toolbar to `[data-theme]` affects every story, not just
  Phase-B's. It coexists with the merged Phase-A primitives' local per-story `mcTheme` decorators (the
  nearest-ancestor `[data-theme]` wins for a subtree), but it newly renders Panel's light story under
  the light composition for the first time — hence F29 adds Panel's light coverage — and broadens the
  human Chromatic re-baseline to the globally-affected stories.
- `ProjectHub.test.tsx`'s "renders a card link per surface" assertion name becomes a harmless post-Panel
  misnomer; it still passes (role/text-based) and is left out of scope (not in the allowlist).
- **Big but coherent PR (~27 files).** If review finds it unwieldy, the natural split is a
  primitives-first PR (F1–F8, F17–F21, F29) then the shell-consumption PR — mirroring Phase A's
  foundation-first rhythm. Kept as one PR here to honor "one reviewable PR per phase"; the split is the
  fallback.
- Advisory design-system loop before authoring each primitive: `ds:signature` (duplicate check),
  `ds:states` (mandatory state set), `ds:escalations` (usageRole collisions).

## Future Considerations

- The extracted `NavItem` / `TelemetryStat` are reused by the events-explorer (Phase C) and the Overview
  bento (Phase D); their `usedIn` grows there.
- If the telemetry footer should later show live values, that is a Phase-D-style data surface (new RPC),
  recorded as a separate spec — not a footer edit.
- ADR 0100 (`data-display`) acceptance is a human-only gate; this phase widens code dependence on it
  (third consumer). Worth the human confirming the acceptance timing (flagged, not decided here).

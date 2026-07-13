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

| Phase | Theme                                                           | State         | PR                                                 | Updated    |
| ----- | --------------------------------------------------------------- | ------------- | -------------------------------------------------- | ---------- |
| 0     | Accept ADR 0099 (human-only) + CLAUDE.md sync                   | ✅ done       | —                                                  | 2026-07-13 |
| A     | Skin foundation — console primitives + stories                  | ✅ done       | —                                                  | 2026-07-13 |
| B     | App shell re-skin (`app-shell`)                                 | ✅ done       | [#35](https://github.com/real-case/capcom/pull/35) | 2026-07-13 |
| C     | Events explorer re-skin (`events-explorer`)                     | ☐ not started | —                                                  | —          |
| D     | Overview home (`overview-dashboard` + KPI RPCs)                 | ☐ not started | —                                                  | —          |
| E     | Remaining widgets (funnel/retention/segment/trends) + seam docs | ☐ not started | —                                                  | —          |

Legend: ☐ not started · 🔧 in progress · ✅ done · ⛔ blocked (note why).

## Resume point

**Next step:** Phase C — Events explorer re-skin (`src/widgets/events-explorer`). Re-skin the shipped
flagship (`EventsTable`, `EventsToolbar`, `FacetFilter`, `BulkActionsBar`, `ViewTabs`, `SaveViewPopover`,
`ColumnsMenu`, `GroupRollup`, `EventDetail`, `RelativeTime`) onto the mission-control surfaces + mono-data
values + status pills — **behavior unchanged** (the 0097/0098 filters / selection / saved-views / density
/ group-by). Reuse the Phase-B primitives (`Panel` / `NavItem` / `TelemetryStat` / `MonoData`) and the
now-global Storybook `[data-theme]` toolbar (wired in Phase B — stories use `globals: { theme }`, no local
`mcTheme` wrapper). Wire dense mode to `[data-density]` (ADR 0082). DoD: `check:contrast` · axe (dark +
light) · `design-intent` + story refresh · behavior tests green · human-approved **Chromatic re-baseline**.

**Watch in Phase C — the palette trap (confirmed live in Phase B):** `--text-tertiary` is **not**
AA-guaranteed for small text (axe flagged 3.99:1 on `--surface-background`). Use `--text-secondary` for
any small chrome text; `--text-tertiary` only for large/decorative. The **bespoke categorical pill**
deferred from Phase A also lands its decision here (the events plan pills / category chips are the concrete
use site — `badge`-through-surface vs a new mission-control categorical pill).

**Two 👤 decisions from Phase A — RESOLVED 2026-07-13** (implemented in the
`chore/ds-data-display-archetype` PR):

1. **StatusPill → reuse, no new component.** Severity uses `status-indicator` (already
   mission-control); category uses `badge`, themed through the console surface at the call site. A
   bespoke mission-control categorical pill is **deferred to Phase C**, where the events-explorer plan
   pills / category chips are the concrete use site that would fix its API. No new usage role added.
2. **`archetype` → added a `data-display` class** (👤 extension of ADR 0061's ratified vocabulary).
   `MetricHero` + `MonoData` reclassified `null → data-display` (mandates only contentBounds; data
   absence/loading stays the widget's job). **`Hairline` stays `null` — CONFIRMED** (a rule renders no
   value, so it fits no archetype). Landed in `archetypes.ts` / `states.ts` + the two design-intents +
   the graph.

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

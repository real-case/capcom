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

| Phase | Theme                                                           | State         | PR  | Updated    |
| ----- | --------------------------------------------------------------- | ------------- | --- | ---------- |
| 0     | Accept ADR 0099 (human-only) + CLAUDE.md sync                   | ✅ done       | —   | 2026-07-13 |
| A     | Skin foundation — console primitives + stories                  | ✅ done       | —   | 2026-07-13 |
| B     | App shell re-skin (`app-shell`)                                 | ☐ not started | —   | —          |
| C     | Events explorer re-skin (`events-explorer`)                     | ☐ not started | —   | —          |
| D     | Overview home (`overview-dashboard` + KPI RPCs)                 | ☐ not started | —   | —          |
| E     | Remaining widgets (funnel/retention/segment/trends) + seam docs | ☐ not started | —   | —          |

Legend: ☐ not started · 🔧 in progress · ✅ done · ⛔ blocked (note why).

## Resume point

**Next step:** Phase B — App shell re-skin (`src/widgets/app-shell`). Move `AppShell`, `SidebarNav`,
`CommandPalette`, `ProjectHub` chrome onto the mission-control surfaces using the Phase-A primitives
(`Panel` / `Hairline` / `MonoData` / `MetricHero`); add the telemetry footer. **Before starting**, wire
the Storybook theme toolbar to drive `[data-theme]` (not only `.dark`) so the app-shell chrome flips
light/dark in the workbench like production (Phase A stories work around this with per-story
`[data-theme="light"]` wrappers — see the Phase-A log). Phase B DoD adds axe + a **human-approved
Chromatic re-baseline**.

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

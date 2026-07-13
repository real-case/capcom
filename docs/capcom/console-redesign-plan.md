# CAPCOM — mission-control console re-skin · implementation plan

> **Decision of record:** [ADR 0099 — Mission-control product console: the authenticated app
> adopts the instrument-panel surface](../decisions/0099-mission-control-product-console-surface.md)
> (status: **proposed** — awaiting the human acceptance gate).
> **Design source of truth:** the combined build reference —
> `https://claude.ai/code/artifact/4be7123e-90c9-482c-b631-903ca889cf02` — built on the real
> ADR 0081 tokens (bento Overview + Events explorer as one instrument panel).
> **Progress is tracked in** [`console-redesign-progress.md`](./console-redesign-progress.md).

## What this delivers

The authenticated **product console** (app shell + analytics widgets) moves off the neutral shadcn
chrome onto the **mission-control instrument-panel surface** it already uses for charts, so chrome
and data-viz read as one surface. Zero new tokens; theme-aware (light/dark per ADR 0092); density +
tenant swaps preserved (ADR 0082). Marketing/landing and auth stay on the shadcn value layer — a
deliberate, documented seam.

## Working agreement (READ THIS)

- **After every phase, update [`console-redesign-progress.md`](./console-redesign-progress.md)
  before opening the PR** — status, date, what landed, gate results, and the next concrete step.
  This is a Definition-of-Done item in every phase below, not an afterthought. A phase is not
  "done" until its progress row and log entry are written.
- **Human-only gates** never move without a person: accepting ADR 0099, approving each Chromatic
  visual re-baseline, and merging into `dev`. The agent implements up to those gates and stops.
- **Foundation-first, one reviewable PR per phase.** No phase starts until the prior phase's gates
  are green and its progress entry is written.

## The rhythm each phase follows

```
gates green (tsc · lint · check:tokens · check:contrast · check:fsd · check:boundaries ·
             check:design-system · test:coverage ≥80% · build)
      │
Chromatic re-baseline  ◄── human-approved (agent never approves its own baseline)
      │
update console-redesign-progress.md   ◄── REQUIRED, before the PR
      │
human-reviewed PR ──► dev
```

---

## Phase 0 — Accept ADR 0099 (human-only)

- **Goal:** ratify the decision so code may depend on it.
- **Steps (human):** `python3 .claude/skills/adr/scripts/adr.py accept 0099` → run the
  `adr-sync-claude-md` skill so CLAUDE.md's Stack / Conventions / Restrictions pick up the record.
- **DoD:** ADR 0099 status `accepted`; CLAUDE.md synced; `adr.py lint` clean; **progress doc
  updated** (Phase 0 → done).
- **Blocking:** the agent does not set `accepted` and does not start Phase A until this is done.

## Phase A — Skin foundation (tokens + console primitives)

- **Goal:** make the mission-control surface vocabulary safe to wear as chrome in **both** themes,
  and provide the shared console primitives — **no widget re-skin yet**.
- **Scope:**
  - Verify / build the **light composition** of the `--c-*` surface + text layer so
    `--surface-*` / `--text-*` clear WCAG 2.2 AA in the light theme (this is the crux — see Risks).
  - Add console-surface primitives to the kit (e.g. `Panel`, `MetricHero`, `StatusPill`,
    `MonoData`, `Hairline`), themed only through mission-control semantic tokens.
- **DoD / gates:** `check:contrast` green in **both** compositions · `gen:tokens` swap-only self-test
  unchanged (no new semantic names) · `check:tokens` clean · stories for each new primitive (dark +
  light) · **progress doc updated**.

## Phase B — App shell re-skin (`src/widgets/app-shell`)

- **Goal:** the frame everything sits in wears the instrument panel.
- **Scope:** `AppShell`, `SidebarNav`, `CommandPalette`, `ProjectHub` chrome → mission-control
  surfaces; add the telemetry footer (Ingestion / RLS / freshness / events-min) as reference dressing.
- **DoD / gates:** dark **and** light stories · axe a11y gate (ADR 0039) · `check:contrast` ·
  human-approved **Chromatic re-baseline** · **progress doc updated**.

## Phase C — Events explorer re-skin (`src/widgets/events-explorer`)

- **Goal:** re-skin the shipped flagship to match its concept 1:1 — **behavior unchanged** (the
  filters / selection / saved views / density / group-by from ADR 0097/0098).
- **Scope:** `EventsTable`, `EventsToolbar`, `FacetFilter`, `BulkActionsBar`, `ViewTabs`,
  `SaveViewPopover`, `ColumnsMenu`, `GroupRollup`, `EventDetail`, `RelativeTime` → mission-control
  surfaces + mono-data values + status pills; wire dense mode to `[data-density]` (ADR 0082).
- **DoD / gates:** `check:contrast` · axe · `design-intent.ts` + story refresh · behavior tests still
  green · human-approved **Chromatic re-baseline** · **progress doc updated**.

## Phase D — Overview home (new `src/widgets/overview-dashboard`)

- **Goal:** the curated bento console home — first-class, distinct from user-composed dashboards
  (ADR 0090).
- **Scope:**
  - Migration: KPI aggregations as `SECURITY INVOKER` RPCs under ADR 0084 (active users, new
    sign-ups, conversion, ARPU, goal pacing), RLS via the membership join (ADR 0083); `gen:types`.
  - New widget: bento grid of KPI cards + signal charts (visx, ADR 0086/0093) fed reduced rows via
    TanStack Query; new "Overview" section in the shell nav.
- **DoD / gates:** RLS test on the new RPCs · no aggregation in app code (ADR 0084) · state coverage
  empty/loading/error (ADR 0061/0062) · axe · human-approved **Chromatic re-baseline** ·
  FSD boundaries (ADR 0066/0060) · **progress doc updated**.

## Phase E — Remaining analytics widgets + seam docs

- **Goal:** finish the surface so nothing in the console is half-themed.
- **Scope:** re-skin `funnel-builder`, `retention-grid`, `segment-builder`, `trends` (may split
  per-widget if diffs are large); document the marketing↔console palette **seam** so contributors
  never cross-pair the two palettes (the token-palette trap).
- **DoD / gates:** final `check:contrast` / axe / Chromatic sweep · seam documented ·
  **progress doc updated** · initiative marked complete.

---

## Risks & decisions

- **PR-A is the crux, not cosmetics.** Everything rides on whether the mission-control **surface/text**
  set is AA-legible in the **light** theme. Project lore: that set is "fixed-dark and pairs only with
  itself." If ADR 0092's light composition does not already cover surface/text, building it **is** the
  Phase-A work — otherwise the light theme fails `check:contrast` / axe across the whole console.
- **Broad diff.** Every analytics widget's className surface changes; expect Chromatic snapshot churn
  and AA regressions caught by the gates. Each re-baseline is human-approved (ADR 0043/0095).
- **Two visual worlds on purpose.** Marketing (shadcn, statically generated, ADR 0031/0096) vs console
  (mission-control). Phase E documents the seam.

## Sequencing rationale

Shell first (frames everything) → Events explorer next (already shipped, matches its concept 1:1,
lowest new-surface risk) → Overview (new surface **and** new RPCs, higher risk, benefits from the
primitives proven in A–C) → the rest. Each phase is independently shippable to `dev`.

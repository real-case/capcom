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
| A     | Skin foundation — console primitives + stories                  | ☐ not started | —   | —          |
| B     | App shell re-skin (`app-shell`)                                 | ☐ not started | —   | —          |
| C     | Events explorer re-skin (`events-explorer`)                     | ☐ not started | —   | —          |
| D     | Overview home (`overview-dashboard` + KPI RPCs)                 | ☐ not started | —   | —          |
| E     | Remaining widgets (funnel/retention/segment/trends) + seam docs | ☐ not started | —   | —          |

Legend: ☐ not started · 🔧 in progress · ✅ done · ⛔ blocked (note why).

## Resume point

**Next step:** Phase A — Skin foundation. Add the console-surface primitives to the kit (`Panel`,
`MetricHero`, `StatusPill`, `MonoData`, `Hairline`), themed **only** through the mission-control
semantic tokens, each with a dark + light story. Run the Phase A gates: `check:contrast` (both
themes) · `gen:tokens` swap-only self-test (must stay unchanged — no new semantic names) ·
`check:tokens` · stories.

**Resolved — the Phase-A crux (read-only check, 2026-07-13):** ADR 0092's light composition
**already** makes the mission-control `--surface-*` / `--text-*` set AA-legible in the light theme —
`check:contrast` is green in **both** compositions today (all 8 pairs, incl. the four surface/text
pairs). So Phase A does **not** need to build a light composition; it is primitive + story work. Watch
the light _status_ pairs (tightest ≈ 4.79 : 1 vs the 4.5 minimum) when adding any new status pair.

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

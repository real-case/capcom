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

| Phase | Theme                                                           | State         | PR  | Updated |
| ----- | --------------------------------------------------------------- | ------------- | --- | ------- |
| 0     | Accept ADR 0099 (human-only) + CLAUDE.md sync                   | ☐ not started | —   | —       |
| A     | Skin foundation — light composition + primitives                | ☐ not started | —   | —       |
| B     | App shell re-skin (`app-shell`)                                 | ☐ not started | —   | —       |
| C     | Events explorer re-skin (`events-explorer`)                     | ☐ not started | —   | —       |
| D     | Overview home (`overview-dashboard` + KPI RPCs)                 | ☐ not started | —   | —       |
| E     | Remaining widgets (funnel/retention/segment/trends) + seam docs | ☐ not started | —   | —       |

Legend: ☐ not started · 🔧 in progress · ✅ done · ⛔ blocked (note why).

## Resume point

**Next step:** Phase 0 — the human accepts ADR 0099
(`python3 .claude/skills/adr/scripts/adr.py accept 0099`, then run the `adr-sync-claude-md` skill).
The agent does **not** set `accepted` and does **not** start Phase A until 0099 is accepted and
CLAUDE.md is synced.

**Open question to resolve in Phase A:** does ADR 0092's light composition already make the
mission-control `--surface-*` / `--text-*` set AA-legible in the **light** theme, or must that light
composition be built? This determines Phase A's true size (see the plan's Risks).

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

_(no entries yet — the first will be written when Phase 0 completes)_

## Environment reminders (shared with the whole-project PROGRESS.md)

- **Node 24 required**; local Supabase needs Docker (`npx supabase start`).
- Dev server: `npm run dev` → **http://localhost:20000** (use `localhost`, not `127.0.0.1`, or the
  client islands don't hydrate in Next 16 dev).
- Design-system gates for this initiative: `npm run check:contrast` (both themes),
  `npm run check:tokens`, `npm run check:design-system`, `npm run gen:tokens` (swap-only self-test),
  plus the standard `tsc` / `lint` / `test:coverage ≥80%` / `build`. Chromatic re-baseline is
  **human-approved** (ADR 0043/0095).

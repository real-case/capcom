---
name: capcom-primitive-kit-conventions
description: sound, repo-blessed patterns in capcom src/components/ui stories — don't flag these as findings
metadata:
  type: project
---

Patterns in the CAPCOM primitive kit that are **correct** and should NOT be flagged in review:

- **Chromatic freeze** lives in `.storybook/preview.tsx` `freezeForSnapshot` decorator, gated on
  `isChromatic()`: disables animation/transition duration+delay and hides caret. So "transient
  fade/zoom frozen for Chromatic (ADR 0043)" demoRationales are accurate. CSS animation is frozen;
  **JS timers are NOT** (relevant for sonner toast auto-dismiss — that one IS a real determinism risk).

- **Portalled content assertion style (blessed by the author, sound):** query Radix/cmdk portalled
  content via `screen` (not `within(canvasElement)`), and assert appearance with
  `toBeInTheDocument()` rather than `toBeVisible()` — deliberately, to avoid racing the enter
  animation. This is correct: `toBeVisible()` would flake on the un-frozen (non-Chromatic) browser
  test run. Do not "upgrade" these to toBeVisible.

- **cmdk `aria-required-children` opt-out** (command + combobox meta `a11y` param): legitimate.
  cmdk's `CommandList` is `role="listbox"` wrapping a role-less `<div cmdk-list-sizer>` (a
  ResizeObserver sizer) around the `role="option"` rows, so options aren't direct DOM children of
  the listbox → trips axe's strict rule though options ARE exposed (role=option, aria-selected,
  aria-disabled, listbox has aria-activedescendant). Only that one rule is disabled; rest of axe
  runs. Verified against node_modules/cmdk/dist. Sound ADR 0039 opt-out.

- **dropdown-menu `modal={false}` in stories** — a test-harness accommodation (modal mode's
  body pointer-events:none / aria-hidden-siblings interferes with axe + `screen` queries in the
  isolated story canvas). Downside worth noting in review: it tests a non-default modality, so the
  play proves behavior under modal={false}, not the production default (modal). Not blocking.

- **Calendar/date-range determinism** is done via react-day-picker's `today` + `defaultMonth` +
  fixed `selected`/`RANGE` constants (`new Date(2026,6,x)`), which OVERRIDE `new Date()`. Watch:
  DateRangePicker passes `defaultMonth={value?.from}` — when opened with no value it falls back to
  `new Date()`. Current stories are safe only because the no-value stories keep the popover closed.
  A future "open, empty" story would flake.

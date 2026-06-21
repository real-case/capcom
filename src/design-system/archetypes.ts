/**
 * Controlled component-class dictionary (ADR 0061). The closed set of structural
 * *classes* a component can belong to — the anchor for state-coverage acceptance
 * (each archetype maps to a mandatory state set in `states.ts`).
 *
 * 👤 Human-authored (ADR 0046): the agent never adds a class on its own. A
 * component fitting no archetype is a human escalation (a new archetype is a
 * design-system decision), never an agent default. A story or `design-intent.ts`
 * (ADR 0062) referencing an unknown archetype fails `tsc --noEmit` — the typed-
 * vocabulary guarantee that broken references can't ship silently.
 *
 * **Ratified baseline (2026-06-11)**, transcribed from the plan's Appendix A1 /
 * ADR 0061; extend via the same 👤 process. The trailing comment on each line lists
 * illustrative members (not an exhaustive mapping).
 */
export const ARCHETYPES = [
  "action-trigger", // button, icon-button, link
  "text-input", // input, textarea, search
  "selection-control", // checkbox, radio, switch
  "categorical-indicator", // badge, tag, chip
  "collection", // list, table, grid, menu
  "container", // card, panel, dialog, sheet
  "feedback", // alert, toast, banner
  "navigation", // tabs, breadcrumb, stepper
  "media", // avatar, image, thumbnail
  "disclosure", // accordion, popover, tooltip
] as const;

export type Archetype = (typeof ARCHETYPES)[number];

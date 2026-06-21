/**
 * Controlled vocabulary of USAGE ROLES (ADR 0061) — the closed list of *intents*
 * a component serves, independent of its structural class (`archetypes.ts`). Two
 * components in the same role under different names is an intent collision the
 * Stage-4 human gate resolves (problem P3); the role also feeds API derivation
 * (ADR 0062).
 *
 * THE bottleneck artifact of the whole design-system plan: it CANNOT be generated —
 * it encodes which categories of intent the product recognises, and is 👤
 * human-authored (ADR 0046).
 *
 * **Ratified baseline (2026-06-11).** This seed set is ratified as the working
 * vocabulary; the product's real intent roles are filled in here as they emerge.
 * Adding a role is trivial; renames/merges/splits are a governed migration of every
 * referencing intent file (ADR 0064). Keep the list well-calibrated: too coarse and
 * real distinctions collapse (dedup escalates everything to a human); too fine and
 * you get false collisions and noise — every new role must be genuinely distinct.
 */
export const USAGE_ROLES = [
  "action-trigger", // initiates an action — submit, navigate, open
  "selection-control", // toggles or selects a value — checkbox, radio, switch
  "text-input", // free-form text entry
  "categorical-status-indicator", // communicates a discrete status / category — badge, tag
  "risk-level-indicator", // communicates an ordered severity / risk level
] as const;

export type UsageRole = (typeof USAGE_ROLES)[number];

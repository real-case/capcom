/**
 * State-precedence matrix (ADR 0061) — how states resolve under SIMULTANEITY,
 * decided once and system-wide so no component re-litigates it per instance
 * (problems P2/P8). 👤 Human-authored.
 *
 * **Ratified 2026-06-11** — every rule below is ratified (`ratified: true`). The
 * `ratified` flag remains in the type so a future *added* rule can land as a proposed
 * default (`false`) pending human sign-off without changing the shape.
 */

/** Ordered precedence — when states co-occur, the earlier entry's treatment wins. */
export const STATE_PRECEDENCE = [
  "focus-visible", // visible focus must never be hidden — always wins (ADR 0039)
  "disabled", // suppresses hover / active affordances
  "loading", // in-flight async; blocks input but keeps its own affordance
  "invalid", // validation error
  "read-only",
  "selected",
  "active",
  "hover",
] as const;

export type PrecedenceState = (typeof STATE_PRECEDENCE)[number];

export interface SimultaneityRule {
  /** The two co-occurring states this rule arbitrates. */
  readonly when: readonly [string, string];
  /** Which state's treatment is rendered. */
  readonly resolve: string;
  readonly rationale: string;
  /** false ⇒ a PROPOSED default awaiting 👤 ratification (ADR 0061). */
  readonly ratified: boolean;
}

export const SIMULTANEITY_RULES: readonly SimultaneityRule[] = [
  {
    when: ["focus-visible", "disabled"],
    resolve: "focus-visible",
    rationale:
      "Visible focus must survive every other state for keyboard a11y (ADR 0039).",
    ratified: true,
  },
  {
    when: ["disabled", "hover"],
    resolve: "disabled",
    rationale: "A disabled control offers no hover affordance.",
    ratified: true,
  },
  {
    when: ["disabled", "active"],
    resolve: "disabled",
    rationale: "A disabled control cannot be activated.",
    ratified: true,
  },
  {
    when: ["loading", "disabled"],
    resolve: "loading",
    rationale:
      "Loading implies blocked interaction but keeps its own affordance (spinner): render the loading treatment and suppress input.",
    ratified: true,
  },
  {
    when: ["invalid", "read-only"],
    resolve: "invalid",
    rationale:
      "Surface the validation error even when read-only so the reason stays visible.",
    ratified: true,
  },
  {
    when: ["selected", "hover"],
    resolve: "selected",
    rationale:
      "Selection is the stronger, persistent signal; hover layers on without overriding it.",
    ratified: true,
  },
] as const;

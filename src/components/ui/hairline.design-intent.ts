import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Hairline — presentational leaf, `archetype: null` (ADR 0061/0062). A 1px rule on the
 * hairline / divider token (ADR 0099/0081) separating console regions, panel sections,
 * and table rows. Like `skeleton` it belongs to no structural archetype and serves no
 * tracked usage role, so it carries no mandatory state set. Decorative by default (no
 * role); `role="separator"` passes through for the semantic case. `orientation` and
 * `tone` are closed axes. The null classification is a 👤 confirmation point (ADR 0061)
 * — flagged in the PR. No interaction axis ⇒ no play required (ADR 0038).
 */
export const hairlineIntent = {
  meta: {
    id: "hairline",
    kind: "primitive",
    archetype: null,
    compositionSignature: [],
    composedOf: [],
    usedIn: [],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The closed orientation/tone axes live in api.variants; (archetype:null) no archetype states. Consumed by the app-shell / events-explorer re-skin in Phases B–C (usedIn empty until then).",
  },
  states: [],
  combinations: {
    orthogonalAxes: ["orientation", "tone"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [],
    variants: [
      {
        prop: "orientation",
        values: ["horizontal", "vertical"],
        rationale:
          "A fixed axis sizing the rule (1px tall full-width vs 1px wide full-height) — a closed axis, not a slot.",
      },
      {
        prop: "tone",
        values: ["hairline", "divider"],
        rationale:
          "A fixed mapping to the two structure tokens (--color-border-hairline vs the heavier --color-divider, ADR 0081) — a closed axis.",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["role", "aria-orientation", "aria-label"],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

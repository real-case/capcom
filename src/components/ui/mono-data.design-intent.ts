import type { DesignIntent } from "@/design-system/design-intent";

/**
 * MonoData — presentational leaf, `archetype: null` (ADR 0061/0062). An inline tabular
 * numeric/technical value in the geist-mono face at the `mono-data` type role (ADR
 * 0099/0081) — event ids, counts, timestamps, deltas — with tabular figures so columns
 * align. Like `skeleton` / `label` it belongs to no structural archetype and serves no
 * tracked usage role, so it carries no mandatory state set. The `tone` prop is a closed
 * axis over the text hierarchy. The null classification is a 👤 confirmation point (ADR
 * 0061) — flagged in the PR. No interaction axis ⇒ no play required (ADR 0038).
 */
export const monoDataIntent = {
  meta: {
    id: "mono-data",
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
      "Claude Design references not wired (👤, ADR 0094/0095). The closed tone axis lives in api.variants; (archetype:null) no archetype states. Consumed by the events-explorer / overview re-skin in Phases C–D (usedIn empty until then).",
  },
  states: [],
  combinations: {
    orthogonalAxes: ["tone"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "children",
        rationale:
          "The value is open content (a formatted number/string), injected as children — not a closed axis.",
      },
    ],
    variants: [
      {
        prop: "tone",
        values: ["primary", "secondary"],
        rationale:
          "A fixed mapping to the AA-verified text roles (primary/secondary) over the surfaces (ADR 0081/0092; check:contrast) — a closed axis, not a slot. --text-tertiary is intentionally excluded (not AA-guaranteed for small text).",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label"],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

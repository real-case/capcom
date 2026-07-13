import type { DesignIntent } from "@/design-system/design-intent";

/**
 * MetricHero — presentational leaf, `archetype: null` (ADR 0061/0062). A large KPI value
 * (the console's headline metric) in the geist-mono numeric face at the `metric-hero`
 * type role, with an optional label above (ADR 0099/0081). Like `skeleton` / `label` it
 * belongs to no structural archetype and serves no tracked usage role, so it carries no
 * mandatory state set. The null classification is a 👤 confirmation point (ADR 0061) —
 * flagged in the PR. No interaction axis ⇒ no play required (ADR 0038).
 */
export const metricHeroIntent = {
  meta: {
    id: "metric-hero",
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
      "Claude Design references not wired (👤, ADR 0094/0095). A single metric treatment; no variant axis and (archetype:null) no archetype states. Consumed by the Overview home KPI cards in Phase D (usedIn empty until then).",
  },
  states: [],
  combinations: {
    orthogonalAxes: [],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "children",
        rationale:
          "The metric value is open content (a formatted number/string), injected as children — not a closed axis.",
      },
      {
        name: "label",
        rationale:
          "The caption above the value is optional open content (what the metric measures) — a content slot, not a closed variant.",
      },
    ],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label", "aria-labelledby"],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

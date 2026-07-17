import type { DesignIntent } from "@/design-system/design-intent";

/**
 * MetricHero — `data-display` archetype / no usage role (ADR 0061/0062; the `data-display`
 * class added 2026-07-13 for the mission-control value leaves, ADR 0099). A large KPI value
 * (the console's headline metric) in the geist-mono numeric face at the `metric-hero` type
 * role, with an optional label above (ADR 0099/0081). A presentational value leaf
 * (compositionSignature []); `data-display` mandates only the contentBounds axis — the
 * absence / loading / error of the DATA is the composing widget's job (a Skeleton swap /
 * empty state), not this leaf. No interaction axis ⇒ no play required (ADR 0038).
 */
export const metricHeroIntent = {
  meta: {
    id: "metric-hero",
    kind: "primitive",
    archetype: "data-display",
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/widgets/overview-dashboard/ui/HeroChart.tsx",
      "src/widgets/overview-dashboard/ui/PacingCard.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). A single metric treatment; no variant axis. Consumed by the Overview home KPI cards in Phase D (usedIn empty until then).",
  },
  states: [
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-text-primary"],
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "LongValue",
      worstCaseForOverflow: true,
    },
    {
      name: "line-wrap",
      applicable: false,
      rationale:
        "The value is a single number/token rendered whitespace-nowrap; it never wraps. An over-wide value is the composing widget's layout concern (compact formatting / scaling), not the leaf (ADR 0058/0099).",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The leaf grows to its value; truncating or scaling an over-wide metric is the widget's concern, not the leaf's (ADR 0058).",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "CJK unit suffixes / labels render via the same single-line path; the leaf imposes no script-specific layout.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the metric adds no directional layout of its own.",
    },
  ],
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

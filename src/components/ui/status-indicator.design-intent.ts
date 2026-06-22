import type { DesignIntent } from "@/design-system/design-intent";

/**
 * StatusIndicator — `categorical-indicator` / `risk-level-indicator` (ADR 0061/0062).
 * Same structural archetype as Badge but a DISTINCT usage role: an ordered severity
 * signal on the mission-control status palette (ADR 0081), not an open category label.
 * A presentational leaf (compositionSignature []); only contentBounds is mandatory, so
 * no play is required (ADR 0038). The ordered levels are the closed `level` axis.
 */
export const statusIndicatorIntent = {
  meta: {
    id: "status-indicator",
    kind: "primitive",
    archetype: "categorical-indicator",
    compositionSignature: [],
    composedOf: [],
    usedIn: [],
  },
  usageRole: "risk-level-indicator",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Figma frames not wired (👤, ADR 0045/0063). The ordered level axis lives in api.variants; per-variant frames + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // contentBounds axis (the only mandatory axis for categorical-indicator).
    {
      name: "min-content",
      applicable: true,
      demoStory: "Nominal",
      tokens: ["--color-status-nominal-fg", "--color-status-nominal-bg"],
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "LongLabel",
      worstCaseForOverflow: true,
    },
    {
      name: "line-wrap",
      applicable: false,
      rationale:
        "The indicator is single-line by design (whitespace-nowrap); it never wraps.",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The indicator sizes to its content (w-fit); truncating an over-long label is the composing container's responsibility, not the primitive (ADR 0058).",
    },
    {
      name: "cjk",
      applicable: true,
      demoStory: "CJK",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the indicator adds no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["level"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [],
    variants: [
      {
        prop: "level",
        values: ["nominal", "caution", "warning", "critical"],
        rationale:
          "A fixed, ORDERED severity scale (nominal → critical) — a closed axis, not a slot.",
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

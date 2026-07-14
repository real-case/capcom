import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Badge — `categorical-indicator` / `categorical-status-indicator` (ADR 0061/0062).
 * A presentational leaf (compositionSignature []). Only the contentBounds axis is
 * mandatory for this archetype; the interaction axis is conditional ("interactive
 * variant") and not exercised here, so no play is required (ADR 0038). Category
 * values are the closed `variant` axis, not states.
 */
export const badgeIntent = {
  meta: {
    id: "badge",
    kind: "primitive",
    archetype: "categorical-indicator",
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/app/[locale]/(app)/p/[projectId]/page.tsx",
      "src/app/[locale]/(app)/p/page.tsx",
      "src/components/ui/category-pill.tsx",
      "src/widgets/dashboard/ui/DashboardBoard.tsx",
      "src/widgets/events-explorer/ui/EventsToolbar.tsx",
      "src/widgets/events-explorer/ui/FacetFilter.tsx",
    ],
  },
  usageRole: "categorical-status-indicator",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Figma frames not wired (👤, ADR 0045/0063). Closed axes are api.variants; per-variant frames + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // contentBounds axis (the only mandatory axis for categorical-indicator).
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
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
        "A badge is single-line by design (whitespace-nowrap); it never wraps.",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The badge sizes to its content (w-fit); truncating an over-long label is the composing container's responsibility, not the primitive (ADR 0058).",
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
        "Direction is inherited from the document; the badge adds no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["variant"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [],
    variants: [
      {
        prop: "variant",
        values: ["default", "secondary", "destructive", "outline"],
        rationale:
          "A fixed, finite set of category intents — a closed axis, not a slot.",
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

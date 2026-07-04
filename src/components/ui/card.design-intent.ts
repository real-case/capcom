import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Card — `container` / no usage role (ADR 0061/0062). A presentational surface that
 * groups related content (header/title/description/action/content/footer slots); a leaf
 * primitive (compositionSignature []). `container` mandates only the contentBounds axis.
 * The `size` prop is a closed density axis (default/sm). No interaction axis ⇒ no play
 * required (ADR 0038).
 */
export const cardIntent = {
  meta: {
    id: "card",
    kind: "primitive",
    archetype: "container",
    compositionSignature: [],
    composedOf: [],
    usedIn: ["src/widgets/app-shell/ui/ProjectHub.tsx"],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The closed density axis lives in api.variants; per-variant references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-card", "--color-card-foreground"],
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "LongContent",
      worstCaseForOverflow: true,
    },
    {
      name: "line-wrap",
      applicable: true,
      demoStory: "LongContent",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The card grows to fit its content; truncating an over-long value is a child's concern, not the container's (ADR 0058).",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The container imposes no script-specific layout; CJK content flows via the same wrapping path the LongContent story exercises.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the card adds no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["size"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "children",
        rationale:
          "The card body is an open composition slot (header/content/footer sub-parts); not a closed variant axis.",
      },
    ],
    variants: [
      {
        prop: "size",
        values: ["default", "sm"],
        rationale:
          "A fixed, finite density axis tied to the spacing rhythm (--card-spacing) — a closed axis, not a slot.",
      },
    ],
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

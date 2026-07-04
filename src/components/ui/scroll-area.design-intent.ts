import type { DesignIntent } from "@/design-system/design-intent";

/**
 * ScrollArea — `container` / no usage role (ADR 0061/0062). A Radix-backed viewport with
 * custom, token-styled scrollbars; a leaf primitive (compositionSignature []). `container`
 * mandates only the contentBounds axis — and overflow (content beyond the viewport) is the
 * component's entire reason to exist, so `max-content` is the worst case. No interaction
 * axis ⇒ no play required (ADR 0038).
 */
export const scrollAreaIntent = {
  meta: {
    id: "scroll-area",
    kind: "primitive",
    archetype: "container",
    compositionSignature: [],
    composedOf: [],
    usedIn: [],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The scroll orientation is a positional prop on ScrollBar, not a design variant; per-state references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    {
      name: "min-content",
      applicable: true,
      demoStory: "Fits",
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "Default",
      worstCaseForOverflow: true,
      tokens: ["--color-border"],
    },
    {
      name: "line-wrap",
      applicable: false,
      rationale:
        "A scroll-area scrolls overflow rather than wrapping it; whether children wrap is the child's concern, not the viewport's.",
    },
    {
      name: "truncation",
      applicable: false,
      rationale: "The viewport scrolls overflow; it never truncates content.",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The viewport imposes no script-specific layout; CJK content scrolls via the same path the Default story exercises.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; Radix mirrors the scrollbar side automatically, so the primitive adds no directional layout.",
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
          "The scrolled content is an open composition slot; not a closed variant axis.",
      },
    ],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label", "aria-labelledby"],
    focusManagement:
      "Radix ScrollArea keeps the viewport keyboard-scrollable (focusable region); scrollbars are pointer affordances.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

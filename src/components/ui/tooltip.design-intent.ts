import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Tooltip — `disclosure` / no usage role (ADR 0061/0062). A Radix-backed transient
 * label revealed on hover/focus of its trigger; a leaf primitive (compositionSignature
 * []). The mandatory interaction + contentBounds axes plus the disclosure states are
 * covered by subtraction below; the interaction axis is mandatory, so the stories ship a
 * `play` (ADR 0038).
 */
export const tooltipIntent = {
  meta: {
    id: "tooltip",
    kind: "primitive",
    archetype: "disclosure",
    compositionSignature: [],
    composedOf: [],
    usedIn: [],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The tooltip exposes no closed design variant axis (side/align are positional props); per-state references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-foreground", "--color-background"],
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Hover on the trigger is a reveal path (alongside focus); the transient :hover pseudo-state is not capturable in a static story.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "Keyboard focus on the trigger also reveals the tooltip (a11y), driven by the play; the transient ring is not a static snapshot.",
      tokens: ["--color-ring"],
    },
    {
      name: "active",
      applicable: false,
      rationale:
        "A tooltip is read-only signage; its trigger has no pressed/active affordance that changes the surface.",
    },
    {
      name: "disabled",
      applicable: false,
      rationale:
        "The tooltip surface has no disabled state; a disabled trigger is the composing control's concern.",
    },
    {
      name: "read-only",
      applicable: false,
      rationale:
        "read-only is a text-input/selection concern; a tooltip carries no editable value (states.ts).",
    },
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "RichContent",
      worstCaseForOverflow: true,
    },
    {
      name: "line-wrap",
      applicable: true,
      demoStory: "RichContent",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The tooltip grows to fit its label (max-w-xs then wraps); it never truncates.",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The surface imposes no script-specific layout; CJK labels flow via the same wrapping path the RichContent story exercises.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the tooltip adds no directional layout of its own.",
    },
    {
      name: "collapsed",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "expanded",
      applicable: true,
      demoStory: "Open",
    },
    {
      name: "transitioning",
      applicable: true,
      demoRationale:
        "The reveal/dismiss fade+zoom is transient (frozen for Chromatic, ADR 0043); not a static story state.",
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
          "The tooltip label is an open content slot (text or inline nodes), not a closed variant axis.",
      },
    ],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "both",
    ariaPassthrough: ["aria-label"],
    focusManagement:
      "Radix Tooltip wires the trigger's aria-describedby to the content and reveals on hover/focus, dismiss on Escape/blur.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

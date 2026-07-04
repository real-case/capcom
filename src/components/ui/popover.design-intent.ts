import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Popover — `disclosure` / no usage role (ADR 0061/0062). A Radix-backed floating
 * surface whose visibility is toggled by a trigger; a leaf primitive
 * (compositionSignature []) reused by the Combobox and DateRangePicker composites. The
 * mandatory interaction + contentBounds axes plus the disclosure states
 * (collapsed/expanded/transitioning) are covered by subtraction below; the interaction
 * axis is mandatory, so the stories ship a `play` (ADR 0038).
 */
export const popoverIntent = {
  meta: {
    id: "popover",
    kind: "primitive",
    archetype: "disclosure",
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/components/ui/combobox.tsx",
      "src/components/ui/date-range-picker.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The popover exposes no closed design variant axis (align/side are positional props, not variants); per-state design references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // interaction axis (mandatory for disclosure).
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-popover", "--color-popover-foreground"],
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Transient :hover on the trigger — the trigger is a Button; hover treatment is owned there, not by the disclosure surface.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "Transient :focus-visible ring on the trigger, exercised by the Toggle play (keyboard), not a static snapshot.",
      tokens: ["--color-ring"],
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state on the trigger; not reproducible in a static render.",
    },
    {
      name: "disabled",
      applicable: false,
      rationale:
        "The disclosure surface has no disabled state; a disabled trigger is the composing control's concern (the Button primitive owns `disabled`).",
    },
    {
      name: "read-only",
      applicable: false,
      rationale:
        "read-only is a text-input/selection concern; a disclosure carries no value to make read-only (states.ts).",
    },
    // contentBounds axis (mandatory).
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
        "The surface grows to fit its content and scrolls the composed list where needed; it never truncates its own children (that is the child's concern).",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The surface imposes no script-specific layout; CJK content flows via the same wrapping path the RichContent story exercises.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the surface adds no directional layout of its own (align/side mirror via Radix).",
    },
    // disclosure-specific states.
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
        "The open/close enter/exit animation is transient (frozen for Chromatic, ADR 0043); not capturable as a static story state.",
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
          "The floating surface is an open composition slot — arbitrary content (text, forms, a Command list); not a closed variant axis.",
      },
    ],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "both",
    ariaPassthrough: ["aria-label", "aria-labelledby"],
    focusManagement:
      "Radix Popover manages open/close, focus trap into the content, Escape-to-close, and return focus to the trigger.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

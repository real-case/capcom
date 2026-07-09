import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Button — `action-trigger` / `action-trigger` (ADR 0061/0062). A leaf primitive
 * (compositionSignature []); the mandatory interaction + contentBounds axes for the
 * archetype are covered by subtraction below. The interaction axis is mandatory, so
 * the stories ship a `play` (ADR 0038).
 */
export const buttonIntent = {
  meta: {
    id: "button",
    kind: "primitive",
    archetype: "action-trigger",
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/components/ui/calendar.tsx",
      "src/components/ui/combobox.tsx",
      "src/components/ui/date-range-picker.tsx",
      "src/features/ai-query/ui/AiQueryPanel.tsx",
      "src/features/auth-by-email/ui/SignInForm.tsx",
      "src/features/auth-by-email/ui/SignOutButton.tsx",
      "src/features/auth-by-email/ui/SignUpForm.tsx",
      "src/features/theme/ui/ThemeToggle.tsx",
      "src/widgets/dashboard/ui/DashboardBoard.tsx",
      "src/widgets/events-explorer/ui/BulkActionsBar.tsx",
      "src/widgets/events-explorer/ui/EventsToolbar.tsx",
      "src/widgets/events-explorer/ui/FacetFilter.tsx",
    ],
  },
  usageRole: "action-trigger",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Figma frames not wired (👤, ADR 0045/0063). Closed axes are api.variants; per-variant frames + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // interaction axis (mandatory for action-trigger).
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-primary", "--color-primary-foreground"],
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Transient :hover pseudo-state — not capturable in a static story; the hover treatment is the per-variant `hover:bg-*` token.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "Transient :focus-visible ring driven by the Keyboard play (Tab), not a static snapshot.",
      tokens: ["--color-ring"],
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state; not reproducible in a static render.",
    },
    {
      name: "disabled",
      applicable: true,
      demoStory: "Disabled",
    },
    {
      name: "read-only",
      applicable: false,
      rationale:
        "An action-trigger carries no value to make read-only; read-only is a text-input/selection concern (states.ts).",
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
      demoStory: "LongLabel",
      worstCaseForOverflow: true,
    },
    {
      name: "line-wrap",
      applicable: false,
      rationale:
        "Button labels are single-line (whitespace-nowrap); the primitive never wraps its label.",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The button sizes to its label; truncating an over-long label is the composing container's responsibility, not the primitive (ADR 0058).",
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
        "Direction is inherited from the document; the trigger introduces no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["variant", "size"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [],
    variants: [
      {
        prop: "variant",
        values: ["default", "secondary", "outline", "ghost", "destructive"],
        rationale:
          "A fixed, finite set of emphasis intents — a closed axis, not an open slot.",
      },
      {
        prop: "size",
        values: ["default", "sm", "lg", "icon"],
        rationale:
          "Discrete control heights tied to the density rhythm — a closed axis.",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label", "aria-pressed", "aria-disabled"],
    focusManagement:
      "Native <button> focus; visible ring via focus-visible:ring-ring.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

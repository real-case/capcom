import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Tabs — `navigation` / no usage role (ADR 0061/0062). A Radix-backed tablist that swaps
 * panels; a leaf primitive (compositionSignature []). `navigation` mandates the
 * interaction axis plus the nav-specific states (selected/current/complete); contentBounds
 * is a conditional (overflow) axis, not required. The interaction axis is mandatory, so the
 * stories ship a `play` (ADR 0038). `variant` (default/line) is a closed cva axis.
 */
export const tabsIntent = {
  meta: {
    id: "tabs",
    kind: "primitive",
    archetype: "navigation",
    compositionSignature: [],
    composedOf: [],
    usedIn: [],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The closed variant axis lives in api.variants; per-variant references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // interaction axis (mandatory for navigation).
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-muted", "--color-muted-foreground"],
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Transient :hover on a trigger raises it to text-foreground; not a static story state.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "Transient :focus-visible ring, exercised by the Switch play (keyboard arrow navigation), not a static snapshot.",
      tokens: ["--color-ring"],
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state on a trigger; not reproducible statically.",
    },
    {
      name: "disabled",
      applicable: true,
      demoStory: "WithDisabled",
    },
    {
      name: "read-only",
      applicable: false,
      rationale:
        "Navigation carries no editable value; read-only is a text-input/selection concern (states.ts).",
    },
    // navigation-specific states.
    {
      name: "selected",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "current",
      applicable: false,
      rationale:
        "aria-current marks the current step/page in a stepper or breadcrumb; a tablist marks its active tab aria-selected, not aria-current.",
    },
    {
      name: "complete",
      applicable: false,
      rationale:
        "'complete' is a stepper state (a finished step); a tablist has no completion semantics.",
    },
  ],
  combinations: {
    orthogonalAxes: ["variant"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "children",
        rationale:
          "TabsList/TabsTrigger/TabsContent are an open composition slot; not a closed variant axis.",
      },
    ],
    variants: [
      {
        prop: "variant",
        values: ["default", "line"],
        rationale:
          "A fixed, finite set of tablist treatments (filled segmented control vs. underlined) — a closed axis on TabsList.",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "both",
    ariaPassthrough: ["aria-label", "aria-labelledby", "aria-orientation"],
    focusManagement:
      "Radix Tabs wires roving-tabindex arrow-key navigation across triggers and tab/tabpanel roles + aria-selected.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

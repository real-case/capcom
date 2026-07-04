import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Calendar — `selection-control` / `selection-control` (ADR 0061/0062). A react-day-picker
 * date grid; a composite (compositionSignature [button]) — day cells and nav are styled
 * with the Button primitive's variants. `selection-control` mandates the interaction and
 * validation axes plus checked/unchecked/indeterminate: a selected day is `checked`, a
 * normal day `unchecked`, and an in-range day maps to `indeterminate`. Form-level validity
 * (invalid/warning) is the composing field's concern, marked inapplicable by
 * subtraction. Interaction is mandatory, so the stories ship a `play` (ADR 0038).
 */
export const calendarIntent = {
  meta: {
    id: "calendar",
    kind: "composite",
    archetype: "selection-control",
    compositionSignature: ["button"],
    composedOf: ["button"],
    usedIn: ["src/components/ui/date-range-picker.tsx"],
  },
  usageRole: "selection-control",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The calendar exposes no closed design variant axis (mode is behavioral); per-state references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // interaction axis (mandatory).
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-background", "--color-foreground"],
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Transient :hover on a day cell (ghost Button hover); not a static story state.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "react-day-picker roving-tabindex focus rings a day cell on arrow-key navigation; the transient ring is a pseudo-state not capturable in a static story.",
      tokens: ["--color-ring"],
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state on a day cell; not reproducible statically.",
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
        "The calendar is an interactive picker; a read-only date display is a separate presentation concern, not a mode of this grid.",
    },
    // validation axis.
    {
      name: "pristine",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "valid",
      applicable: true,
      demoStory: "Selected",
    },
    {
      name: "invalid",
      applicable: false,
      rationale:
        "Invalid is applied by the composing form field (aria-invalid on the control), not by the calendar grid itself.",
    },
    {
      name: "warning",
      applicable: false,
      rationale:
        "Warning is a form-field validation treatment owned by the composing control, not the calendar grid.",
    },
    // selection-control-specific states.
    {
      name: "checked",
      applicable: true,
      demoStory: "Selected",
      tokens: ["--color-primary", "--color-primary-foreground"],
    },
    {
      name: "unchecked",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "indeterminate",
      applicable: true,
      demoStory: "RangeMode",
      tokens: ["--color-muted"],
    },
  ],
  combinations: {
    orthogonalAxes: [],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "both",
    ariaPassthrough: ["aria-label", "aria-labelledby", "aria-invalid"],
    focusManagement:
      "react-day-picker manages the grid roles, arrow-key roving focus across day cells, and month navigation; selection is single/multiple/range via `mode`.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

import type { DesignIntent } from "@/design-system/design-intent";

/**
 * DateRangePicker — `selection-control` / `selection-control` (ADR 0061/0062). The premium
 * from/to range selector; a composite (compositionSignature [button, calendar, popover]) —
 * a Popover disclosure holding a range-mode Calendar, triggered by a Button.
 * `selection-control` mandates the interaction and validation axes plus
 * checked/unchecked/indeterminate: a complete range is `checked`, none is `unchecked`, and
 * a partial (from-only) range is `indeterminate`. Interaction is mandatory, so the stories
 * ship a `play` (ADR 0038).
 */
export const dateRangePickerIntent = {
  meta: {
    id: "date-range-picker",
    kind: "composite",
    archetype: "selection-control",
    compositionSignature: ["button", "calendar", "popover"],
    composedOf: ["button", "calendar", "popover"],
    usedIn: [],
  },
  usageRole: "selection-control",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The picker exposes no closed design variant axis; per-state references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // interaction axis (mandatory).
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-muted-foreground"],
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Transient :hover on the trigger (outline Button hover); not a static story state.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "Transient :focus-visible ring on the trigger, exercised by the Pick play (keyboard), not a snapshot.",
      tokens: ["--color-ring"],
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state on the trigger; not reproducible statically.",
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
        "The picker is an interactive control; a read-only range display is a separate presentation concern, not a mode of this control.",
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
        "The picker forwards aria-invalid to the trigger but renders no invalid treatment of its own; that is the composing form field's concern.",
    },
    {
      name: "warning",
      applicable: false,
      rationale:
        "Warning is a form-field validation treatment owned by the composing control, not the picker.",
    },
    // selection-control-specific states.
    {
      name: "checked",
      applicable: true,
      demoStory: "Selected",
    },
    {
      name: "unchecked",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "indeterminate",
      applicable: true,
      demoStory: "PartialRange",
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
        name: "asChild",
        rationale:
          "The disclosure trigger is projected onto the Button via Radix `asChild`, so the picker trigger inherits the Button's styling and focus behavior rather than nesting a second control.",
      },
    ],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "both",
    ariaPassthrough: ["aria-invalid", "aria-labelledby"],
    focusManagement:
      "Opening moves focus into the range-mode Calendar; Escape closes and returns focus to the trigger. onValueChange fires as the from/to range is built.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

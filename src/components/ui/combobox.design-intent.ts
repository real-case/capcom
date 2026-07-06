import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Combobox — `selection-control` / `selection-control` (ADR 0061/0062). The accessible,
 * type-to-filter replacement for a native `<select>`; a composite
 * (compositionSignature [button, command, popover]) — a Popover disclosure holding a
 * Command list, triggered by a Button. `selection-control` mandates the interaction and
 * validation axes plus checked/unchecked/indeterminate: a chosen option is `checked`, none
 * chosen is `unchecked`, and a single-select combobox has no `indeterminate`. Interaction
 * is mandatory, so the stories ship a `play` (ADR 0038).
 */
export const comboboxIntent = {
  meta: {
    id: "combobox",
    kind: "composite",
    archetype: "selection-control",
    compositionSignature: ["button", "command", "popover"],
    composedOf: ["button", "command", "popover"],
    usedIn: [
      "src/shared/ui/ComboField.tsx",
      "src/widgets/funnel-builder/ui/FunnelBuilder.tsx",
      "src/widgets/segment-builder/ui/SegmentBuilder.tsx",
    ],
  },
  usageRole: "selection-control",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The combobox exposes no closed design variant axis; per-state references + ApprovalSeals are added at the 👤 API-approval step.",
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
        "Transient :focus-visible ring on the trigger, exercised by the Select play (keyboard), not a snapshot.",
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
        "A combobox is an interactive picker; a read-only value display is a separate presentation concern, not a mode of this control.",
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
        "The combobox forwards aria-invalid to the trigger but renders no invalid treatment of its own; the invalid affordance is the composing form field's concern.",
    },
    {
      name: "warning",
      applicable: false,
      rationale:
        "Warning is a form-field validation treatment owned by the composing control, not the combobox.",
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
      applicable: false,
      rationale:
        "A single-select combobox has a value or it does not; there is no partial/indeterminate selection (that is a multi-select concern).",
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
          "The disclosure trigger is projected onto the Button via Radix `asChild`, so the combobox trigger inherits the Button's styling and focus behavior rather than nesting a second control.",
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
      "The trigger is role=combobox with aria-expanded; opening moves focus into the Command input, Escape closes and returns focus to the trigger. Selecting an option calls onValueChange and closes.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

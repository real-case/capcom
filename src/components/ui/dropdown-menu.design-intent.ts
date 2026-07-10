import type { DesignIntent } from "@/design-system/design-intent";

/**
 * DropdownMenu — `collection` / no usage role (ADR 0061/0062). A Radix-backed action menu
 * revealed from a trigger; a leaf primitive (compositionSignature []). `collection`
 * mandates the data, process, interaction, and contentBounds axes. A menu is authored with
 * a fixed set of items and runs no async, so most of the data/process axis is applicable:
 * false by subtraction. The interaction axis is mandatory, so the stories ship a `play`
 * (ADR 0038). `variant` (default/destructive) is a closed axis on DropdownMenuItem.
 */
export const dropdownMenuIntent = {
  meta: {
    id: "dropdown-menu",
    kind: "primitive",
    archetype: "collection",
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/widgets/events-explorer/ui/ColumnsMenu.tsx",
      "src/widgets/events-explorer/ui/GroupByMenu.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The item variant axis lives in api.variants; per-variant references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // data axis.
    {
      name: "empty",
      applicable: false,
      rationale:
        "An action menu is authored with a fixed set of items; an empty menu is not a rendered state (a control with no actions is simply not shown).",
    },
    {
      name: "single",
      applicable: true,
      demoRationale:
        "A one-item menu renders the same menuitem treatment as the many-item Default with a single row; no distinct single-item layout.",
    },
    {
      name: "many",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "overflow",
      applicable: true,
      demoStory: "Default",
      worstCaseForOverflow: true,
    },
    {
      name: "error-fetch",
      applicable: false,
      rationale:
        "A menu is a static, authored list; it performs no fetch, so there is no fetch-error state.",
    },
    // process axis — a static action menu has no async lifecycle.
    {
      name: "idle",
      applicable: false,
      rationale:
        "A menu has no async lifecycle; the process axis belongs to whatever an item triggers, not the menu primitive.",
    },
    {
      name: "loading",
      applicable: false,
      rationale:
        "The menu renders synchronously; a loading affordance belongs to the action an item invokes.",
    },
    {
      name: "success",
      applicable: false,
      rationale: "No async action ⇒ no success state on the menu primitive.",
    },
    {
      name: "error-action",
      applicable: false,
      rationale:
        "No async action ⇒ no action-error state on the menu primitive.",
    },
    {
      name: "retry",
      applicable: false,
      rationale: "No async action to retry on the menu primitive.",
    },
    // interaction axis (mandatory).
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
        "Transient highlight on the focused/hovered item (focus:bg-accent); exercised by the Open play, not a static state.",
      tokens: ["--color-accent", "--color-accent-foreground"],
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "Radix roving focus highlights the active item; the transient focus treatment is driven by the play, not a snapshot.",
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state on an item; not reproducible statically.",
    },
    {
      name: "disabled",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "read-only",
      applicable: false,
      rationale:
        "A menu is an action list, not an editable field; read-only is a text-input concern (states.ts).",
    },
    // contentBounds axis.
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "line-wrap",
      applicable: false,
      rationale:
        "Menu items are single-line rows; a long label truncates within its row rather than wrapping.",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "Truncating an over-long item label is the composing item's responsibility, not the menu primitive (ADR 0058).",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The menu imposes no script-specific layout; CJK labels render on the same row path as the Default story.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; Radix mirrors submenu side automatically, so the menu adds no directional layout.",
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
          "The labels/items/separators/sub-menus are an open composition slot; not a closed variant axis.",
      },
    ],
    variants: [
      {
        prop: "variant",
        values: ["default", "destructive"],
        rationale:
          "A fixed, finite item-intent axis (a neutral vs. a destructive action) — a closed axis on DropdownMenuItem.",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "both",
    ariaPassthrough: ["aria-label", "aria-labelledby"],
    focusManagement:
      "Radix DropdownMenu manages menu/menuitem roles, roving focus, type-ahead, Escape-to-close, and return focus to the trigger.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

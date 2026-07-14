import type { DesignIntent } from "@/design-system/design-intent";

/**
 * NavItem — `action-trigger` / `action-trigger` (ADR 0061/0062). The first INTERACTIVE
 * mission-control primitive (ADR 0099): a navigation link row on the instrument-panel
 * surface. A leaf primitive (compositionSignature []); routing is delegated via `asChild`
 * (the `radix-ui` umbrella `Slot`) so the consumer passes its own Link — the icon+label are
 * the child's content — keeping app routing out of the kit (ADR 0065/0066). The mandatory
 * interaction + contentBounds axes are covered by subtraction below; the interaction axis is
 * mandatory, so the stories ship a `play` (ADR 0038). The `active` prop is a closed boolean
 * axis marking the current section (aria-current) — distinct from the transient :active
 * (pressed) interaction state of the same name.
 */
export const navItemIntent = {
  meta: {
    id: "nav-item",
    kind: "primitive",
    archetype: "action-trigger",
    compositionSignature: [],
    composedOf: [],
    usedIn: ["src/widgets/app-shell/ui/SidebarNav.tsx"],
  },
  usageRole: "action-trigger",
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The closed `active` axis lives in api.variants; per-variant references + ApprovalSeals are added at the 👤 API-approval step. Expected usageRole collision with `button` (both action-trigger) — an advisory Stage-4 escalation (ds:escalations), not a gate (ADR 0061 P3).",
  },
  states: [
    // interaction axis (mandatory for action-trigger).
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-text-secondary"],
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Transient :hover pseudo-state — not capturable in a static story; the hover treatment is the `hover:bg-surface-elevated` / `hover:text-text-primary` tokens.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "Transient :focus-visible ring driven by the Keyboard play (Tab), not a static snapshot.",
      tokens: ["--color-text-primary"],
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state; not reproducible in a static render. Distinct from the `active` PROP (current-section), which the Current story demonstrates.",
    },
    {
      name: "disabled",
      applicable: false,
      rationale:
        "NavItem renders as an anchor (asChild Link); anchors have no disabled state — an unavailable section is omitted from the nav registry, not rendered disabled (states.ts).",
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
        "Nav labels are short section names on a single row; fitting an over-long label is the composing sidebar's concern, not the primitive (ADR 0058).",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The item sizes to its label; truncating an over-long label is the composing sidebar's responsibility, not the primitive (ADR 0058).",
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
        "Direction is inherited from the document; the item introduces no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["active"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "asChild",
        rationale:
          "Delegates rendering to the consumer's element (the i18n Link) via the radix Slot, so the kit stays free of app routing (ADR 0065) — a composition slot, not a variant.",
      },
      {
        name: "children",
        rationale:
          "The item's icon+label content, provided by the consumer as open composition; not a closed axis.",
      },
    ],
    variants: [
      {
        prop: "active",
        values: ["false", "true"],
        rationale:
          "A closed boolean axis marking the current section (aria-current='page' + the active surface) — a finite axis, not an open slot.",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-current", "aria-label"],
    focusManagement:
      "Native anchor / slotted-child focus; visible ring via focus-visible:ring-text-primary.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

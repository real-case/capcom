import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Command — `collection` / no usage role (ADR 0061/0062). A cmdk-backed, type-to-filter
 * command menu; a composite (compositionSignature [dialog]) — it reuses Dialog for the
 * CommandDialog (⌘K) overlay and is itself reused by the Combobox. `collection` mandates
 * the data, process, interaction, and contentBounds axes. Command filters a
 * client-provided list synchronously, so the whole process (async) axis and error-fetch
 * are the composing feature's concern, marked inapplicable by subtraction. The
 * interaction axis is mandatory, so the stories ship a `play` (ADR 0038).
 */
export const commandIntent = {
  meta: {
    id: "command",
    kind: "composite",
    archetype: "collection",
    compositionSignature: ["dialog"],
    composedOf: ["dialog"],
    usedIn: [
      "src/components/ui/combobox.tsx",
      "src/widgets/app-shell/ui/CommandPalette.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). Command exposes no closed design variant axis; per-state references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    // data axis.
    {
      name: "empty",
      applicable: true,
      demoStory: "Empty",
      tokens: ["--color-muted-foreground"],
    },
    {
      name: "single",
      applicable: true,
      demoRationale:
        "A one-item result renders the same row treatment as the many-item Default with a single row; there is no distinct single-item layout.",
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
        "Command filters a client-provided list synchronously; it performs no fetch, so there is no fetch-error state (the composing feature owns async data).",
    },
    // process axis — Command is a synchronous client-side filter; no async lifecycle.
    {
      name: "idle",
      applicable: false,
      rationale:
        "Command has no async lifecycle; the process axis (idle/loading/…) belongs to the composing feature that supplies the items.",
    },
    {
      name: "loading",
      applicable: false,
      rationale:
        "Filtering is synchronous; a loading affordance is the composing feature's concern (e.g. a query-fed Combobox), not the primitive.",
    },
    {
      name: "success",
      applicable: false,
      rationale: "No async action ⇒ no success state on the primitive.",
    },
    {
      name: "error-action",
      applicable: false,
      rationale: "No async action ⇒ no action-error state on the primitive.",
    },
    {
      name: "retry",
      applicable: false,
      rationale: "No async action to retry on the primitive.",
    },
    // interaction axis (mandatory).
    {
      name: "default",
      applicable: true,
      demoStory: "Default",
    },
    {
      name: "hover",
      applicable: true,
      demoRationale:
        "Hover/active-descendant highlights a row (data-selected → bg-muted); the transient highlight is exercised by the Filter play, not a static state.",
    },
    {
      name: "focus-visible",
      applicable: true,
      demoRationale:
        "cmdk keeps DOM focus on the input and moves an aria-activedescendant across rows; the transient focus ring is driven by the play, not a snapshot.",
      tokens: ["--color-ring"],
    },
    {
      name: "active",
      applicable: true,
      demoRationale:
        "Transient :active (pressed) pseudo-state on a row; not reproducible statically.",
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
        "A command menu is an action list, not an editable field; read-only is a text-input concern (states.ts).",
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
        "Command rows are single-line; a long label truncates within its row (the composing item applies `truncate`) rather than wrapping.",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "Truncating an over-long label is the composing item's responsibility (it applies `truncate`), not the command primitive (ADR 0058).",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The list imposes no script-specific layout; CJK labels render on the same row path as the Default story.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; command adds no directional layout of its own.",
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
          "The groups/items/separators are an open composition slot; not a closed variant axis.",
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
      "cmdk keeps focus on the input, exposes a listbox/option roles model with aria-activedescendant, and filters on type; arrow keys move the active row.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Dialog — `container` / no usage role (ADR 0061/0062). A Radix-backed modal surface
 * (overlay + focus-trapped content); a leaf primitive (compositionSignature []) reused
 * by Command's CommandDialog. `container` mandates only the contentBounds axis; the modal
 * open/close is covered as behavior and exercised by an (optional) play. Data/process are
 * conditional axes (a dialog that holds a collection / async content) — not applicable to
 * the primitive itself.
 */
export const dialogIntent = {
  meta: {
    id: "dialog",
    kind: "primitive",
    archetype: "container",
    compositionSignature: [],
    composedOf: [],
    usedIn: ["src/components/ui/command.tsx"],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The dialog exposes no closed design variant axis; per-state references + ApprovalSeals are added at the 👤 API-approval step.",
  },
  states: [
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-popover", "--color-popover-foreground"],
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "LongContent",
      worstCaseForOverflow: true,
    },
    {
      name: "line-wrap",
      applicable: true,
      demoStory: "LongContent",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The dialog sizes to its content up to sm:max-w-sm and lets the body scroll; it never truncates its children.",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The container imposes no script-specific layout; CJK content flows via the same wrapping path the LongContent story exercises.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the dialog adds no directional layout of its own.",
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
          "The dialog body is an open composition slot (header, content, footer); not a closed variant axis.",
      },
    ],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "both",
    ariaPassthrough: ["aria-label", "aria-labelledby", "aria-describedby"],
    focusManagement:
      "Radix Dialog traps focus in the content, wires aria-labelledby/-describedby to DialogTitle/Description, closes on Escape/overlay-click, and returns focus to the trigger. The corner close carries a localizable `closeLabel` (ADR 0030).",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

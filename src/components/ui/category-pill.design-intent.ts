import type { DesignIntent } from "@/design-system/design-intent";

/**
 * CategoryPill — `categorical-indicator` / no usage role (ADR 0061/0062; ADR 0099 console
 * re-skin). A categorical VALUE rendered as a chip with an optional leading data-viz hue dot.
 * A COMPOSITE (compositionSignature ['badge']) that themes `Badge` through the mission-control
 * surface and prepends a decorative hue dot — reusing the chip rather than duplicating the
 * `Badge` leaf (the clean resolution to the ADR 0059 collision that dropped StatusPill in
 * Phase A: Badge is already a `categorical-indicator` leaf with signature []). Only the
 * contentBounds axis is mandatory for `categorical-indicator` (category values are the `hue`
 * value + label, not states). No interaction axis ⇒ no play required (ADR 0038). The `hue` is
 * an OPEN prop — a `var(--color-viz-*)` token supplied by the consumer (e.g. `eventHue`),
 * applied to the aria-hidden dot via inline style — so it is neither a closed variant axis nor
 * a ReactNode slot (documented here, not in api).
 */
export const categoryPillIntent = {
  meta: {
    id: "category-pill",
    kind: "composite",
    archetype: "categorical-indicator",
    compositionSignature: ["badge"],
    composedOf: ["badge"],
    usedIn: [
      "src/widgets/events-explorer/ui/EventsTable.tsx",
      "src/widgets/events-explorer/ui/GroupRollup.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). CategoryPill has no closed variant axis — the categorical value is the open `hue` token + label. Consumed by the events-explorer plan column (EventsTable) and group roll-up label (GroupRollup); the Overview bento reuses it in Phase D.",
  },
  states: [
    // contentBounds axis (the only mandatory axis for categorical-indicator).
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-text-primary", "--color-border-hairline"],
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
        "A category pill is single-line by design (it composes Badge's whitespace-nowrap chip); it never wraps.",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The pill sizes to its content (Badge's w-fit); truncating an over-long label is the composing container's responsibility, not the primitive (ADR 0058).",
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
        "Direction is inherited from the document; the pill adds no directional layout of its own (the hue dot leads via logical order).",
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
          "The categorical label, rendered inside the composed Badge as open content — not a closed axis.",
      },
    ],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label"],
    surfacedFromComposition: [
      "The accessible name is the Badge content (the label); the leading hue dot is decorative (aria-hidden), so the pill announces the label only.",
    ],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

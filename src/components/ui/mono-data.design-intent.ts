import type { DesignIntent } from "@/design-system/design-intent";

/**
 * MonoData — `data-display` archetype / no usage role (ADR 0061/0062; the `data-display`
 * class added 2026-07-13 for the mission-control value leaves, ADR 0099). An inline tabular
 * numeric/technical value in the geist-mono face at the `mono-data` type role (ADR
 * 0099/0081) — event ids, counts, timestamps, deltas — with tabular figures so columns
 * align. A presentational value leaf (compositionSignature []); `data-display` mandates
 * only the contentBounds axis — the DATA's absence / loading is the composing widget's job,
 * not this leaf. The `tone` prop is a closed axis over the text hierarchy. No interaction
 * axis ⇒ no play required (ADR 0038).
 */
export const monoDataIntent = {
  meta: {
    id: "mono-data",
    kind: "primitive",
    archetype: "data-display",
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/components/ui/telemetry-stat.tsx",
      "src/widgets/events-explorer/ui/EventDetail.tsx",
      "src/widgets/events-explorer/ui/EventsTable.tsx",
      "src/widgets/events-explorer/ui/GroupRollup.tsx",
      "src/widgets/overview-dashboard/ui/KpiCard.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The closed tone axis lives in api.variants. Consumed by the events-explorer / overview re-skin in Phases C–D (usedIn empty until then).",
  },
  states: [
    {
      name: "min-content",
      applicable: true,
      demoStory: "Primary",
      tokens: ["--color-text-primary"],
    },
    {
      name: "max-content",
      applicable: true,
      demoStory: "LongValue",
      worstCaseForOverflow: true,
    },
    {
      name: "line-wrap",
      applicable: false,
      rationale:
        "The value is a single token rendered whitespace-nowrap so a column of values stays aligned; it never wraps mid-token. Fitting an over-wide value is the composing cell's concern (ADR 0058/0099).",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The leaf sizes to its value; truncating an over-long value is the composing table cell's responsibility, not the leaf (ADR 0058).",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "CJK content renders via the same single-line path; the leaf imposes no script-specific layout (mono values are latin-numeric in practice).",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the value adds no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["tone"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "children",
        rationale:
          "The value is open content (a formatted number/string), injected as children — not a closed axis.",
      },
    ],
    variants: [
      {
        prop: "tone",
        values: ["primary", "secondary"],
        rationale:
          "A fixed mapping to the AA-verified text roles (primary/secondary) over the surfaces (ADR 0081/0092; check:contrast) — a closed axis, not a slot. --text-tertiary is intentionally excluded (not AA-guaranteed for small text).",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label"],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Panel — `container` / no usage role (ADR 0061/0062). The mission-control surface
 * container (ADR 0099/0081): a presentational surface that groups console content on
 * the `--surface-*` hierarchy, the instrument-panel sibling of `card` (same `container`
 * archetype, a DISTINCT surface — never the shadcn value layer). A leaf primitive
 * (compositionSignature []). `container` mandates only the contentBounds axis. The
 * `surface` prop is a closed elevation axis (panel/elevated/overlay). No interaction
 * axis ⇒ no play required (ADR 0038).
 */
export const panelIntent = {
  meta: {
    id: "panel",
    kind: "primitive",
    archetype: "container",
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/widgets/app-shell/ui/ProjectHub.tsx",
      "src/widgets/events-explorer/ui/BulkActionsBar.tsx",
      "src/widgets/events-explorer/ui/EventDetail.tsx",
      "src/widgets/events-explorer/ui/GroupRollup.tsx",
      "src/widgets/overview-dashboard/ui/KpiCard.tsx",
      "src/widgets/overview-dashboard/ui/OverviewDashboard.tsx",
      "src/widgets/overview-dashboard/ui/PacingCard.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The closed elevation axis lives in api.variants; per-variant references + ApprovalSeals are added at the 👤 API-approval step. Consumed by the app-shell/overview re-skin in Phases B–D (usedIn empty until then).",
  },
  states: [
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-surface-panel", "--color-text-primary"],
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
        "The panel grows to fit its content; truncating an over-long value is a child's concern, not the container's (ADR 0058).",
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
        "Direction is inherited from the document; the panel adds no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["surface"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "children",
        rationale:
          "The panel body is an open composition slot (KPI cards, tables, charts group inside); not a closed variant axis.",
      },
    ],
    variants: [
      {
        prop: "surface",
        values: ["panel", "elevated", "overlay"],
        rationale:
          "A fixed, finite elevation scale over the surface-hierarchy tokens (ADR 0081) — a closed axis, not a slot.",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label", "aria-labelledby"],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

import type { DesignIntent } from "@/design-system/design-intent";

/**
 * TelemetryStat — `data-display` / no usage role (ADR 0061/0062; the `data-display` class,
 * ADR 0100/0099). A compact labeled telemetry cell for the console chrome (the app-shell
 * footer; overview signals) — a COMPOSITE (compositionSignature ['mono-data',
 * 'status-indicator']) pairing a StatusIndicator status pill (`level` + `label`) with a
 * MonoData value (`children`). `data-display` mandates only the contentBounds axis — the
 * value's absence / loading is the composing widget's job, not this leaf. No interaction axis
 * ⇒ no play required (ADR 0038). The `level` prop is the closed severity axis forwarded to the
 * StatusIndicator dot.
 */
export const telemetryStatIntent = {
  meta: {
    id: "telemetry-stat",
    kind: "composite",
    archetype: "data-display",
    compositionSignature: ["mono-data", "status-indicator"],
    composedOf: ["mono-data", "status-indicator"],
    usedIn: ["src/widgets/app-shell/ui/TelemetryFooter.tsx"],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). The closed `level` axis lives in api.variants; per-variant references + ApprovalSeals are added at the 👤 API-approval step. Consumed by the app-shell TelemetryFooter (Phase B); overview signals reuse it in Phase D.",
  },
  states: [
    {
      name: "min-content",
      applicable: true,
      demoStory: "Default",
      tokens: ["--color-text-primary", "--color-status-nominal-fg"],
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
        "A telemetry stat is a single-row cell (label pill + whitespace-nowrap MonoData value); an over-wide stat is the composing footer's layout concern, not the primitive (ADR 0058).",
    },
    {
      name: "truncation",
      applicable: false,
      rationale:
        "The cell sizes to its content; truncating an over-long value is the composing footer's responsibility, not the primitive (ADR 0058).",
    },
    {
      name: "cjk",
      applicable: true,
      demoRationale:
        "The label may be non-Latin; it flows through the same StatusIndicator/row path the LongValue story exercises, and the mono value is latin-numeric in practice. No script-specific layout is imposed.",
    },
    {
      name: "rtl",
      applicable: false,
      rationale:
        "Direction is inherited from the document; the cell adds no directional layout of its own.",
    },
  ],
  combinations: {
    orthogonalAxes: ["level"],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [
      {
        name: "label",
        rationale:
          "The stat's caption, rendered inside the StatusIndicator as open content — not a closed axis.",
      },
      {
        name: "children",
        rationale:
          "The stat's value, rendered via MonoData as open content — not a closed axis.",
      },
    ],
    variants: [
      {
        prop: "level",
        values: ["nominal", "caution", "warning", "critical"],
        rationale:
          "The closed, ORDERED severity axis forwarded to the StatusIndicator dot (ADR 0081) — a finite scale, not an open slot.",
      },
    ],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label"],
    surfacedFromComposition: [
      "The accessible name is the StatusIndicator label; its leading dot is decorative (aria-hidden), so the stat announces label + value only.",
    ],
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

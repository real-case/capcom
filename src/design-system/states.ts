import type { Archetype } from "./archetypes";

/**
 * State axes and the archetype→states registry (ADR 0061 / Appendix A1). Coverage
 * is built BY SUBTRACTION: classify a component by archetype, take its mandatory
 * axes from `ARCHETYPE_STATES`, then mark each state `applicable` true/false in the
 * component's `design-intent.ts` — a `false` requires a rationale (ADR 0062), so a
 * skipped state is always a visible, justified omission (problem P8), never silent.
 *
 * 👤 Human-authored; **ratified baseline (2026-06-11)**, extended via the same
 * process. Behaviour under *simultaneity* (disabled+loading, …) is the separate
 * `state-precedence.ts` matrix, not this registry.
 */
export const STATE_AXES = {
  data: ["empty", "single", "many", "overflow", "error-fetch"],
  interaction: [
    "default",
    "hover",
    "focus-visible",
    "active",
    "disabled",
    "read-only",
  ],
  process: ["idle", "loading", "success", "error-action", "retry"],
  validation: ["pristine", "valid", "invalid", "warning"],
  contentBounds: [
    "min-content",
    "max-content",
    "line-wrap",
    "truncation",
    "cjk",
    "rtl",
  ],
} as const;

export type StateAxis = keyof typeof STATE_AXES;

/** Archetype-specific states that live outside the standard axes. */
export const ARCHETYPE_SPECIFIC_STATES = {
  "selection-control": ["checked", "unchecked", "indeterminate"],
  navigation: ["selected", "current", "complete"],
  disclosure: ["collapsed", "expanded", "transitioning"],
  feedback: ["dismissing"],
  media: ["error-load"],
} as const;

export interface ArchetypeStateSpec {
  /** Axes every component of this class must cover. */
  readonly mandatoryAxes: readonly StateAxis[];
  /** Axes required only under a stated condition (e.g. async behaviour). */
  readonly conditionalAxes?: readonly {
    readonly axis: StateAxis;
    readonly when: string;
  }[];
  /** Archetype-specific states required beyond the standard axes. */
  readonly extraStates?: readonly string[];
  readonly notes?: string;
}

/**
 * Mandatory state coverage per class (Appendix A1 "Mandatory axes" summary). The
 * `Record<Archetype, …>` makes completeness a typecheck guarantee: omit a class
 * and `tsc` fails.
 */
export const ARCHETYPE_STATES: Record<Archetype, ArchetypeStateSpec> = {
  "action-trigger": {
    mandatoryAxes: ["interaction", "contentBounds"],
    conditionalAxes: [{ axis: "process", when: "async action" }],
    notes: "No data axis.",
  },
  "text-input": {
    mandatoryAxes: ["interaction", "validation", "contentBounds"],
    conditionalAxes: [{ axis: "data", when: "empty / overflow value" }],
    notes: "Interaction includes read-only.",
  },
  "selection-control": {
    mandatoryAxes: ["interaction", "validation"],
    extraStates: ARCHETYPE_SPECIFIC_STATES["selection-control"],
  },
  "categorical-indicator": {
    mandatoryAxes: ["contentBounds"],
    conditionalAxes: [{ axis: "interaction", when: "interactive variant" }],
    notes: "Category values are expressed via `variants`, not states.",
  },
  collection: {
    mandatoryAxes: ["data", "process", "interaction", "contentBounds"],
    notes: "The data axis (empty…error-fetch) is critical for this class.",
  },
  container: {
    mandatoryAxes: ["contentBounds"],
    conditionalAxes: [
      { axis: "data", when: "holds a collection (empty / overflow)" },
      { axis: "process", when: "async content" },
    ],
  },
  feedback: {
    mandatoryAxes: ["contentBounds"],
    extraStates: ARCHETYPE_SPECIFIC_STATES.feedback,
    notes: "Severity is expressed via `variants`.",
  },
  navigation: {
    mandatoryAxes: ["interaction"],
    conditionalAxes: [{ axis: "data", when: "overflow (many items)" }],
    extraStates: ARCHETYPE_SPECIFIC_STATES.navigation,
  },
  media: {
    mandatoryAxes: ["process", "data", "contentBounds"],
    extraStates: ARCHETYPE_SPECIFIC_STATES.media,
    notes:
      "Process covers loading; `error-load` and empty cover the missing-media cases.",
  },
  disclosure: {
    mandatoryAxes: ["interaction", "contentBounds"],
    extraStates: ARCHETYPE_SPECIFIC_STATES.disclosure,
  },
};

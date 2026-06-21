/**
 * `design-intent.ts` schema (ADR 0062 / Appendix A2) — the typed SPECIFICATION
 * authored beside each component at Definition-of-Ready, BEFORE it is implemented.
 * The contract is *designed*, not discovered after coding (otherwise DoR collapses
 * into DoD). Each field binds to a downstream check, so the spec is verifiable rather
 * than narrative:
 *
 *   meta.{archetype,composedOf,usedIn,compositionSignature} → composition-graph
 *     reconciliation (`check:design-intent`, ADR 0059/0060)
 *   usageRole                                               → collision gate (Stage 4,
 *     ADR 0061, problem P3)
 *   api ↔ actual props                                      → api↔props fitness fn
 *     (`check:design-intent`, ADR 0062, problem P4/P5)
 *   states (by subtraction from the archetype set)          → completeness +
 *     applicable:false-needs-rationale fitness fn (ADR 0062, problem P8)
 *   states[].demoStory / demoRationale                      → states↔stories coverage,
 *     BOTH directions: an applicable state needs a demo story or a recorded reason,
 *     and a demoStory link must resolve (`check:design-intent`, ADR 0062)
 *   states/variants[].tokens                                → Stage-1 token lints
 *     (ADR 0058, problem P1)
 *   variants[].seal / states[].seal                         → Figma drift seal
 *     (`check:figma-seals`, ADR 0063, problem P9)
 *
 * The file REFERENCES the controlled vocabularies and token registry (ADR 0061/0058);
 * it never re-declares them, or the single-source guarantee breaks (ADR 0058, P6).
 * `behavior` is engineering-built, never derived from Figma (ADR 0045/0062).
 */
import type { Archetype } from "./archetypes";
import type { UsageRole } from "./usage-roles";
import type { SemanticToken } from "./tokens.generated";

export type ComponentKind = "primitive" | "composite" | "pattern";

/**
 * ADR 0063 drift seal — present only AFTER a 👤 human approves a variant against its
 * real Figma frame (the figma server's image capability, never its code path). The
 * seal is a DRIFT DETECTOR, not a snapshot: `check:figma-seals` re-renders the node by
 * id and compares `renderHash`; a mismatch re-opens the variant for re-approval (P9).
 * `null` everywhere in this repo today — no Figma file is wired yet, and baseline/
 * variant approval is human-only (ADR 0046/0047).
 */
export interface ApprovalSeal {
  /** Figma file version at approval time (the `figmaFileVersion` half of the seal). */
  readonly figmaFileVersion: string;
  /** Hash of the approved Figma node render (the `renderHash` half). */
  readonly renderHash: string;
  /** ISO date the 👤 approval was granted. */
  readonly approvedAt: string;
}

/** One design variant reconciled (eventually) against a real Figma frame (ADR 0063). */
export interface VariantEntry {
  readonly name: string;
  /** The axis this variant belongs to (e.g. `variant`, `size`, `severity`). */
  readonly axis: string;
  /** Figma node id — `null` until a Figma frame is wired (👤, ADR 0045/0063). */
  readonly figmaNodeId: string | null;
  readonly figmaDeepLink: string | null;
  /** `null` = awaiting 👤 approval; set only post-approval (ADR 0063). */
  readonly seal: ApprovalSeal | null;
}

/**
 * One state from the archetype's mandatory set (ADR 0061, by subtraction). A state is
 * never silently skipped: it is listed here `applicable:false` WITH a rationale, which
 * `check:design-intent` enforces (a rationale-less `false` is a masked omission, P8).
 */
export interface StateEntry {
  /** A state from `STATE_AXES`/`ARCHETYPE_SPECIFIC_STATES` in `states.ts`. */
  readonly name: string;
  readonly applicable: boolean;
  /** REQUIRED (non-empty) when `applicable === false` — enforced by the fitness fn. */
  readonly rationale?: string;
  /**
   * Story export that demonstrates this state. When set, the fitness fn asserts the
   * export exists (no stale link); a story tagged `state:<name>` for a name not
   * declared here is contract expansion and fails (ADR 0062, states↔stories).
   * When `applicable === true`, either `demoStory` or `demoRationale` is REQUIRED —
   * an applicable state without a story is otherwise a silent coverage gap (ADR 0062).
   */
  readonly demoStory?: string;
  /**
   * REQUIRED (non-empty) when `applicable === true` and `demoStory` is absent: why no
   * static story can demonstrate this state (e.g. a transient :hover/:active only
   * reachable interactively). EXACTLY ONE of demoStory/demoRationale — both present is
   * a contradictory record and fails the gate (ADR 0062). Enforced by
   * `check:design-intent` (ADR 0062); the REASON's quality is
   * judged in review, not by the gate.
   */
  readonly demoRationale?: string;
  readonly figmaNodeId?: string | null;
  readonly seal?: ApprovalSeal | null;
  /** Tokens this state relies on — typed from the ADR 0058 registry, never literals. */
  readonly tokens?: readonly SemanticToken[];
  /** Marks the state used as the overflow worst-case in coverage (Appendix A2). */
  readonly worstCaseForOverflow?: boolean;
}

/** A composition slot — orthogonal, combinatorial variation (ADR 0062, P5). */
export interface SlotSpec {
  readonly name: string;
  /** Why this is a slot (open composition) and not a closed variant/flag. */
  readonly rationale: string;
}

/** A closed variant/flag axis — a finite set of values (ADR 0062, P5). */
export interface VariantApiSpec {
  /** The prop name carrying the axis (e.g. `variant`, `size`). */
  readonly prop: string;
  readonly values: readonly string[];
  /** Why this is a closed axis and not an open slot. */
  readonly rationale: string;
}

/**
 * The derived contract. The API is the UNION of `usedIn` requirements (usage-driven),
 * not the agent's guess (ADR 0062, P4). `ownsExternalMargin` is asserted `false` — a
 * primitive carries no external margin (ADR 0058); the literal-`false` type makes a
 * `true` a typecheck error.
 */
export interface ApiContract {
  readonly slots: readonly SlotSpec[];
  readonly variants: readonly VariantApiSpec[];
  readonly ownsExternalMargin: false;
}

/** Recorded judgment: which state/variant combinations are allowed vs forbidden. */
export interface Combinations {
  readonly orthogonalAxes: readonly string[];
  readonly allowed: readonly (readonly string[])[];
  readonly forbidden: readonly (readonly string[])[];
}

/** Engineering-built behavior contract — NEVER derived from Figma (ADR 0045/0062). */
export interface Behavior {
  readonly refForwarding: boolean;
  readonly controlled: "controlled" | "uncontrolled" | "both" | "n/a";
  readonly ariaPassthrough: readonly string[];
  readonly focusManagement?: string;
  /** Behavior surfaced from composition (e.g. a slotted child's focus), if any. */
  readonly surfacedFromComposition?: readonly string[];
}

/** Layout/rhythm contract — rhythm comes from the composition container, not the leaf. */
export interface Alignment {
  readonly alignmentBox: string;
  readonly rhythmSource: "composition-container";
  readonly baseline?: string;
}

/** The full typed specification authored beside a component (ADR 0062, Appendix A2). */
export interface DesignIntent {
  readonly meta: {
    readonly id: string;
    readonly kind: ComponentKind;
    readonly archetype: Archetype | null;
    /** v1 = the sorted set of composed primitive ids (ADR 0059); `[]` for a leaf. */
    readonly compositionSignature: readonly string[];
    readonly composedOf: readonly string[];
    readonly usedIn: readonly string[];
  };
  /** From `usage-roles.ts` (ADR 0061); `null` when the component serves no tracked intent. */
  readonly usageRole: UsageRole | null;
  readonly variants: {
    readonly items: readonly VariantEntry[];
    /** Whether every Figma variant frame was traversed (ADR 0063 traversal report). */
    readonly traversalComplete: boolean;
    readonly notes?: string;
  };
  readonly states: readonly StateEntry[];
  readonly combinations: Combinations;
  readonly api: ApiContract;
  readonly behavior: Behavior;
  readonly alignment: Alignment;
}

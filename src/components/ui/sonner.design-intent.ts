import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Toaster (sonner) — infrastructural mount, `archetype: null` (ADR 0061/0062). A
 * provider-like wrapper that mounts the sonner toast region once near the app root; it
 * renders no content of its own — the feedback toasts are rendered by the sonner library
 * and themed entirely through the semantic token layer (CSS custom properties, so they flip
 * with `.dark`/`[data-theme]`). Like a provider it belongs to no structural archetype and
 * carries no mandatory state set. The null classification is a 👤 confirmation point
 * (ADR 0061) — the `feedback` archetype describes an individual toast, not this region
 * wrapper; flagged in the PR.
 */
export const sonnerIntent = {
  meta: {
    id: "sonner",
    kind: "primitive",
    archetype: null,
    compositionSignature: [],
    composedOf: [],
    usedIn: [],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). No variant axis — the wrapper only configures the library region; toast color comes from the token layer.",
  },
  states: [],
  combinations: {
    orthogonalAxes: [],
    allowed: [],
    forbidden: [],
  },
  api: {
    slots: [],
    variants: [],
    ownsExternalMargin: false,
  },
  behavior: {
    refForwarding: false,
    controlled: "n/a",
    ariaPassthrough: ["aria-label"],
    focusManagement:
      "sonner owns the toast region roles, hotkey focus (Alt+T), auto-dismiss timers, and hover-to-pause; this wrapper only supplies token-driven styling and icons.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

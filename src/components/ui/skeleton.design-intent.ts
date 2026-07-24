import type { DesignIntent } from "@/design-system/design-intent";

/**
 * Skeleton — presentational leaf, `archetype: null` (ADR 0061/0062). A pulsing placeholder
 * box sized entirely by the composing parent's className (like `label`, it belongs to no
 * structural archetype and serves no tracked usage role). Because it has no archetype, it
 * carries no mandatory state set; it renders one shimmer treatment and nothing more. The
 * null classification is a 👤 confirmation point (ADR 0061) — flagged in the PR.
 */
export const skeletonIntent = {
  meta: {
    id: "skeleton",
    kind: "primitive",
    archetype: null,
    compositionSignature: [],
    composedOf: [],
    usedIn: [
      "src/app/[locale]/(app)/p/[projectId]/loading.tsx",
      "src/app/[locale]/(app)/p/loading.tsx",
    ],
  },
  usageRole: null,
  variants: {
    items: [],
    traversalComplete: false,
    notes:
      "Claude Design references not wired (👤, ADR 0094/0095). A single shimmer treatment; no variant axis and no archetype states.",
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
    ariaPassthrough: ["aria-hidden", "aria-label"],
    focusManagement:
      "Non-interactive; the composing surface owns the loading affordance (e.g. aria-busy on the region) and swaps the skeleton for content.",
  },
  alignment: {
    alignmentBox: "border-box",
    rhythmSource: "composition-container",
  },
} satisfies DesignIntent;

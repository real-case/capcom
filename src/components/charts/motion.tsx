import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * MotionIn — a reduced-motion-guarded entrance wrapper for the chart interaction
 * layer (ADR 0093, extending 0086). Charts compose this around their SVG so the
 * visualization eases in on mount instead of popping.
 *
 * The motion is a **CSS / tw-animate-css** layer, not a JS animation library — a JS
 * motion library would be its own ADR (0093, More Information). Every animation
 * utility is prefixed `motion-safe:`, so `prefers-reduced-motion: reduce` disables it
 * and the wrapper collapses to its final static state — the determinism Chromatic
 * relies on (ADR 0043) and the accessibility contract of ADR 0039/0052. Duration and
 * easing come from the `--motion-*` tokens (ADR 0081) via arbitrary-property utilities,
 * so no value is hardcoded — the token gate (ADR 0058) sees only `var(--…)` references.
 */

export type MotionInProps = {
  children: ReactNode;
  className?: string;
  /**
   * Entrance preset. `rise` (default) fades in with a small upward slide; `fade` is
   * opacity only — used where a slide would fight a fixed layout (e.g. a grid cell).
   */
  variant?: "rise" | "fade";
};

const VARIANTS = {
  rise: "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2",
  fade: "motion-safe:animate-in motion-safe:fade-in-0",
} as const;

export function MotionIn({
  children,
  className,
  variant = "rise",
}: MotionInProps) {
  return (
    <div
      data-slot="chart-motion-in"
      className={cn(
        VARIANTS[variant],
        "motion-safe:[animation-duration:var(--motion-duration-base)]",
        "motion-safe:[animation-timing-function:var(--motion-ease-standard)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

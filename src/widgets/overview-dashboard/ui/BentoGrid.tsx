import type { ReactNode } from "react";

/**
 * The Overview bento layout shell (ADR 0099, the frozen reference `:502`) — PRESENTATIONAL
 * geometry and nothing else. It carries the reference's asymmetric `1.55fr 0.95fr 1.1fr`
 * three-column grid: the hero, the mini-stack and the goal cell span rows 1-2 (columns 1-3);
 * the bars, funnel and scatter sit on row 3.
 *
 * **The collapse is a CONTAINER query, not the reference's viewport `@media`** — a deliberate,
 * disclosed divergence. A viewport media query cannot be driven by a fixed-width story wrapper,
 * and the headless Storybook browser runs at an unpinned width (no viewport addon), so a
 * viewport-based proof would be non-deterministic. Anchoring the collapse to this wrapper's
 * inline size (`@container` + `@min-[1080px]:`) lets a fixed-width story deterministically drive
 * BOTH the three-column and the single-column states — which is how the geometry (and the
 * absence of the Phase-D hole) is proven in browser mode.
 *
 * Every slot gets `min-w-0 min-h-0`: grid items default to `min-width:auto`, so a chart's
 * intrinsic min-content would otherwise distort the resolved `fr` pixel widths. Grid track
 * ratios are layout proportions, not tokenizable colour/size, so arbitrary-value utilities are
 * correct here (ADR 0058 unaffected). Imports no kit primitive — a layout div, no graph node.
 */
export type BentoGridProps = {
  hero: ReactNode;
  stack: ReactNode;
  goal: ReactNode;
  bars: ReactNode;
  funnel: ReactNode;
  seg: ReactNode;
};

export function BentoGrid({
  hero,
  stack,
  goal,
  bars,
  funnel,
  seg,
}: BentoGridProps) {
  return (
    <div data-slot="bento" className="@container w-full">
      <div className="grid grid-cols-1 gap-4 @min-[1080px]:grid-cols-[1.55fr_0.95fr_1.1fr]">
        <div
          data-slot="bento-hero"
          className="min-h-0 min-w-0 @min-[1080px]:col-start-1 @min-[1080px]:row-span-2 @min-[1080px]:row-start-1"
        >
          {hero}
        </div>
        <div
          data-slot="bento-stack"
          className="min-h-0 min-w-0 @min-[1080px]:col-start-2 @min-[1080px]:row-span-2 @min-[1080px]:row-start-1"
        >
          {stack}
        </div>
        <div
          data-slot="bento-goal"
          className="min-h-0 min-w-0 @min-[1080px]:col-start-3 @min-[1080px]:row-span-2 @min-[1080px]:row-start-1"
        >
          {goal}
        </div>
        <div
          data-slot="bento-bars"
          className="min-h-0 min-w-0 @min-[1080px]:col-start-1 @min-[1080px]:row-start-3"
        >
          {bars}
        </div>
        <div
          data-slot="bento-funnel"
          className="min-h-0 min-w-0 @min-[1080px]:col-start-2 @min-[1080px]:row-start-3"
        >
          {funnel}
        </div>
        <div
          data-slot="bento-seg"
          className="min-h-0 min-w-0 @min-[1080px]:col-start-3 @min-[1080px]:row-start-3"
        >
          {seg}
        </div>
      </div>
    </div>
  );
}

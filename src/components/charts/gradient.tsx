import { LinearGradient } from "@visx/gradient";

/**
 * Area gradient definition (ADR 0093) — the vertical fill a line chart paints under its
 * series so the trend reads as volume, not just a stroke. It wraps `@visx/gradient`'s
 * unstyled `LinearGradient` (ADR 0086), whose stops are the **series' own token color**
 * fading to transparent — no baked palette, so the token gate (ADR 0058/0081) still sees
 * only `var(--color-viz-*)`. Render one per series inside `<defs>` (or anywhere in the
 * SVG), then reference it as `fill={`url(#${id})`}` on an `AreaClosed`.
 *
 * Opacity, not a second color, carries the fade — so the fill reads correctly in either
 * theme composition (ADR 0092) without a light/dark-specific stop.
 */

export type AreaGradientProps = {
  /** SVG id referenced by the area's `fill="url(#id)"`. Must be unique per chart. */
  id: string;
  /** The series' `var(--color-viz-*)` token — both stops derive from it. */
  color: string;
  /** Top (peak) opacity, 0..1. */
  fromOpacity?: number;
  /** Bottom (baseline) opacity, 0..1. */
  toOpacity?: number;
};

export function AreaGradient({
  id,
  color,
  fromOpacity = 0.28,
  toOpacity = 0,
}: AreaGradientProps) {
  return (
    <LinearGradient
      id={id}
      from={color}
      to={color}
      fromOpacity={fromOpacity}
      toOpacity={toOpacity}
      vertical
    />
  );
}

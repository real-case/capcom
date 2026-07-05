/**
 * Crosshair / focus line (ADR 0093) — the vertical guide a line chart draws at the
 * hovered/focused x position, with a dot on each series at that x. Pure presentational
 * SVG rendered inside the chart's plotting `<Group>` (ADR 0086): it takes coordinates
 * already in group space and owns no pointer logic. Every stroke/fill is a semantic
 * token (ADR 0058/0081); the dashed line is also a **non-color** affordance (ADR
 * 0039/0052), so the focus position reads without relying on the stroke color alone.
 * `aria-hidden` — the accessible readout is the focusable data points + the live region.
 */

export type CrosshairDot = {
  key: string;
  /** y in group coordinates. */
  y: number;
  /** A `var(--color-viz-*)` series token supplied by the chart. */
  color: string;
};

export type CrosshairProps = {
  /** x in group coordinates (shared by the line and every dot). */
  x: number;
  /** Top of the vertical line, in group coordinates. */
  top: number;
  /** Bottom of the vertical line, in group coordinates. */
  bottom: number;
  dots?: CrosshairDot[];
};

// Geometry in viewBox units. Named (not inline literals) so provenance is reviewable —
// SVG stroke width / radius have no token utility (ADR 0058/0081).
const LINE_STROKE = "var(--color-muted-foreground)";
const DOT_RING = "var(--color-background)";
const STROKE_W = 1;
const DASH = "3 3";
const DOT_R = 3.5;
const DOT_RING_W = 1.5;

export function Crosshair({ x, top, bottom, dots = [] }: CrosshairProps) {
  return (
    <g aria-hidden data-slot="chart-crosshair" pointerEvents="none">
      <line
        x1={x}
        x2={x}
        y1={top}
        y2={bottom}
        stroke={LINE_STROKE}
        strokeWidth={STROKE_W}
        strokeDasharray={DASH}
        strokeOpacity={0.7}
      />
      {dots.map((d) => (
        <circle
          key={d.key}
          cx={x}
          cy={d.y}
          r={DOT_R}
          fill={d.color}
          stroke={DOT_RING}
          strokeWidth={DOT_RING_W}
        />
      ))}
    </g>
  );
}

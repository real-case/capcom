import { Brush } from "@visx/brush";
import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";

/** The x-bounds visx hands to `onBrushEnd`; the extra Bounds fields are unused here. */
type BrushBounds = { x0: number; x1: number };

/**
 * Convert visx brush x-bounds (timestamp ms, either order) to an ISO `{ from, to }`
 * window — or `null` for a cleared/zero-width brush (a click, not a selection). Exported
 * so the conversion is unit-testable without simulating a drag.
 */
export function boundsToRange(bounds: BrushBounds | null): BrushRange | null {
  if (!bounds) return null;
  const from = new Date(Math.min(bounds.x0, bounds.x1)).toISOString();
  const to = new Date(Math.max(bounds.x0, bounds.x1)).toISOString();
  return from === to ? null : { from, to };
}

/**
 * Time brush (ADR 0093) — a slim range selector for narrowing a chart's analysis
 * window. It wraps `@visx/brush`'s unstyled primitive (ADR 0086); the selection rect and
 * handles are semantic tokens (ADR 0058/0081), so nothing is baked and the surfaces flip
 * with the theme (ADR 0092).
 *
 * **Presentational, and the state boundary is the point (ADR 0093).** The brush is
 * view-only: it emits an ISO `{ from, to }` on brush-end and owns nothing. Because the
 * selection *changes the analysis window*, the **feature** writes it to nuqs URL-state
 * (ADR 0027) — a shareable window — and never the widget; the widget never fetches
 * (ADR 0086/0084). The internal scale is over **timestamps (numbers)** so `invert` is
 * unambiguous (a time scale would hand back `Date | number`).
 *
 * The component is keyed by its `value` at the call site so an external window change
 * (including a reset to the full domain) re-seeds the stateful brush — see the story.
 */

export type BrushRange = {
  /** ISO 8601 timestamp. */
  from: string;
  /** ISO 8601 timestamp. */
  to: string;
};

export type ChartBrushProps = {
  /** The full selectable window (ISO) — the brush track's domain. */
  domain: BrushRange;
  /** Current sub-selection (ISO). Absent/null = the whole domain (no selection). */
  value?: BrushRange | null;
  /** Fired on brush-end. `null` means the selection was cleared (whole domain). */
  onChange: (next: BrushRange | null) => void;
  /** Accessible description of the control. */
  label?: string;
};

// Geometry in viewBox units. Named (not inline literals) — SVG geometry has no token
// utility (ADR 0058/0081).
const VIEW_W = 720;
const VIEW_H = 40;
const MARGIN = { top: 6, right: 8, bottom: 6, left: 8 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const HANDLE_W = 8;
const HANDLE_RADIUS = 2;
const TRACK_RADIUS = 4;

const SELECTED_BOX = {
  fill: "var(--color-text-primary)",
  fillOpacity: 0.14,
  stroke: "var(--color-text-primary)",
  strokeWidth: 1,
} as const;

export function ChartBrush({
  domain,
  value,
  onChange,
  label = "Select a time window",
}: ChartBrushProps) {
  const fromMs = new Date(domain.from).getTime();
  const toMs = new Date(domain.to).getTime();

  const xScale = scaleLinear({ domain: [fromMs, toMs], range: [0, INNER_W] });
  const yScale = scaleLinear({ domain: [0, 1], range: [INNER_H, 0] });

  const initialBrushPosition = value
    ? {
        start: { x: xScale(new Date(value.from).getTime()) },
        end: { x: xScale(new Date(value.to).getTime()) },
      }
    : undefined;

  const handleBrushEnd = (bounds: BrushBounds | null) => {
    // A zero-width brush is a click, not a selection — boundsToRange treats it as a clear.
    onChange(boundsToRange(bounds));
  };

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height={VIEW_H}
      role="group"
      aria-label={label}
      preserveAspectRatio="none"
    >
      <Group left={MARGIN.left} top={MARGIN.top}>
        {/* The track the brush runs over. */}
        <rect
          x={0}
          y={0}
          width={INNER_W}
          height={INNER_H}
          rx={TRACK_RADIUS}
          fill="var(--color-surface-elevated)"
        />
        <Brush
          xScale={xScale}
          yScale={yScale}
          width={INNER_W}
          height={INNER_H}
          margin={MARGIN}
          brushDirection="horizontal"
          resizeTriggerAreas={["left", "right"]}
          initialBrushPosition={initialBrushPosition}
          selectedBoxStyle={SELECTED_BOX}
          handleSize={HANDLE_W}
          useWindowMoveEvents
          onBrushEnd={handleBrushEnd}
          renderBrushHandle={({ x, height, isBrushActive }) =>
            isBrushActive ? (
              <rect
                x={x}
                y={height / 2 - 6}
                width={HANDLE_W}
                height={12}
                rx={HANDLE_RADIUS}
                fill="var(--color-text-primary)"
                stroke="var(--color-surface-background)"
                strokeWidth={1}
              />
            ) : null
          }
        />
      </Group>
    </svg>
  );
}

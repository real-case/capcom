import { localPoint } from "@visx/event";
import { useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

/**
 * Focus + keyboard model shared by the interactive charts (ADR 0093). It holds the
 * focused datum **index** (local view-state, ADR 0026) and the pointer→index and
 * keyboard plumbing that a tooltip / crosshair read from. Kept framework-plain (no
 * "use client" boundary — the consuming chart owns that) and chart-agnostic: the caller
 * supplies the per-datum x positions, so the same hook drives a line, a bar, or a grid.
 *
 * Accessibility (ADR 0039/0052): `onKeyDown` makes the focusable plot keyboard-navigable
 * — Arrow keys step, Home/End jump, Escape/blur clears — so a keyboard user reaches every
 * datum the pointer can, and the chart mirrors the focused index into its live region.
 */

export type ChartFocus = {
  /** Focused datum index, or null when nothing is focused. */
  index: number | null;
  setIndex: (index: number | null) => void;
  clear: () => void;
  /** Pointer handler → nearest datum by x. Attach to the SVG (or an overlay rect). */
  onPointerMove: (
    event: ReactPointerEvent<SVGElement>,
    /** Per-datum x positions in the SAME coordinate space `localPoint` returns. */
    positions: readonly number[],
  ) => void;
  /** Keyboard handler for stepping the focus across `count` data points. */
  onKeyDown: (event: React.KeyboardEvent<SVGElement>, count: number) => void;
};

/** Index of the position nearest `x` by absolute distance; -1 for an empty list. */
export function nearestIndex(x: number, positions: readonly number[]): number {
  let best = -1;
  let bestDist = Infinity;
  for (let i = 0; i < positions.length; i++) {
    const dist = Math.abs(positions[i]! - x);
    if (dist < bestDist) {
      bestDist = dist;
      best = i;
    }
  }
  return best;
}

/** Clamp `n` into `[0, count - 1]`; returns null when there is no datum. */
function clampIndex(n: number, count: number): number | null {
  if (count <= 0) return null;
  return Math.max(0, Math.min(count - 1, n));
}

export function useChartFocus(): ChartFocus {
  const [index, setIndex] = useState<number | null>(null);

  const onPointerMove: ChartFocus["onPointerMove"] = (event, positions) => {
    const point = localPoint(event.nativeEvent);
    if (!point) return;
    const next = nearestIndex(point.x, positions);
    setIndex(next < 0 ? null : next);
  };

  const onKeyDown: ChartFocus["onKeyDown"] = (event, count) => {
    if (count <= 0) return;
    const current = index ?? 0;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowUp":
        next = clampIndex(current + 1, count);
        break;
      case "ArrowLeft":
      case "ArrowDown":
        next = clampIndex(current - 1, count);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = count - 1;
        break;
      case "Escape":
        setIndex(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    setIndex(next);
  };

  return {
    index,
    setIndex,
    clear: () => setIndex(null),
    onPointerMove,
    onKeyDown,
  };
}

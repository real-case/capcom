/**
 * Shared chart-interaction sub-primitive layer (ADR 0093, extending 0086). The chart
 * widgets (`trends-explorer`, `funnel-builder`, `retention-grid`, `segment-builder`)
 * **compose** these rather than each re-implementing tooltips, motion, and focus. Every
 * surface is token-fed (ADR 0058/0081), theme-aware (ADR 0092), deterministic under
 * Chromatic (ADR 0043), and keyboard/AT-accessible (ADR 0039/0052). Interaction is local
 * view-state (ADR 0026); only a window-changing brush round-trips through the feature's
 * nuqs URL-state (ADR 0027) — never a fetch inside a widget (ADR 0086).
 */

export { MotionIn } from "./motion";
export type { MotionInProps } from "./motion";

export {
  ChartTooltip,
  ChartTooltipTitle,
  ChartTooltipRow,
  ChartLiveRegion,
  useChartTooltip,
} from "./tooltip";
export type { ChartTooltipProps } from "./tooltip";

export { Crosshair } from "./crosshair";
export type { CrosshairProps, CrosshairDot } from "./crosshair";

export { AreaGradient } from "./gradient";
export type { AreaGradientProps } from "./gradient";

export { ChartLegend } from "./legend";
export type { ChartLegendProps, LegendSeries } from "./legend";

export { ChartBrush } from "./brush";
export type { ChartBrushProps, BrushRange } from "./brush";

export { useChartFocus, nearestIndex } from "./use-chart-focus";
export type { ChartFocus } from "./use-chart-focus";

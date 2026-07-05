"use client";

import { useTooltip } from "@visx/tooltip";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Chart tooltip surface (ADR 0093) — the hover/focus readout composed by every chart
 * widget over the visx primitive layer (ADR 0086). State is `@visx/tooltip`'s
 * `useTooltip` (re-exported as `useChartTooltip`), which is unstyled by construction,
 * so the surface below is ours and every value is a semantic token (ADR 0058/0081) —
 * `bg-popover` / `text-popover-foreground` / `border-border`, the same card vocabulary
 * as the shadcn popover. It reads the active theme composition automatically (ADR 0092)
 * because those tokens flip with `.dark`.
 *
 * Accessibility split (ADR 0039/0052): the floating box is **decorative**
 * (`aria-hidden`) because it is pointer-positioned and `pointer-events-none`; the
 * accessible copy of the same content travels through the chart's keyboard-focusable
 * data points (their `aria-label`) and the {@link ChartLiveRegion} below, which
 * announces the focused datum politely as it changes. Nothing here is announced twice.
 */

/** `@visx/tooltip`'s state hook, typed for a chart datum. */
export function useChartTooltip<TData>() {
  return useTooltip<TData>();
}

export type ChartTooltipProps = {
  /** Whether the tooltip is shown — `tooltipOpen` from {@link useChartTooltip}. */
  open: boolean;
  /**
   * Left offset within the chart's `relative` container. Accepts a CSS length or a
   * percentage string — charts pass a `%` so the tooltip tracks the CSS-scaled SVG with
   * no layout measurement (the container matches the viewBox aspect ratio).
   */
  left: number | string;
  /** Top offset within the chart's `relative` container (px or `%` — see `left`). */
  top: number | string;
  children: ReactNode;
  className?: string;
};

/**
 * The floating, token-styled tooltip box. Render it inside the chart's `position:
 * relative` container; it positions itself with `left`/`top` (typically the focused
 * point's scaled coordinates) and lifts up-and-centered above that point. Decorative —
 * see the a11y split in the file header.
 */
export function ChartTooltip({
  open,
  left,
  top,
  children,
  className,
}: ChartTooltipProps) {
  if (!open) return null;
  return (
    <div
      aria-hidden
      data-slot="chart-tooltip"
      className={cn(
        "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full",
        "rounded-md border border-border bg-popover px-2.5 py-1.5 text-popover-foreground shadow-md",
        "motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95",
        "motion-safe:[animation-duration:var(--motion-duration-fast)]",
        className,
      )}
      style={{ left, top }}
    >
      {children}
    </div>
  );
}

/** A tooltip title row — the focused x value (e.g. the bucket date). */
export function ChartTooltipTitle({ children }: { children: ReactNode }) {
  return (
    <p className="mb-1 text-caption font-medium text-foreground">{children}</p>
  );
}

/**
 * One series row inside the tooltip: a token swatch, the series name, and its value.
 * `color` is a `var(--color-viz-*)` token passed by the chart (never a raw value) — it
 * only reaches an inline `background` because a per-series token is data-driven, the
 * same escape the static legends already use (ADR 0086).
 */
export function ChartTooltipRow({
  color,
  name,
  value,
}: {
  color: string;
  name: string;
  value: ReactNode;
}) {
  return (
    <p className="flex items-center gap-1.5 text-caption text-muted-foreground">
      <span
        aria-hidden
        className="inline-block size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className="text-foreground">{name}</span>
      <span className="ml-auto pl-3 font-mono tabular-nums text-foreground">
        {value}
      </span>
    </p>
  );
}

/**
 * A visually-hidden polite live region (ADR 0039/0052). The chart writes the focused
 * datum here — as plain text — whenever keyboard/pointer focus moves, so assistive tech
 * hears the same content the floating tooltip shows. Empty string = nothing to announce.
 */
export function ChartLiveRegion({ message }: { message: string }) {
  return (
    <span role="status" aria-live="polite" className="sr-only">
      {message}
    </span>
  );
}

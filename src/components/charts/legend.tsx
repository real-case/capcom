import { cn } from "@/lib/utils";

/**
 * Chart legend (ADR 0093) — the series key beneath a chart. Two modes on one component:
 *
 * - **Interactive** (an `onToggle` is passed): each series is a `<button>` that toggles
 *   its visibility. This is a *transient view preference*, not part of the persisted
 *   analysis, so the on/off set is **local view-state** (ADR 0026) owned by the chart and
 *   is deliberately **not** written to nuqs (ADR 0027/0093) — reload does not remember it.
 * - **Static** (no `onToggle`): a plain list, the degraded form the earlier charts shipped.
 *
 * Accessibility (ADR 0039/0052): buttons are natively keyboard-focusable and carry
 * `aria-pressed`; a hidden series also gets a **non-color** affordance — dimmed, struck
 * through, and a hollow swatch — so on/off never rests on color perception alone. Swatch
 * colors are `var(--color-viz-*)` tokens supplied by the chart (ADR 0058/0081).
 */

export type LegendSeries = {
  name: string;
  /** A `var(--color-viz-*)` token. */
  color: string;
};

export type ChartLegendProps = {
  series: LegendSeries[];
  /** Names currently toggled off. Absent/empty = all visible. */
  hidden?: ReadonlySet<string>;
  /** Toggle handler. Omit for a static, non-interactive legend. */
  onToggle?: (name: string) => void;
  /**
   * Series hover/focus handler (ADR 0093) — the chart dims the other series while one is
   * pointed at or keyboard-focused. `null` clears the highlight. Pure view-state; drives
   * a non-color highlight (stroke width), never color alone.
   */
  onHover?: (name: string | null) => void;
  /** Accessible label for the legend group. */
  label?: string;
  className?: string;
};

export function ChartLegend({
  series,
  hidden,
  onToggle,
  onHover,
  label = "Series legend",
  className,
}: ChartLegendProps) {
  const isHidden = (name: string) => hidden?.has(name) ?? false;
  // Hover/focus enter+leave for series highlight; a no-op object spread when unused so
  // the static legend stays a plain list.
  const hoverProps = (name: string) =>
    onHover
      ? {
          onPointerEnter: () => onHover(name),
          onPointerLeave: () => onHover(null),
          onFocus: () => onHover(name),
          onBlur: () => onHover(null),
        }
      : {};

  return (
    <ul
      aria-label={label}
      className={cn("flex flex-wrap gap-x-4 gap-y-1", className)}
    >
      {series.map((s) => {
        const off = isHidden(s.name);
        const swatch = (
          <span
            aria-hidden
            className={cn(
              "inline-block size-2 shrink-0 rounded-full",
              off && "opacity-40 ring-1 ring-inset ring-muted-foreground",
            )}
            style={off ? undefined : { backgroundColor: s.color }}
          />
        );
        const text = (
          // `line-through` is the non-color "off" affordance; no opacity dimming, which
          // would drop the label below AA contrast (ADR 0039/0052 — verified by axe).
          <span className={cn(off && "line-through")}>{s.name}</span>
        );

        return (
          <li key={s.name}>
            {onToggle ? (
              <button
                type="button"
                aria-pressed={!off}
                onClick={() => onToggle(s.name)}
                {...hoverProps(s.name)}
                className="flex items-center gap-1.5 rounded-sm text-caption text-muted-foreground transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {swatch}
                {text}
              </button>
            ) : (
              <span
                {...hoverProps(s.name)}
                className="flex items-center gap-1.5 text-caption text-muted-foreground"
              >
                {swatch}
                {text}
              </span>
            )}
          </li>
        );
      })}
    </ul>
  );
}

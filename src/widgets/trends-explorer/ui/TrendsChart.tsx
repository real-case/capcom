"use client";

import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { useState } from "react";

import {
  AreaGradient,
  ChartLegend,
  ChartLiveRegion,
  ChartTooltip,
  ChartTooltipRow,
  ChartTooltipTitle,
  Crosshair,
  MotionIn,
  useChartFocus,
} from "@/components/charts";
import type { EventTrendBucket } from "@/entities/event";

/**
 * Trends line chart (ADR 0086, interaction layer ADR 0093) — a presentational visx
 * widget. It receives the already-reduced `fn_event_trends` rows as props and owns no
 * fetching or aggregation (ADR 0084); the feature decides what to query. Every color
 * comes from the generated data-viz token allowlist (ADR 0058/0081) via `var(--color-*)`.
 *
 * Interaction is **local view-state** (ADR 0026): a pointer/keyboard focus index drives a
 * crosshair + tooltip, an interactive legend toggles series visibility and highlights on
 * hover, and each line carries a token area-gradient. Motion is reduced-motion-guarded
 * (ADR 0039/0043). None of it fetches or writes URL-state — a window-changing brush is
 * the feature's job (ADR 0027/0093). A fixed `viewBox` keeps the render deterministic for
 * Chromatic; the tooltip is positioned in percentages so no layout measurement runs.
 */

const VIEW_W = 720;
const VIEW_H = 280;
const MARGIN = { top: 16, right: 16, bottom: 32, left: 44 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;
// Axis tick label size, in viewBox units. Named (not an inline literal) so the
// provenance is reviewable — SVG font-size has no token utility (ADR 0058/0081).
const AXIS_FONT_SIZE = 10;
const LINE_W = 2;
const LINE_W_FOCUS = 3; // non-color affordance for the hover-highlighted series
const DIM_OPACITY = 0.25; // other series while one is highlighted

// Categorical data-viz tokens (ADR 0081), cycled per series; 'Other' takes a neutral
// token so the rollup reads as distinct from the named series.
const SERIES_COLORS = [
  "var(--color-viz-categorical-1)",
  "var(--color-viz-categorical-2)",
  "var(--color-viz-categorical-3)",
  "var(--color-viz-categorical-4)",
  "var(--color-viz-categorical-5)",
  "var(--color-viz-categorical-6)",
  "var(--color-viz-categorical-7)",
  "var(--color-viz-categorical-8)",
  "var(--color-viz-categorical-9)",
  "var(--color-viz-categorical-10)",
  "var(--color-viz-categorical-11)",
  "var(--color-viz-categorical-12)",
] as const;
const OTHER_COLOR = "var(--color-muted-foreground)";

export type TrendsChartProps = {
  /** Reduced rows from fn_event_trends (bucket, series, count). */
  data: EventTrendBucket[];
  isLoading?: boolean;
  isError?: boolean;
  /** Accessible description of what the chart shows (e.g. the event + range). */
  label?: string;
  /** Active app locale for tooltip date/number formatting (ADR 0030); math stays UTC. */
  locale?: string;
  /**
   * Seed the focused bucket index. Used by stories to pin the tooltip/crosshair open for
   * a deterministic Chromatic snapshot (ADR 0043/0093); undefined = nothing focused.
   */
  initialFocusIndex?: number;
  /** User-facing state copy, supplied (localized) by the feature; ADR 0030. */
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
  /** Accessible hint for the keyboard-focusable plot. */
  inspectHint?: string;
};

type Point = { date: Date; count: number };
type Series = { name: string; color: string; points: Point[] };

function toSeries(data: EventTrendBucket[]): Series[] {
  const byName = new Map<string, Point[]>();
  for (const row of data) {
    const points = byName.get(row.series) ?? [];
    points.push({ date: new Date(row.bucket), count: Number(row.count) });
    byName.set(row.series, points);
  }
  // Stable order: 'Other' last, the rest alphabetically — deterministic colors.
  const names = [...byName.keys()].sort((a, b) => {
    if (a === "Other") return 1;
    if (b === "Other") return -1;
    return a.localeCompare(b);
  });
  let i = 0;
  return names.map((name) => ({
    name,
    color:
      name === "Other"
        ? OTHER_COLOR
        : SERIES_COLORS[i++ % SERIES_COLORS.length]!,
    points: (byName.get(name) ?? []).sort(
      (p, q) => p.date.getTime() - q.date.getTime(),
    ),
  }));
}

/** A safe SVG id fragment from a series name (gradient defs). */
function slug(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function Message({ tone, text }: { tone: "muted" | "error"; text: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-state={tone === "error" ? "error" : "empty"}
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      className={`flex w-full items-center justify-center rounded-md border border-dashed border-border text-sm ${
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}

export function TrendsChart({
  data,
  isLoading = false,
  isError = false,
  label = "Event trend over time",
  locale = "en-US",
  initialFocusIndex,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the chart.",
  emptyLabel = "No data in this range.",
  inspectHint = "Use the arrow keys to inspect each time bucket.",
}: TrendsChartProps) {
  const focus = useChartFocus(initialFocusIndex ?? null);
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);

  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;
  if (data.length === 0) return <Message tone="muted" text={emptyLabel} />;

  const series = toSeries(data);
  const visible = series.filter((s) => !hidden.has(s.name));

  const bucketTimes = [
    ...new Set(data.map((d) => new Date(d.bucket).getTime())),
  ].sort((a, b) => a - b);
  const visibleCounts = visible.flatMap((s) => s.points.map((p) => p.count));
  const maxCount = Math.max(1, ...visibleCounts);
  const minTime = bucketTimes[0]!;
  const maxTime = bucketTimes[bucketTimes.length - 1]!;
  // A single-bucket window has a zero-width time domain, which collapses the line to an
  // invisible point at x=0. Pad the domain by one bucket's span (or a day for the
  // lone-point case) so the point renders mid-axis.
  const span =
    bucketTimes.length > 1
      ? (maxTime - minTime) / (bucketTimes.length - 1)
      : 86_400_000;
  const domainMax = minTime === maxTime ? maxTime + span : maxTime;

  const xScale = scaleTime({
    domain: [new Date(minTime), new Date(domainMax)],
    range: [0, INNER_W],
  });
  const yScale = scaleLinear({
    domain: [0, maxCount],
    range: [INNER_H, 0],
    nice: true,
  });

  const axisColor = "var(--color-border)";
  const tickColor = "var(--color-muted-foreground)";

  // Per-datum x positions in root-svg space, for pointer→nearest-bucket mapping.
  const bucketXs = bucketTimes.map(
    (t) => MARGIN.left + (xScale(new Date(t)) ?? 0),
  );

  // Focused-bucket derivations (crosshair, tooltip, live region).
  const focusIndex =
    focus.index !== null && focus.index < bucketTimes.length
      ? focus.index
      : null;
  const focusTime = focusIndex === null ? null : bucketTimes[focusIndex]!;
  const focusRows =
    focusTime === null
      ? []
      : visible
          .map((s) => {
            const point = s.points.find((p) => p.date.getTime() === focusTime);
            return point ? { series: s, count: point.count } : null;
          })
          .filter((r): r is { series: Series; count: number } => r !== null);

  const nf = new Intl.NumberFormat(locale);
  const df = new Intl.DateTimeFormat(locale, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  // Tooltip position as a percentage of the viewBox so it tracks the CSS-scaled SVG.
  const focusXRoot =
    focusTime === null ? 0 : MARGIN.left + (xScale(new Date(focusTime)) ?? 0);
  const focusYRoot =
    focusRows.length > 0
      ? MARGIN.top + Math.min(...focusRows.map((r) => yScale(r.count) ?? 0))
      : MARGIN.top;
  const leftPct = Math.max(6, Math.min(94, (focusXRoot / VIEW_W) * 100));
  const topPct = (focusYRoot / VIEW_H) * 100;

  const liveMessage =
    focusTime === null
      ? ""
      : `${df.format(new Date(focusTime))} — ${focusRows
          .map((r) => `${r.series.name} ${nf.format(r.count)}`)
          .join(", ")}`;

  const dimmed = (name: string) => hovered !== null && hovered !== name;

  return (
    <div className="flex flex-col gap-2" data-state="data">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      >
        <MotionIn className="h-full w-full">
          <div
            role="group"
            tabIndex={0}
            aria-label={`${label}. ${inspectHint}`}
            onKeyDown={(e) => focus.onKeyDown(e, bucketTimes.length)}
            onBlur={focus.clear}
            className="h-full w-full rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <svg
              viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
              width="100%"
              height="100%"
              role="img"
              aria-label={`${label}. ${series.length} series across ${bucketTimes.length} time buckets.`}
              preserveAspectRatio="xMidYMid meet"
            >
              <title>{label}</title>
              <defs>
                {visible.map((s) => (
                  <AreaGradient
                    key={s.name}
                    id={`trend-fill-${slug(s.name)}`}
                    color={s.color}
                  />
                ))}
              </defs>
              <Group left={MARGIN.left} top={MARGIN.top}>
                <AxisLeft
                  scale={yScale}
                  numTicks={4}
                  stroke={axisColor}
                  tickStroke={axisColor}
                  tickLabelProps={() => ({
                    fill: tickColor,
                    fontSize: AXIS_FONT_SIZE,
                    textAnchor: "end",
                    dx: -4,
                    dy: 3,
                  })}
                />
                <AxisBottom
                  top={INNER_H}
                  scale={xScale}
                  numTicks={6}
                  stroke={axisColor}
                  tickStroke={axisColor}
                  tickLabelProps={() => ({
                    fill: tickColor,
                    fontSize: AXIS_FONT_SIZE,
                    textAnchor: "middle",
                  })}
                />
                {visible.map((s) => (
                  <Group
                    key={s.name}
                    opacity={dimmed(s.name) ? DIM_OPACITY : 1}
                  >
                    <AreaClosed<Point>
                      data={s.points}
                      x={(p) => xScale(p.date) ?? 0}
                      y={(p) => yScale(p.count) ?? 0}
                      yScale={yScale}
                      fill={`url(#trend-fill-${slug(s.name)})`}
                    />
                    <LinePath<Point>
                      data={s.points}
                      x={(p) => xScale(p.date) ?? 0}
                      y={(p) => yScale(p.count) ?? 0}
                      stroke={s.color}
                      strokeWidth={hovered === s.name ? LINE_W_FOCUS : LINE_W}
                      strokeLinecap="round"
                    />
                  </Group>
                ))}
                {focusTime !== null && (
                  <Crosshair
                    x={xScale(new Date(focusTime)) ?? 0}
                    top={0}
                    bottom={INNER_H}
                    dots={focusRows.map((r) => ({
                      key: r.series.name,
                      y: yScale(r.count) ?? 0,
                      color: r.series.color,
                    }))}
                  />
                )}
                {/* Transparent overlay to capture pointer position across the plot. */}
                <rect
                  x={0}
                  y={0}
                  width={INNER_W}
                  height={INNER_H}
                  fill="none"
                  pointerEvents="all"
                  onPointerMove={(e) => focus.onPointerMove(e, bucketXs)}
                  onPointerLeave={focus.clear}
                />
              </Group>
            </svg>
          </div>
        </MotionIn>

        <ChartTooltip
          open={focusRows.length > 0}
          left={`${leftPct}%`}
          top={`${topPct}%`}
        >
          <ChartTooltipTitle>
            {focusTime === null ? "" : df.format(new Date(focusTime))}
          </ChartTooltipTitle>
          {focusRows.map((r) => (
            <ChartTooltipRow
              key={r.series.name}
              color={r.series.color}
              name={r.series.name}
              value={nf.format(r.count)}
            />
          ))}
        </ChartTooltip>
      </div>

      {series.length > 1 && (
        <ChartLegend
          series={series}
          hidden={hidden}
          onToggle={(name) =>
            setHidden((prev) => {
              const next = new Set(prev);
              if (next.has(name)) next.delete(name);
              else next.add(name);
              return next;
            })
          }
          onHover={setHovered}
        />
      )}

      <ChartLiveRegion message={liveMessage} />
    </div>
  );
}

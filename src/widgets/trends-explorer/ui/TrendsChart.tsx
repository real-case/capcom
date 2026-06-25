"use client";

import { AxisBottom, AxisLeft } from "@visx/axis";
import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { LinePath } from "@visx/shape";

import type { EventTrendBucket } from "@/entities/event";

/**
 * Trends line chart (ADR 0086) — a presentational visx widget. It receives the
 * already-reduced `fn_event_trends` rows as props and owns no fetching or
 * aggregation (ADR 0084); the feature decides what to query. Every color comes from
 * the generated data-viz token allowlist (ADR 0058/0081) via `var(--color-*)` — no
 * raw fill/stroke. A fixed `viewBox` keeps the render deterministic for Chromatic
 * (ADR 0043) while CSS scales the SVG to its container, so no layout measurement runs.
 */

const VIEW_W = 720;
const VIEW_H = 280;
const MARGIN = { top: 16, right: 16, bottom: 32, left: 44 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;

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

/** Shared frame so the empty / loading / error states match the chart's footprint. */
function Frame({
  children,
  state,
}: {
  children?: React.ReactNode;
  state?: string;
}) {
  return (
    <div
      className="w-full"
      data-state={state}
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
    >
      {children}
    </div>
  );
}

function Message({ tone, text }: { tone: "muted" | "error"; text: string }) {
  return (
    <Frame state={tone === "error" ? "error" : "empty"}>
      <div
        role={tone === "error" ? "alert" : "status"}
        className={`flex h-full w-full items-center justify-center rounded-md border border-dashed border-border text-sm ${
          tone === "error" ? "text-destructive" : "text-muted-foreground"
        }`}
      >
        {text}
      </div>
    </Frame>
  );
}

export function TrendsChart({
  data,
  isLoading = false,
  isError = false,
  label = "Event trend over time",
}: TrendsChartProps) {
  if (isError) return <Message tone="error" text="Couldn’t load the trend." />;
  if (isLoading) return <Message tone="muted" text="Loading trend…" />;
  if (data.length === 0)
    return <Message tone="muted" text="No events in this range." />;

  const series = toSeries(data);
  const bucketTimes = [
    ...new Set(data.map((d) => new Date(d.bucket).getTime())),
  ];
  const maxCount = Math.max(1, ...data.map((d) => Number(d.count)));
  const minTime = Math.min(...bucketTimes);
  const maxTime = Math.max(...bucketTimes);
  // A single-bucket window has a zero-width time domain, which collapses the line to
  // an invisible point at x=0. Pad the domain by one bucket's span (or a day for the
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

  return (
    <Frame state="data">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        width="100%"
        height="100%"
        role="img"
        aria-label={`${label}. ${series.length} series across ${bucketTimes.length} time buckets.`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{label}</title>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <AxisLeft
            scale={yScale}
            numTicks={4}
            stroke={axisColor}
            tickStroke={axisColor}
            tickLabelProps={() => ({
              fill: tickColor,
              fontSize: 10,
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
              fontSize: 10,
              textAnchor: "middle",
            })}
          />
          {series.map((s) => (
            <LinePath<Point>
              key={s.name}
              data={s.points}
              x={(p) => xScale(p.date) ?? 0}
              y={(p) => yScale(p.count) ?? 0}
              stroke={s.color}
              strokeWidth={2}
              strokeLinecap="round"
            />
          ))}
        </Group>
      </svg>
      {series.length > 1 ? (
        <ul
          className="mt-2 flex flex-wrap gap-x-4 gap-y-1"
          aria-label="Series legend"
        >
          {series.map((s) => (
            <li
              key={s.name}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span
                aria-hidden
                className="inline-block size-2 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {s.name}
            </li>
          ))}
        </ul>
      ) : null}
    </Frame>
  );
}

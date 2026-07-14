"use client";

import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";

import { AreaGradient, MotionIn } from "@/components/charts";
import type { OverviewSignalBucket } from "@/entities/event";

/**
 * An Overview signal sparkline (ADR 0086, 0099) — a presentational visx area/line of ONE
 * `fn_overview_signal` measure. It receives already-reduced rows as props and owns no
 * fetching or aggregation (ADR 0084). Mirrors TrendsChart's STRUCTURE — fixed viewBox,
 * aspect-ratio box, the line/area color a `var(--color-viz-*)` token (ADR 0058/0081),
 * reduced-motion `MotionIn`, a state Message box — but NOT its chrome tokens (TrendsChart is
 * still on the shadcn value layer, a Phase-E target): this chart's own chrome uses
 * mission-control tokens. NON-INTERACTIVE: a single `role="img"` + a summary aria-label, no
 * per-datum labels and no live region (the chart-a11y single-announcement rule). A fixed
 * viewBox keeps the render deterministic for Chromatic (ADR 0043).
 */

const VIEW_W = 280;
const VIEW_H = 72;
const MARGIN = { top: 6, right: 3, bottom: 6, left: 3 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const LINE_W = 2;

export type SignalMeasure = "active_users" | "new_signups" | "value_sum";

export type SignalChartProps = {
  /** Reduced rows from fn_overview_signal (bucket + the three measures). */
  data: OverviewSignalBucket[];
  /** Which measure to plot. */
  measure: SignalMeasure;
  /** Accessible summary of what the sparkline shows (localized by the widget). */
  label: string;
  /** Line/area color — a var(--color-viz-*) token (ADR 0081). */
  color?: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
};

type Point = { date: Date; value: number };

function Message({ tone, text }: { tone: "muted" | "error"; text: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-state={tone === "error" ? "error" : "empty"}
      style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      className={`flex w-full items-center justify-center rounded-md border border-dashed border-border-hairline text-sm ${
        tone === "error" ? "text-status-critical-fg" : "text-text-secondary"
      }`}
    >
      {text}
    </div>
  );
}

export function SignalChart({
  data,
  measure,
  label,
  color = "var(--color-viz-categorical-1)",
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the signal.",
  emptyLabel = "No data in this range.",
}: SignalChartProps) {
  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;

  const points: Point[] = data
    .map((row) => ({ date: new Date(row.bucket), value: Number(row[measure]) }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  // Empty = nothing to plot: no buckets, or every already-reduced bucket value is zero.
  // A per-element check (not a sum) so this never reads as an app-code reduction (ADR 0084).
  if (points.length === 0 || points.every((p) => p.value === 0))
    return <Message tone="muted" text={emptyLabel} />;

  const times = points.map((p) => p.date.getTime());
  const minTime = times[0]!;
  const maxTime = times[times.length - 1]!;
  // A single-bucket series has a zero-width domain; pad it by a day so the point renders.
  const domainMax = minTime === maxTime ? maxTime + 86_400_000 : maxTime;
  const maxVal = Math.max(1, ...points.map((p) => p.value));

  const xScale = scaleTime({
    domain: [new Date(minTime), new Date(domainMax)],
    range: [0, INNER_W],
  });
  const yScale = scaleLinear({
    domain: [0, maxVal],
    range: [INNER_H, 0],
    nice: true,
  });
  const gradientId = `signal-fill-${measure}`;

  return (
    <MotionIn variant="fade" className="w-full">
      <div
        className="w-full"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
        data-state="data"
      >
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          width="100%"
          height="100%"
          role="img"
          aria-label={`${label}. ${points.length} points.`}
          preserveAspectRatio="none"
        >
          <title>{label}</title>
          <defs>
            <AreaGradient id={gradientId} color={color} />
          </defs>
          <Group left={MARGIN.left} top={MARGIN.top}>
            <AreaClosed<Point>
              data={points}
              x={(p) => xScale(p.date) ?? 0}
              y={(p) => yScale(p.value) ?? 0}
              yScale={yScale}
              fill={`url(#${gradientId})`}
            />
            <LinePath<Point>
              data={points}
              x={(p) => xScale(p.date) ?? 0}
              y={(p) => yScale(p.value) ?? 0}
              stroke={color}
              strokeWidth={LINE_W}
              strokeLinecap="round"
            />
          </Group>
        </svg>
      </div>
    </MotionIn>
  );
}

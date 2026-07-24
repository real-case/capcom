"use client";

import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";
import { useId } from "react";

import { AreaGradient, MotionIn } from "@/components/charts";
import type { OverviewSignalBucket } from "@/entities/event";

/**
 * The launcher card's active-users sparkline (ADR 0086/0093) — a presentational visx
 * area/line over already-reduced `fn_overview_signal` rows, owning no fetching or
 * aggregation (ADR 0084). It is DELIBERATELY a local mirror of the overview-dashboard
 * SignalChart, not an import: FSD forbids a widget importing another widget (ADR 0065/0066),
 * and this launcher variant plots exactly one measure (`active_users`) with no tooltip,
 * legend, or state boxes, so keeping it separate keeps the divergence obvious.
 *
 * **Decorative a11y.** The card's heading, metric, delta, and activity line already announce
 * everything the trend conveys, so the SVG is `aria-hidden` — one announcement, not two (cf.
 * the single-announcement rule). Mission-control tokens only (ADR 0058/0081); a fixed viewBox
 * and a `useId` gradient id keep the render deterministic under Chromatic (ADR 0043).
 */

const VIEW_W = 240;
const VIEW_H = 44;
const MARGIN = { top: 4, right: 2, bottom: 4, left: 2 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const LINE_W = 2;

export type LauncherSparklineProps = {
  /** Already-reduced fn_overview_signal buckets (passed by the card; not fetched here). */
  data: OverviewSignalBucket[];
  /** Line/area color — a var(--color-viz-*) token (ADR 0081). */
  color?: string;
};

type Point = { date: Date; value: number };

export function LauncherSparkline({
  data,
  color = "var(--color-viz-categorical-1)",
}: LauncherSparklineProps) {
  const gradientId = useId();

  const points: Point[] = data
    .map((row) => ({ date: new Date(row.bucket), value: row.active_users }))
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Nothing to plot (no buckets in the window): hold the card's height with an empty box so
  // the grid stays even. An all-zero series still plots — a flat baseline reads as "quiet".
  if (points.length === 0) {
    return (
      <div
        aria-hidden="true"
        className="w-full"
        style={{ aspectRatio: `${VIEW_W} / ${VIEW_H}` }}
      />
    );
  }

  const times = points.map((p) => p.date.getTime());
  const minTime = times[0]!;
  const maxTime = times[times.length - 1]!;
  // A single-bucket series has a zero-width domain; pad it a day so the point still renders.
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
          aria-hidden="true"
          preserveAspectRatio="none"
        >
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

"use client";

import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";

import {
  AreaGradient,
  ChartLegend,
  MotionIn,
  type LegendSeries,
} from "@/components/charts";
import { MetricHero } from "@/components/ui/metric-hero";
import { MonoData } from "@/components/ui/mono-data";
import { Panel } from "@/components/ui/panel";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { EventTrendBucket } from "@/entities/event";

/**
 * The Overview hero cell (ADR 0086/0099, the reference's b-hero) — presentational, owns no
 * fetching. A `Panel` with the active-users headline (`MetricHero`) + a period-over-period
 * delta chip (`StatusIndicator` wrapping the signed percent in `MonoData`, matching KpiCard)
 * + the shared interactive-less `ChartLegend` + a multi-series visx AREA chart of the
 * activity-by-plan trend rows.
 *
 * It MIRRORS TrendsChart's STRUCTURE (fixed viewBox, aspect-ratio box, an AreaGradient per
 * series, MotionIn, a Message state box, a single `role="img"` summary) but does NOT import
 * it — `trends-explorer` is a sibling widget, and a widget↛widget import breaks Feature-Sliced
 * isolation (ADR 0065/0066). Only the shared `@/components/charts` layer is imported. Series
 * colours are `var(--color-viz-*)` tokens; all chrome is mission-control tokens (ADR 0058/0081).
 */

const VIEW_W = 560;
const VIEW_H = 220;
const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const LINE_W = 2;
const DAY_MS = 86_400_000;

const SERIES_COLORS = [
  "var(--color-viz-categorical-1)",
  "var(--color-viz-categorical-2)",
  "var(--color-viz-categorical-3)",
] as const;

export type HeroChartProps = {
  /** Reduced rows from fn_event_trends (bucket, series, count), broken down by plan. */
  data: EventTrendBucket[];
  /** Localized eyebrow (e.g. "Active users"). */
  label: string;
  /** Pre-formatted headline value (from fn_overview_kpis, not re-derived from the trend). */
  value: string;
  /** Pre-formatted signed delta (e.g. "+8%"); null → no chip. */
  delta: string | null;
  /** True when the headline delta is favorable (drives the chip tone). */
  deltaUp?: boolean;
  /** Accessible description of what the chart shows. */
  chartLabel: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
};

type Point = { date: Date; count: number };
type Series = { name: string; color: string; points: Point[] };

function toSeries(data: EventTrendBucket[]): Series[] {
  const byName = new Map<string, Point[]>();
  for (const row of data) {
    const pts = byName.get(row.series) ?? [];
    pts.push({ date: new Date(row.bucket), count: Number(row.count) });
    byName.set(row.series, pts);
  }
  const names = [...byName.keys()].sort((a, b) => a.localeCompare(b));
  return names.map((name, i) => ({
    name,
    color: SERIES_COLORS[i % SERIES_COLORS.length]!,
    points: (byName.get(name) ?? []).sort(
      (p, q) => p.date.getTime() - q.date.getTime(),
    ),
  }));
}

const slug = (name: string) => name.replace(/[^a-zA-Z0-9_-]/g, "_");

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

export function HeroChart({
  data,
  label,
  value,
  delta,
  deltaUp = true,
  chartLabel,
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the chart.",
  emptyLabel = "No data in this range.",
}: HeroChartProps) {
  const series = toSeries(data);
  const legend: LegendSeries[] = series.map((s) => ({
    name: s.name,
    color: s.color,
  }));

  const bucketTimes = [
    ...new Set(data.map((d) => new Date(d.bucket).getTime())),
  ].sort((a, b) => a - b);
  const maxCount = Math.max(1, ...data.map((d) => Number(d.count)));
  const minTime = bucketTimes[0] ?? 0;
  const maxTime = bucketTimes[bucketTimes.length - 1] ?? 0;
  const domainMax = minTime === maxTime ? maxTime + DAY_MS : maxTime;

  const xScale = scaleTime({
    domain: [new Date(minTime), new Date(domainMax)],
    range: [0, INNER_W],
  });
  const yScale = scaleLinear({
    domain: [0, maxCount],
    range: [INNER_H, 0],
    nice: true,
  });

  return (
    <Panel surface="panel" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <MetricHero label={label}>{value}</MetricHero>
        {delta !== null && (
          <StatusIndicator level={deltaUp ? "nominal" : "caution"}>
            <MonoData className="text-current">{delta}</MonoData>
          </StatusIndicator>
        )}
      </div>

      {isError ? (
        <Message tone="error" text={errorLabel} />
      ) : isLoading ? (
        <Message tone="muted" text={loadingLabel} />
      ) : bucketTimes.length === 0 ? (
        <Message tone="muted" text={emptyLabel} />
      ) : (
        <>
          {series.length > 1 && <ChartLegend series={legend} />}
          <MotionIn className="w-full">
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
                aria-label={`${chartLabel}. ${series.length} series across ${bucketTimes.length} buckets.`}
                preserveAspectRatio="none"
              >
                <title>{chartLabel}</title>
                <defs>
                  {series.map((s) => (
                    <AreaGradient
                      key={s.name}
                      id={`hero-fill-${slug(s.name)}`}
                      color={s.color}
                    />
                  ))}
                </defs>
                <Group left={MARGIN.left} top={MARGIN.top}>
                  {series.map((s) => (
                    <Group key={s.name}>
                      <AreaClosed<Point>
                        data={s.points}
                        x={(p) => xScale(p.date) ?? 0}
                        y={(p) => yScale(p.count) ?? 0}
                        yScale={yScale}
                        fill={`url(#hero-fill-${slug(s.name)})`}
                      />
                      <LinePath<Point>
                        data={s.points}
                        x={(p) => xScale(p.date) ?? 0}
                        y={(p) => yScale(p.count) ?? 0}
                        stroke={s.color}
                        strokeWidth={LINE_W}
                        strokeLinecap="round"
                      />
                    </Group>
                  ))}
                </Group>
              </svg>
            </div>
          </MotionIn>
        </>
      )}
    </Panel>
  );
}

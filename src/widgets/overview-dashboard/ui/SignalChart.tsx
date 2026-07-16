"use client";

import { Group } from "@visx/group";
import { scaleLinear, scaleTime } from "@visx/scale";
import { AreaClosed, LinePath } from "@visx/shape";

import { AreaGradient, MotionIn } from "@/components/charts";
import type { OverviewSignalBucket } from "@/entities/event";

import type { SignalMeasure } from "../model/kpis";

/**
 * An Overview mini sparkline (ADR 0086, 0099) — the presentational visx area/line inside a
 * `.panel.mini` cell. It receives already-reduced `fn_overview_signal` rows as props and owns
 * no fetching or aggregation (ADR 0084). It plots ONE {@link SignalMeasure}: the three
 * columns directly, or the two DERIVED ratios (`conversion` = purchasers / active_users,
 * `arpu` = value_sum / active_users) computed per bucket from two already-reduced scalars of
 * the SAME row — presentation (ADR 0087/0088), not a cross-row reduction.
 *
 * **Decorative a11y (matching the reference, :1546/:1583/:1617).** The sparkline lives inside
 * a mini whose eyebrow + metric + delta already announce the value, so the SVG is
 * `aria-hidden` — it adds no redundant announcement and sidesteps the single-announcement
 * question. The informative bento charts (Hero/Bars/Funnel/Scatter) keep `role="img"` +
 * summary. Mission-control tokens; a fixed viewBox keeps the render deterministic.
 */

const VIEW_W = 240;
const VIEW_H = 48;
const MARGIN = { top: 4, right: 2, bottom: 4, left: 2 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const LINE_W = 2;

export type { SignalMeasure };

export type SignalChartProps = {
  /** Reduced rows from fn_overview_signal (bucket + the four measures). */
  data: OverviewSignalBucket[];
  /** Which measure to plot (column or derived ratio). */
  measure: SignalMeasure;
  /** Accessible summary — unused for the decorative render; retained for the state boxes. */
  label?: string;
  /** Line/area color — a var(--color-viz-*) token (ADR 0081). */
  color?: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
};

type Point = { date: Date; value: number };

/**
 * The per-bucket value for a measure. Columns pass through; `conversion`/`arpu` are ratios of
 * two already-reduced scalars of the SAME row, each guarding a zero denominator to 0 —
 * presentation (ADR 0087/0088), never a cross-row reduction.
 */
function measureValue(
  row: OverviewSignalBucket,
  measure: SignalMeasure,
): number {
  const active = Number(row.active_users);
  switch (measure) {
    case "active_users":
      return active;
    case "new_signups":
      return Number(row.new_signups);
    case "value_sum":
      return Number(row.value_sum);
    case "purchasers":
      return Number(row.purchasers);
    case "conversion":
      return active === 0 ? 0 : Number(row.purchasers) / active;
    case "arpu":
      return active === 0 ? 0 : Number(row.value_sum) / active;
  }
}

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
    .map((row) => ({
      date: new Date(row.bucket),
      value: measureValue(row, measure),
    }))
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

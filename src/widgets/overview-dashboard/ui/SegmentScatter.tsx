"use client";

import { Group } from "@visx/group";
import { scaleLinear } from "@visx/scale";

import { MotionIn } from "@/components/charts";
import { Panel } from "@/components/ui/panel";
import type { SegmentScatterPoint } from "@/entities/segment";

/**
 * The Overview segment-scatter cell (ADR 0086/0099, the reference's b-seg) — presentational,
 * owns no fetching. A `Panel` + eyebrow + a visx SCATTER of the already-reduced
 * `fn_segment_scatter` points: x = event frequency, y = lifetime value, each point coloured by
 * its plan from a `var(--color-viz-*)` token (ADR 0058/0081). Axis captions use
 * `--color-text-secondary` (never `--text-tertiary` — the repo states it is not AA-guaranteed).
 * Fixed viewBox, `MotionIn`, a Message state box, a single `role="img"` summary (no per-datum
 * labels, no live region — the single-announcement rule; the points are pseudonymous, ADR 0083).
 */

const VIEW_W = 560;
const VIEW_H = 200;
const MARGIN = { top: 10, right: 12, bottom: 22, left: 40 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;
const DOT_R = 3;
const AXIS_FONT = 10;

const PLAN_COLORS = [
  "var(--color-viz-categorical-1)",
  "var(--color-viz-categorical-2)",
  "var(--color-viz-categorical-3)",
  "var(--color-viz-categorical-4)",
] as const;
const UNKNOWN_COLOR = "var(--color-text-tertiary)";

export type SegmentScatterProps = {
  /** Reduced points from fn_segment_scatter (distinct_id, frequency, ltv, plan). */
  data: SegmentScatterPoint[];
  /** Localized eyebrow (e.g. "Segments · freq × LTV"). */
  label: string;
  /** Accessible description of what the chart shows. */
  chartLabel: string;
  /** Localized axis captions. */
  xLabel?: string;
  yLabel?: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
};

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

export function SegmentScatter({
  data,
  label,
  chartLabel,
  xLabel = "Frequency",
  yLabel = "LTV",
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the segment.",
  emptyLabel = "No users match this range.",
}: SegmentScatterProps) {
  const plans = [
    ...new Set(data.map((p) => p.plan).filter((p): p is string => p !== null)),
  ].sort((a, b) => a.localeCompare(b));
  const colorOf = (plan: string | null) =>
    plan === null
      ? UNKNOWN_COLOR
      : PLAN_COLORS[plans.indexOf(plan) % PLAN_COLORS.length]!;

  const maxFreq = Math.max(1, ...data.map((p) => Number(p.frequency)));
  const maxLtv = Math.max(1, ...data.map((p) => Number(p.ltv)));
  const xScale = scaleLinear({
    domain: [0, maxFreq],
    range: [0, INNER_W],
    nice: true,
  });
  const yScale = scaleLinear({
    domain: [0, maxLtv],
    range: [INNER_H, 0],
    nice: true,
  });

  return (
    <Panel surface="panel" className="flex flex-col gap-3">
      <span className="text-label text-text-secondary">{label}</span>
      {isError ? (
        <Message tone="error" text={errorLabel} />
      ) : isLoading ? (
        <Message tone="muted" text={loadingLabel} />
      ) : data.length === 0 ? (
        <Message tone="muted" text={emptyLabel} />
      ) : (
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
              aria-label={`${chartLabel}. ${data.length} users by frequency and lifetime value.`}
              preserveAspectRatio="xMidYMid meet"
            >
              <title>{chartLabel}</title>
              <Group left={MARGIN.left} top={MARGIN.top}>
                {/* Axis baselines. */}
                <line
                  x1={0}
                  y1={INNER_H}
                  x2={INNER_W}
                  y2={INNER_H}
                  stroke="var(--color-border-hairline)"
                />
                <line
                  x1={0}
                  y1={0}
                  x2={0}
                  y2={INNER_H}
                  stroke="var(--color-border-hairline)"
                />
                {data.map((p) => (
                  <circle
                    key={p.distinct_id}
                    cx={xScale(Number(p.frequency)) ?? 0}
                    cy={yScale(Number(p.ltv)) ?? 0}
                    r={DOT_R}
                    fill={colorOf(p.plan)}
                    fillOpacity={0.75}
                  />
                ))}
              </Group>
              {/* Axis captions. */}
              <text
                x={MARGIN.left + INNER_W / 2}
                y={VIEW_H - 4}
                textAnchor="middle"
                fontSize={AXIS_FONT}
                fill="var(--color-text-secondary)"
              >
                {xLabel}
              </text>
              <text
                x={10}
                y={MARGIN.top + INNER_H / 2}
                textAnchor="middle"
                fontSize={AXIS_FONT}
                fill="var(--color-text-secondary)"
                transform={`rotate(-90 10 ${MARGIN.top + INNER_H / 2})`}
              >
                {yLabel}
              </text>
            </svg>
          </div>
        </MotionIn>
      )}
    </Panel>
  );
}

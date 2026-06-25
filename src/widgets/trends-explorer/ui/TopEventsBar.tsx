"use client";

import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";

import type { TopEvent } from "@/entities/event";

/**
 * Top-events bar chart (ADR 0086) — a presentational visx widget. It receives the
 * reduced `fn_top_events` rows as props and owns no fetching or aggregation
 * (ADR 0084). Bars take their fill from a data-viz token (ADR 0058/0081) via
 * `var(--color-*)`. A fixed `viewBox` keeps the render deterministic for Chromatic
 * (ADR 0043); CSS scales the SVG to its container.
 */

const VIEW_W = 720;
const ROW_H = 28;
const MARGIN = { top: 8, right: 48, bottom: 8, left: 120 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;

const BAR_COLOR = "var(--color-viz-categorical-1)";

export type TopEventsBarProps = {
  /** Reduced rows from fn_top_events (event_name, count), pre-ranked desc. */
  data: TopEvent[];
  isLoading?: boolean;
  isError?: boolean;
  label?: string;
};

function Message({ tone, text }: { tone: "muted" | "error"; text: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-state={tone === "error" ? "error" : "empty"}
      className={`flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border text-sm ${
        tone === "error" ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {text}
    </div>
  );
}

export function TopEventsBar({
  data,
  isLoading = false,
  isError = false,
  label = "Top events in range",
}: TopEventsBarProps) {
  if (isError) return <Message tone="error" text="Couldn’t load top events." />;
  if (isLoading) return <Message tone="muted" text="Loading top events…" />;
  if (data.length === 0)
    return <Message tone="muted" text="No events in this range." />;

  const innerH = data.length * ROW_H;
  const viewH = innerH + MARGIN.top + MARGIN.bottom;
  const maxCount = Math.max(1, ...data.map((d) => Number(d.count)));

  const yScale = scaleBand({
    domain: data.map((d) => d.event_name),
    range: [0, innerH],
    padding: 0.2,
  });
  const xScale = scaleLinear({ domain: [0, maxCount], range: [0, INNER_W] });

  const labelColor = "var(--color-foreground)";
  const valueColor = "var(--color-muted-foreground)";

  return (
    <div className="w-full" data-state="data">
      <svg
        viewBox={`0 0 ${VIEW_W} ${viewH}`}
        width="100%"
        height={viewH}
        role="img"
        aria-label={`${label}. ${data.length} events.`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{label}</title>
        <Group left={MARGIN.left} top={MARGIN.top}>
          {data.map((d) => {
            const y = yScale(d.event_name) ?? 0;
            const w = xScale(Number(d.count));
            const h = yScale.bandwidth();
            return (
              <Group key={d.event_name}>
                <text
                  x={-8}
                  y={y + h / 2}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={labelColor}
                >
                  {d.event_name}
                </text>
                <Bar x={0} y={y} width={w} height={h} fill={BAR_COLOR} rx={2} />
                <text
                  x={w + 6}
                  y={y + h / 2}
                  dominantBaseline="middle"
                  fontSize={11}
                  fill={valueColor}
                >
                  {Number(d.count).toLocaleString("en-US")}
                </text>
              </Group>
            );
          })}
        </Group>
      </svg>
    </div>
  );
}

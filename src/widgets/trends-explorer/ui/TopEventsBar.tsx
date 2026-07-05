"use client";

import { Group } from "@visx/group";
import { scaleBand, scaleLinear } from "@visx/scale";
import { Bar } from "@visx/shape";
import { useState } from "react";

import {
  ChartLiveRegion,
  ChartTooltip,
  ChartTooltipRow,
  ChartTooltipTitle,
  MotionIn,
} from "@/components/charts";
import type { TopEvent } from "@/entities/event";

/**
 * Top-events bar chart (ADR 0086, interaction layer ADR 0093) — a presentational visx
 * widget. It receives the reduced `fn_top_events` rows as props and owns no fetching or
 * aggregation (ADR 0084). Bars take their fill from a data-viz token (ADR 0058/0081) via
 * `var(--color-*)`. Each bar is hover/focus-interactive: a token tooltip shows the count,
 * the pointed/focused bar keeps full weight while the others dim (a non-color highlight,
 * ADR 0039/0052), and a live region announces the focused bar. A fixed aspect-ratio box
 * keeps the render deterministic for Chromatic (ADR 0043) and lets the tooltip position
 * in percentages with no layout measurement.
 */

const VIEW_W = 720;
const ROW_H = 28;
const MARGIN = { top: 8, right: 48, bottom: 8, left: 120 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const BAR_COLOR = "var(--color-viz-categorical-1)";
// Bar label / value size, in viewBox units. Named (not an inline literal) so the
// provenance is reviewable — SVG font-size has no token utility (ADR 0058/0081).
const LABEL_FONT_SIZE = 11;
const DIM_OPACITY = 0.4;
const FOCUS_RING = "var(--color-foreground)";

export type TopEventsBarProps = {
  /** Reduced rows from fn_top_events (event_name, count), pre-ranked desc. */
  data: TopEvent[];
  isLoading?: boolean;
  isError?: boolean;
  label?: string;
  /** Active app locale for number formatting (ADR 0030). */
  locale?: string;
  /** Pin a bar's tooltip open (stories/Chromatic determinism, ADR 0043/0093). */
  initialFocusIndex?: number;
  /** User-facing state copy, supplied (localized) by the feature; ADR 0030. */
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
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
  locale = "en-US",
  initialFocusIndex,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load top events.",
  emptyLabel = "No data in this range.",
}: TopEventsBarProps) {
  const [active, setActive] = useState<number | null>(
    initialFocusIndex ?? null,
  );

  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;
  if (data.length === 0) return <Message tone="muted" text={emptyLabel} />;

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
  const nf = new Intl.NumberFormat(locale);

  const activeRow = active !== null ? data[active] : undefined;
  const activeY = active !== null ? (yScale(data[active]!.event_name) ?? 0) : 0;
  // Tooltip anchor: end of the active bar, vertically centered on the row.
  const tipXRoot =
    activeRow === undefined ? 0 : MARGIN.left + xScale(Number(activeRow.count));
  const tipYRoot = MARGIN.top + activeY + yScale.bandwidth() / 2;
  const leftPct = Math.max(6, Math.min(94, (tipXRoot / VIEW_W) * 100));
  const topPct = (tipYRoot / viewH) * 100;

  const liveMessage =
    activeRow === undefined
      ? ""
      : `${activeRow.event_name}: ${nf.format(Number(activeRow.count))}`;

  return (
    <div className="flex flex-col" data-state="data">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${VIEW_W} / ${viewH}` }}
      >
        <MotionIn className="h-full w-full">
          <svg
            viewBox={`0 0 ${VIEW_W} ${viewH}`}
            width="100%"
            height="100%"
            role="group"
            aria-label={`${label}. ${data.length} events.`}
            preserveAspectRatio="xMidYMid meet"
          >
            <title>{label}</title>
            <Group left={MARGIN.left} top={MARGIN.top}>
              {data.map((d, i) => {
                const y = yScale(d.event_name) ?? 0;
                const w = xScale(Number(d.count));
                const h = yScale.bandwidth();
                const dim = active !== null && active !== i;
                return (
                  <g
                    key={d.event_name}
                    tabIndex={0}
                    role="img"
                    aria-label={`${d.event_name}: ${nf.format(Number(d.count))}`}
                    opacity={dim ? DIM_OPACITY : 1}
                    onPointerEnter={() => setActive(i)}
                    onPointerLeave={() => setActive(null)}
                    onFocus={() => setActive(i)}
                    onBlur={() => setActive(null)}
                  >
                    <text
                      x={-8}
                      y={y + h / 2}
                      textAnchor="end"
                      dominantBaseline="middle"
                      fontSize={LABEL_FONT_SIZE}
                      fill={labelColor}
                    >
                      {d.event_name}
                    </text>
                    <Bar
                      x={0}
                      y={y}
                      width={w}
                      height={h}
                      fill={BAR_COLOR}
                      rx={2}
                      stroke={active === i ? FOCUS_RING : "none"}
                      strokeWidth={active === i ? 1.5 : 0}
                    />
                    <text
                      x={w + 6}
                      y={y + h / 2}
                      dominantBaseline="middle"
                      fontSize={LABEL_FONT_SIZE}
                      fill={valueColor}
                    >
                      {nf.format(Number(d.count))}
                    </text>
                  </g>
                );
              })}
            </Group>
          </svg>
        </MotionIn>

        <ChartTooltip
          open={activeRow !== undefined}
          left={`${leftPct}%`}
          top={`${topPct}%`}
        >
          <ChartTooltipTitle>{activeRow?.event_name}</ChartTooltipTitle>
          <ChartTooltipRow
            color={BAR_COLOR}
            name="Events"
            value={nf.format(Number(activeRow?.count ?? 0))}
          />
        </ChartTooltip>
      </div>

      <ChartLiveRegion message={liveMessage} />
    </div>
  );
}

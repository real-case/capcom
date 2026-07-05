"use client";

import { Bar } from "@visx/shape";
import { useState } from "react";

import {
  ChartLiveRegion,
  ChartTooltip,
  ChartTooltipRow,
  ChartTooltipTitle,
  MotionIn,
} from "@/components/charts";
import type { SegmentDistributionRow } from "@/entities/segment";

/**
 * Segment distribution (ADR 0086, interaction layer ADR 0093) — a presentational
 * visx-token horizontal bar chart. It receives the already-reduced
 * `fn_segment_distribution` rows and the scalar segment `size` as props and owns no
 * fetching or aggregation (ADR 0084/0089). Each bar's **percentage** is derived here from
 * `users / size` — display formatting, not event reduction (ADR 0089). Every color comes
 * from the categorical token allowlist (ADR 0058/0081). Each bucket is hover/focus-
 * interactive: a token tooltip shows the count and share, the focused bar keeps full
 * weight while the others dim (a non-color highlight, ADR 0039/0052). A fixed aspect-ratio
 * box keeps the render deterministic for Chromatic (ADR 0043) and lets the tooltip
 * position in percentages with no layout measurement.
 */

// Layout, in viewBox units. Named (not inline literals) so the provenance is reviewable —
// SVG geometry/font-size has no token utility (ADR 0058/0081).
const PAD = 4;
const LABEL_W = 104; // left gutter: the bucket value
const VALUE_W = 96; // right gutter: count + percentage
const BAR_AREA = 280; // the plotted bar track width
const ROW_H = 30;
const BAR_H = 18;
const BAR_RADIUS = 3;
const LABEL_FONT_SIZE = 12;
const VALUE_FONT_SIZE = 11;
const MIN_BAR = 2; // a sliver so a tiny non-zero bucket is still visible
const DIM_OPACITY = 0.4;
const FOCUS_RING = "var(--color-foreground)";
const VIEW_W = PAD + LABEL_W + BAR_AREA + VALUE_W + PAD;

// Categorical data-viz scale (ADR 0081): a colorblind-safe hue per bucket, cycled. Each is
// a literal token so the usage gate (ADR 0058) sees a `var(--color-*)`, never a computed name.
const CATEGORICAL = [
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

export type SegmentDistributionProps = {
  /** Reduced rows from fn_segment_distribution, descending by users (SQL order). */
  data: SegmentDistributionRow[];
  /** The scalar segment size (distinct matching users) — the denominator for each share. */
  size?: number;
  isLoading?: boolean;
  isError?: boolean;
  /** Accessible description of what the chart shows (localized; ADR 0030). */
  label?: string;
  /** Active app locale for number formatting (ADR 0030). */
  locale?: string;
  /** Pin a bucket's tooltip open (stories/Chromatic determinism, ADR 0043/0093). */
  initialFocusIndex?: number;
  /** Headline: "{size} {usersLabel}" — the total distinct users in the segment. */
  usersLabel?: string;
  /** User-facing state copy, supplied (localized) by the widget; ADR 0030. */
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

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

export function SegmentDistribution({
  data,
  size,
  isLoading = false,
  isError = false,
  label = "Segment distribution",
  locale = "en-US",
  initialFocusIndex,
  usersLabel = "matching users",
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the segment.",
  emptyLabel = "No users match this segment.",
}: SegmentDistributionProps) {
  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;

  // The headline total: the scalar size when available, else the summed buckets.
  const total = size ?? data.reduce((sum, row) => sum + Number(row.users), 0);
  const nf = new Intl.NumberFormat(locale);

  return (
    <div
      className="flex flex-col gap-4"
      data-state={data.length ? "data" : "empty"}
    >
      <p className="text-sm text-muted-foreground">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {nf.format(total)}
        </span>{" "}
        {usersLabel}
      </p>

      {data.length === 0 ? (
        <Message tone="muted" text={emptyLabel} />
      ) : (
        <Distribution
          data={data}
          total={total}
          label={label}
          nf={nf}
          initialFocusIndex={initialFocusIndex}
          usersLabel={usersLabel}
        />
      )}
    </div>
  );
}

function Distribution({
  data,
  total,
  label,
  nf,
  initialFocusIndex,
  usersLabel,
}: {
  data: SegmentDistributionRow[];
  total: number;
  label: string;
  nf: Intl.NumberFormat;
  initialFocusIndex?: number;
  usersLabel: string;
}) {
  const [active, setActive] = useState<number | null>(
    initialFocusIndex ?? null,
  );
  const viewH = PAD + data.length * ROW_H + PAD;

  const activeRow = active !== null ? data[active] : undefined;
  const activeShare =
    activeRow && total > 0 ? Number(activeRow.users) / total : 0;
  const activeRowTop = active !== null ? PAD + active * ROW_H : 0;
  const tipXRoot =
    PAD + LABEL_W + (activeRow ? Math.max(MIN_BAR, activeShare * BAR_AREA) : 0);
  const tipYRoot = activeRowTop + ROW_H / 2;
  const leftPct = Math.max(6, Math.min(94, (tipXRoot / VIEW_W) * 100));
  const topPct = (tipYRoot / viewH) * 100;

  const rowAria = (row: SegmentDistributionRow) => {
    const share = total > 0 ? Number(row.users) / total : 0;
    return `${row.bucket}: ${nf.format(Number(row.users))} ${usersLabel}, ${pct(
      share,
    )}`;
  };
  const liveMessage = activeRow === undefined ? "" : rowAria(activeRow);

  return (
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
          aria-label={`${label}. ${data.length} buckets; bar length is each bucket's share of the ${nf.format(
            total,
          )} matching users.`}
          preserveAspectRatio="xMidYMid meet"
        >
          <title>{label}</title>

          {data.map((row, i) => {
            const users = Number(row.users);
            const rowTop = PAD + i * ROW_H;
            const barY = rowTop + (ROW_H - BAR_H) / 2;
            // Bar length is the bucket's share of the segment — the same ratio the value
            // text shows and the aria-label announces, so visual and number always agree.
            const share = total > 0 ? users / total : 0;
            const width =
              users > 0 && total > 0 ? Math.max(MIN_BAR, share * BAR_AREA) : 0;
            const dim = active !== null && active !== i;
            return (
              <g
                key={row.bucket}
                tabIndex={0}
                role="img"
                aria-label={rowAria(row)}
                opacity={dim ? DIM_OPACITY : 1}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
                onFocus={() => setActive(i)}
                onBlur={() => setActive(null)}
              >
                {/* Bucket label (the trait value, or "(unknown)"). */}
                <text
                  x={PAD}
                  y={rowTop + ROW_H / 2 + 4}
                  fontSize={LABEL_FONT_SIZE}
                  fill="var(--color-foreground)"
                >
                  {row.bucket}
                </text>
                {/* The bar track + value bar. */}
                <Bar
                  x={PAD + LABEL_W}
                  y={barY}
                  width={BAR_AREA}
                  height={BAR_H}
                  rx={BAR_RADIUS}
                  fill="var(--color-muted)"
                />
                <Bar
                  x={PAD + LABEL_W}
                  y={barY}
                  width={width}
                  height={BAR_H}
                  rx={BAR_RADIUS}
                  fill={CATEGORICAL[i % CATEGORICAL.length]}
                  stroke={active === i ? FOCUS_RING : "none"}
                  strokeWidth={active === i ? 1.5 : 0}
                />
                {/* Count + share of the segment. */}
                <text
                  x={VIEW_W - PAD}
                  y={rowTop + ROW_H / 2 + 4}
                  textAnchor="end"
                  fontSize={VALUE_FONT_SIZE}
                  fill="var(--color-muted-foreground)"
                >
                  {`${nf.format(users)} · ${pct(share)}`}
                </text>
              </g>
            );
          })}
        </svg>
      </MotionIn>

      <ChartTooltip
        open={activeRow !== undefined}
        left={`${leftPct}%`}
        top={`${topPct}%`}
      >
        <ChartTooltipTitle>{activeRow?.bucket}</ChartTooltipTitle>
        <ChartTooltipRow
          color={CATEGORICAL[(active ?? 0) % CATEGORICAL.length]!}
          name={usersLabel}
          value={`${nf.format(Number(activeRow?.users ?? 0))} · ${pct(activeShare)}`}
        />
      </ChartTooltip>

      <ChartLiveRegion message={liveMessage} />
    </div>
  );
}

"use client";

import { Bar } from "@visx/shape";

import type { SegmentDistributionRow } from "@/entities/segment";

/**
 * Segment distribution (ADR 0086) — a presentational visx-token horizontal bar chart. It
 * receives the already-reduced `fn_segment_distribution` rows and the scalar segment
 * `size` as props and owns no fetching or aggregation (ADR 0084/0089); the widget decides
 * what to query. Each bar's **percentage** of the segment is derived here from
 * `users / size` — a ratio of two already-reduced counts is display formatting, not event
 * reduction, so it stays out of SQL (ADR 0089). Bars are visx `<Bar>` shapes; every color
 * comes from the generated token allowlist (ADR 0058/0081) via `var(--color-*)` — the
 * categorical data-viz palette, no raw fill/stroke value. A `viewBox` sized
 * deterministically from the row count keeps the render stable for Chromatic (ADR 0043)
 * while CSS scales the SVG to its container.
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
  usersLabel = "matching users",
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the segment.",
  emptyLabel = "No users match this segment.",
}: SegmentDistributionProps) {
  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;

  // The headline total: the scalar size when available, else the summed buckets.
  const total = size ?? data.reduce((sum, row) => sum + Number(row.users), 0);

  return (
    <div
      className="flex flex-col gap-4"
      data-state={data.length ? "data" : "empty"}
    >
      <p className="text-sm text-muted-foreground">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {total.toLocaleString()}
        </span>{" "}
        {usersLabel}
      </p>

      {data.length === 0 ? (
        <Message tone="muted" text={emptyLabel} />
      ) : (
        <Chart data={data} total={total} label={label} />
      )}
    </div>
  );
}

function Chart({
  data,
  total,
  label,
}: {
  data: SegmentDistributionRow[];
  total: number;
  label: string;
}) {
  const viewW = PAD + LABEL_W + BAR_AREA + VALUE_W + PAD;
  const viewH = PAD + data.length * ROW_H + PAD;

  return (
    <svg
      viewBox={`0 0 ${viewW} ${viewH}`}
      width="100%"
      height={viewH}
      role="img"
      aria-label={`${label}. ${data.length} buckets; bar length is each bucket's share of the ${total.toLocaleString()} matching users.`}
      preserveAspectRatio="xMidYMid meet"
    >
      <title>{label}</title>

      {data.map((row, i) => {
        const users = Number(row.users);
        const rowTop = PAD + i * ROW_H;
        const barY = rowTop + (ROW_H - BAR_H) / 2;
        // Bar length is the bucket's share of the segment — the same ratio the value text
        // shows and the aria-label announces, so the visual and the number always agree.
        const share = total > 0 ? users / total : 0;
        const width =
          users > 0 && total > 0 ? Math.max(MIN_BAR, share * BAR_AREA) : 0;
        return (
          <g key={row.bucket}>
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
            />
            {/* Count + share of the segment. */}
            <text
              x={viewW - PAD}
              y={rowTop + ROW_H / 2 + 4}
              textAnchor="end"
              fontSize={VALUE_FONT_SIZE}
              fill="var(--color-muted-foreground)"
            >
              {`${users.toLocaleString()} · ${pct(share)}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

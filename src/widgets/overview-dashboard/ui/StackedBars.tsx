"use client";

import { Group } from "@visx/group";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { BarStack } from "@visx/shape";

import { MotionIn } from "@/components/charts";
import { Panel } from "@/components/ui/panel";
import type { EventTrendBucket } from "@/entities/event";

/**
 * The Overview stacked-bars cell (ADR 0086/0099, the reference's b-bars) — presentational,
 * owns no fetching. A `Panel` + eyebrow + a visx `BarStack` of the sign-ups-by-plan trend
 * rows (buckets × plan series), the colour scale drawn only from `var(--color-viz-*)` tokens
 * (ADR 0058/0081). Fixed viewBox, `MotionIn`, a Message state box, a single `role="img"`
 * summary (no per-datum labels, no live region — the single-announcement rule). It receives
 * already-reduced rows as props and owns no aggregation (ADR 0084).
 */

const VIEW_W = 560;
const VIEW_H = 200;
const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const INNER_H = VIEW_H - MARGIN.top - MARGIN.bottom;

const SERIES_COLORS = [
  "var(--color-viz-categorical-1)",
  "var(--color-viz-categorical-2)",
  "var(--color-viz-categorical-3)",
] as const;

export type StackedBarsProps = {
  /** Reduced rows from fn_event_trends (bucket, series, count), broken down by plan. */
  data: EventTrendBucket[];
  /** Localized eyebrow (e.g. "Weekly sign-ups by plan"). */
  label: string;
  /** Accessible description of what the chart shows. */
  chartLabel: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
};

type Row = { bucket: string } & Record<string, number>;

/** Pivot the long (bucket, series, count) rows into wide bucket rows for BarStack. */
function toRows(data: EventTrendBucket[]): { rows: Row[]; keys: string[] } {
  const keys = [...new Set(data.map((d) => d.series))].sort((a, b) =>
    a.localeCompare(b),
  );
  const byBucket = new Map<string, Row>();
  for (const d of data) {
    const row = byBucket.get(d.bucket) ?? ({ bucket: d.bucket } as Row);
    row[d.series] = Number(d.count);
    byBucket.set(d.bucket, row);
  }
  const rows = [...byBucket.values()].sort((a, b) =>
    a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0,
  );
  // Zero-fill missing series so the stack total is well-defined.
  for (const row of rows) for (const k of keys) row[k] ??= 0;
  return { rows, keys };
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

export function StackedBars({
  data,
  label,
  chartLabel,
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the chart.",
  emptyLabel = "No data in this range.",
}: StackedBarsProps) {
  const { rows, keys } = toRows(data);
  const totals = rows.map((r) => keys.reduce((s, k) => s + (r[k] ?? 0), 0));
  const maxTotal = Math.max(1, ...totals);

  const xScale = scaleBand<string>({
    domain: rows.map((r) => r.bucket),
    range: [0, INNER_W],
    padding: 0.3,
  });
  const yScale = scaleLinear<number>({
    domain: [0, maxTotal],
    range: [INNER_H, 0],
    nice: true,
  });
  const colorScale = scaleOrdinal<string, string>({
    domain: keys,
    range: keys.map((_, i) => SERIES_COLORS[i % SERIES_COLORS.length]!),
  });

  return (
    <Panel surface="panel" className="flex flex-col gap-3">
      <span className="text-label text-text-secondary">{label}</span>
      {isError ? (
        <Message tone="error" text={errorLabel} />
      ) : isLoading ? (
        <Message tone="muted" text={loadingLabel} />
      ) : rows.length === 0 || maxTotal <= 1 ? (
        <Message tone="muted" text={emptyLabel} />
      ) : (
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
              aria-label={`${chartLabel}. ${keys.length} plans across ${rows.length} buckets.`}
              preserveAspectRatio="none"
            >
              <title>{chartLabel}</title>
              <Group left={MARGIN.left} top={MARGIN.top}>
                <BarStack<Row, string>
                  data={rows}
                  keys={keys}
                  x={(r) => r.bucket}
                  xScale={xScale}
                  yScale={yScale}
                  color={colorScale}
                >
                  {(stacks) =>
                    stacks.map((stack) =>
                      stack.bars.map((bar) => (
                        <rect
                          key={`${stack.key}-${bar.index}`}
                          x={bar.x}
                          y={bar.y}
                          width={bar.width}
                          height={Math.max(0, bar.height)}
                          fill={bar.color}
                          rx={2}
                        />
                      )),
                    )
                  }
                </BarStack>
              </Group>
            </svg>
          </div>
        </MotionIn>
      )}
    </Panel>
  );
}

"use client";

import type { RetentionCell } from "@/entities/event";

import type { Period } from "../model/url-state";

/**
 * Retention cohort grid (ADR 0086) — a presentational visx-token heatmap. It receives
 * the already-reduced `fn_retention` cells as props and owns no fetching or aggregation
 * (ADR 0084/0088); the widget decides what to query. Each cell's retention **percentage**
 * is derived here from `retained_users / cohort_size` — a ratio of two already-reduced
 * counts is display formatting, not event reduction, so it stays out of SQL (ADR 0088).
 * Every color comes from the generated token allowlist (ADR 0058/0081) via
 * `var(--color-*)` — the sequential data-viz palette for the cells, no raw fill/stroke.
 * A `viewBox` sized deterministically from the data dimensions keeps the render stable
 * for Chromatic (ADR 0043) while CSS scales the SVG to its container.
 */

// Layout, in viewBox units. Named (not inline literals) so the provenance is reviewable
// — SVG geometry/font-size has no token utility (ADR 0058/0081).
const PAD = 4;
const LABEL_W = 92; // left gutter: cohort date + size
const HEADER_H = 22; // top gutter: period-offset headers
const CELL_W = 46; // column step
const CELL_H = 34; // row step
const GAP = 3; // inset so cells read as a grid
const CELL_RADIUS = 3;
const HEADER_FONT_SIZE = 10;
const LABEL_FONT_SIZE = 11;
const CAPTION_FONT_SIZE = 9;
const CELL_FONT_SIZE = 11;

// Sequential data-viz scale (ADR 0081), darkest→brightest = lower→higher retention on
// the dark-first surface. Five discrete steps; each is a literal token so the usage gate
// (ADR 0058) sees a `var(--color-*)` and never a computed name.
const SCALE = [
  "var(--color-viz-sequential-1)",
  "var(--color-viz-sequential-2)",
  "var(--color-viz-sequential-3)",
  "var(--color-viz-sequential-4)",
  "var(--color-viz-sequential-5)",
] as const;
// Text color per scale bin: the two brightest fills take dark text, the darker fills
// light text — so the in-cell percentage stays legible across the scale.
const SCALE_TEXT = [
  "var(--color-foreground)",
  "var(--color-foreground)",
  "var(--color-foreground)",
  "var(--color-background)",
  "var(--color-background)",
] as const;

export type CohortGridProps = {
  /** Reduced rows from fn_retention, any order (the widget groups them). */
  data: RetentionCell[];
  /** Cohort/period granularity — drives the date labels and the header unit. */
  period?: Period;
  isLoading?: boolean;
  isError?: boolean;
  /** Accessible description of what the grid shows. */
  label?: string;
  /** User-facing state copy, supplied (localized) by the widget; ADR 0030. */
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
  /** Legend captions (localized); the sequential scale runs low → high retention. */
  lowLabel?: string;
  highLabel?: string;
};

type Cohort = {
  period: string;
  size: number;
  /** period_offset → retained_users for the cells this cohort has. */
  cells: Map<number, number>;
};

/** Group the flat cells into cohorts (oldest first) and find the widest offset column. */
function toGrid(data: RetentionCell[]): {
  cohorts: Cohort[];
  maxOffset: number;
} {
  const byPeriod = new Map<string, Cohort>();
  let maxOffset = 0;
  for (const cell of data) {
    const offset = Number(cell.period_offset);
    maxOffset = Math.max(maxOffset, offset);
    const existing = byPeriod.get(cell.cohort_period);
    const cohort = existing ?? {
      period: cell.cohort_period,
      size: Number(cell.cohort_size),
      cells: new Map(),
    };
    cohort.cells.set(offset, Number(cell.retained_users));
    byPeriod.set(cell.cohort_period, cohort);
  }
  const cohorts = [...byPeriod.values()].sort((a, b) =>
    a.period < b.period ? -1 : a.period > b.period ? 1 : 0,
  );
  return { cohorts, maxOffset };
}

/** Rate 0..1 → a 0..4 bin into the sequential scale; 0 (and empty) sit at the darkest. */
function bin(rate: number): number {
  if (rate <= 0) return 0;
  return Math.min(SCALE.length - 1, Math.floor(rate * SCALE.length));
}

const pct = (rate: number) => `${Math.round(rate * 100)}%`;

const weekFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  day: "numeric",
});
const monthFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: "UTC",
  month: "short",
  year: "numeric",
});

/** Format a cohort period for the row label (deterministic: fixed locale + UTC). */
function formatCohort(period: string, granularity: Period): string {
  const d = new Date(period);
  return granularity === "month" ? monthFmt.format(d) : weekFmt.format(d);
}

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

export function CohortGrid({
  data,
  period = "week",
  isLoading = false,
  isError = false,
  label = "Retention by cohort",
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load retention.",
  emptyLabel = "No cohorts in this range.",
  lowLabel = "Lower",
  highLabel = "Higher",
}: CohortGridProps) {
  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;
  if (data.length === 0) return <Message tone="muted" text={emptyLabel} />;

  const { cohorts, maxOffset } = toGrid(data);
  const cols = maxOffset + 1;
  const viewW = LABEL_W + cols * CELL_W + PAD;
  const viewH = HEADER_H + cohorts.length * CELL_H + PAD;
  const unit = period === "month" ? "M" : "W";

  return (
    <div className="w-full" data-state="data">
      <svg
        viewBox={`0 0 ${viewW} ${viewH}`}
        width="100%"
        height={viewH}
        role="img"
        aria-label={`${label}. ${cohorts.length} ${period}ly cohorts over ${cols} periods; cells show the share of each cohort active in each later period (offset 0 is 100% by definition).`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{label}</title>

        {/* Corner: the row unit (W = weeks since first seen, M = months). */}
        <text
          x={PAD}
          y={HEADER_H - 7}
          fontSize={HEADER_FONT_SIZE}
          fill="var(--color-muted-foreground)"
        >
          {period === "month" ? "Month" : "Week"}
        </text>

        {/* Column headers: the period offset (0 = the cohort's own period). */}
        {Array.from({ length: cols }, (_, c) => (
          <text
            key={`h-${c}`}
            x={LABEL_W + c * CELL_W + (CELL_W - GAP) / 2}
            y={HEADER_H - 7}
            textAnchor="middle"
            fontSize={HEADER_FONT_SIZE}
            fill="var(--color-muted-foreground)"
          >
            {`${unit}${c}`}
          </text>
        ))}

        {cohorts.map((cohort, r) => {
          const rowTop = HEADER_H + r * CELL_H;
          return (
            <g key={cohort.period}>
              {/* Row label: cohort date + size. */}
              <text
                x={PAD}
                y={rowTop + CELL_H / 2 - 1}
                fontSize={LABEL_FONT_SIZE}
                fill="var(--color-foreground)"
              >
                {formatCohort(cohort.period, period)}
              </text>
              <text
                x={PAD}
                y={rowTop + CELL_H / 2 + 11}
                fontSize={CAPTION_FONT_SIZE}
                fill="var(--color-muted-foreground)"
              >
                {`n=${cohort.size.toLocaleString()}`}
              </text>

              {/* Cells — only the offsets this cohort actually has (triangular). */}
              {Array.from({ length: cols }, (_, c) => {
                const retained = cohort.cells.get(c);
                if (retained === undefined) return null;
                const rate = cohort.size > 0 ? retained / cohort.size : 0;
                const b = bin(rate);
                const x = LABEL_W + c * CELL_W;
                return (
                  <g key={`${cohort.period}-${c}`}>
                    <rect
                      x={x}
                      y={rowTop}
                      width={CELL_W - GAP}
                      height={CELL_H - GAP}
                      rx={CELL_RADIUS}
                      fill={SCALE[b]}
                      stroke="var(--color-border)"
                      strokeWidth={1}
                    />
                    <text
                      x={x + (CELL_W - GAP) / 2}
                      y={rowTop + (CELL_H - GAP) / 2 + 4}
                      textAnchor="middle"
                      fontSize={CELL_FONT_SIZE}
                      fill={SCALE_TEXT[b]}
                    >
                      {pct(rate)}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </svg>

      {/* Sequential legend so the color encoding is interpretable. */}
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
        <span>{lowLabel}</span>
        <span className="flex" aria-hidden>
          {SCALE.map((color, i) => (
            <span
              key={i}
              className="inline-block size-3"
              style={{ backgroundColor: color }}
            />
          ))}
        </span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

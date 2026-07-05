"use client";

import { Group } from "@visx/group";
import { Bar } from "@visx/shape";
import { useState } from "react";

import {
  ChartLiveRegion,
  ChartTooltip,
  ChartTooltipRow,
  ChartTooltipTitle,
  MotionIn,
} from "@/components/charts";
import type { RetentionCell } from "@/entities/event";

import type { Period } from "../model/url-state";

/**
 * Retention cohort grid (ADR 0086, interaction layer ADR 0093) — a presentational
 * visx-token heatmap. It receives the already-reduced `fn_retention` cells as props and
 * owns no fetching or aggregation (ADR 0084/0088). Each cell's retention **percentage** is
 * derived here from `retained_users / cohort_size` — display formatting, not event
 * reduction (ADR 0088). Cells are visx `<Bar>` shapes; every color comes from the
 * sequential token allowlist (ADR 0058/0081). A cell reveals a token tooltip on hover and
 * on keyboard focus: the grid is one focusable region and the arrow keys rove the focused
 * cell (Home/End jump, Escape clears) — a single tab stop, not one per cell (a dense grid
 * would otherwise be dozens of stops). The focused cell takes a ring outline as a
 * non-color affordance (ADR 0039/0052). A fixed aspect-ratio box keeps the render
 * deterministic for Chromatic (ADR 0043) and lets the tooltip position in percentages.
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
const FOCUS_RING = "var(--color-foreground)";
const FOCUS_RING_W = 2;

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
  /** Active app locale for the date labels (ADR 0030); date math stays UTC. */
  locale?: string;
  /** Pin a cell's tooltip open (stories/Chromatic determinism, ADR 0043/0093). */
  initialFocusIndex?: number;
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
  /** Tooltip caption for the retained/size row (localized; ADR 0030). */
  retainedLabel?: string;
  /** Accessible hint for the keyboard-focusable grid. */
  inspectHint?: string;
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

/**
 * Format a cohort period for the row label. The label follows the active app locale
 * (ADR 0030) — passed down from the widget — while the date math stays pinned to UTC so
 * the calendar bucket the SQL produced (ADR 0088) is never shifted by the viewer's zone.
 */
function formatCohort(
  period: string,
  granularity: Period,
  locale: string,
): string {
  const d = new Date(period);
  const opts: Intl.DateTimeFormatOptions =
    granularity === "month"
      ? { timeZone: "UTC", month: "short", year: "numeric" }
      : { timeZone: "UTC", month: "short", day: "numeric" };
  return new Intl.DateTimeFormat(locale, opts).format(d);
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

/** One focus/hover target: a cell's grid position and its numbers. */
type FlatCell = {
  r: number;
  c: number;
  cohort: Cohort;
  retained: number;
  rate: number;
};

export function CohortGrid({
  data,
  period = "week",
  locale = "en-US",
  initialFocusIndex,
  isLoading = false,
  isError = false,
  label = "Retention by cohort",
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load retention.",
  emptyLabel = "No cohorts in this range.",
  lowLabel = "Lower",
  highLabel = "Higher",
  retainedLabel = "Retained",
  inspectHint = "Use the arrow keys to inspect each cell.",
}: CohortGridProps) {
  const [active, setActive] = useState<number | null>(
    initialFocusIndex ?? null,
  );

  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;
  if (data.length === 0) return <Message tone="muted" text={emptyLabel} />;

  const { cohorts, maxOffset } = toGrid(data);
  const cols = maxOffset + 1;
  const viewW = LABEL_W + cols * CELL_W + PAD;
  const viewH = HEADER_H + cohorts.length * CELL_H + PAD;
  const unit = period === "month" ? "M" : "W";
  const nf = new Intl.NumberFormat(locale);

  // Flatten the triangular cells into a stable focus order (row-major, oldest first).
  const flat: FlatCell[] = [];
  const flatIndexAt = new Map<string, number>();
  cohorts.forEach((cohort, r) => {
    for (let c = 0; c < cols; c++) {
      const retained = cohort.cells.get(c);
      if (retained === undefined) continue;
      const rate = cohort.size > 0 ? retained / cohort.size : 0;
      flatIndexAt.set(`${r}-${c}`, flat.length);
      flat.push({ r, c, cohort, retained, rate });
    }
  });

  const cellAria = (cell: FlatCell) =>
    `${formatCohort(cell.cohort.period, period, locale)}, ${unit}${cell.c}: ${pct(
      cell.rate,
    )} retained (${nf.format(cell.retained)} of ${nf.format(cell.cohort.size)})`;

  const activeCell =
    active !== null && active < flat.length ? flat[active]! : undefined;
  const tipXRoot = activeCell
    ? LABEL_W + activeCell.c * CELL_W + (CELL_W - GAP) / 2
    : 0;
  const tipYRoot = activeCell ? HEADER_H + activeCell.r * CELL_H : 0;
  const leftPct = Math.max(6, Math.min(94, (tipXRoot / viewW) * 100));
  const topPct = (tipYRoot / viewH) * 100;
  const liveMessage = activeCell ? cellAria(activeCell) : "";

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (flat.length === 0) return;
    const current = active ?? 0;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        next = Math.min(flat.length - 1, current + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        next = Math.max(0, current - 1);
        break;
      case "Home":
        next = 0;
        break;
      case "End":
        next = flat.length - 1;
        break;
      case "Escape":
        setActive(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    setActive(next);
  };

  return (
    <div className="flex flex-col gap-3" data-state="data">
      <div
        className="relative w-full"
        style={{ aspectRatio: `${viewW} / ${viewH}` }}
      >
        <MotionIn variant="fade" className="h-full w-full">
          <div
            role="group"
            tabIndex={0}
            aria-label={`${label}. ${inspectHint}`}
            onKeyDown={onKeyDown}
            onBlur={() => setActive(null)}
            className="h-full w-full rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            <svg
              viewBox={`0 0 ${viewW} ${viewH}`}
              width="100%"
              height="100%"
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
                  <Group key={cohort.period}>
                    {/* Row label: cohort date + size. */}
                    <text
                      x={PAD}
                      y={rowTop + CELL_H / 2 - 1}
                      fontSize={LABEL_FONT_SIZE}
                      fill="var(--color-foreground)"
                    >
                      {formatCohort(cohort.period, period, locale)}
                    </text>
                    <text
                      x={PAD}
                      y={rowTop + CELL_H / 2 + 11}
                      fontSize={CAPTION_FONT_SIZE}
                      fill="var(--color-muted-foreground)"
                    >
                      {`n=${nf.format(cohort.size)}`}
                    </text>

                    {/* Cells — only the offsets this cohort actually has (triangular). */}
                    {Array.from({ length: cols }, (_, c) => {
                      const retained = cohort.cells.get(c);
                      if (retained === undefined) return null;
                      const rate = cohort.size > 0 ? retained / cohort.size : 0;
                      const b = bin(rate);
                      const x = LABEL_W + c * CELL_W;
                      const i = flatIndexAt.get(`${r}-${c}`);
                      const focused = active !== null && active === i;
                      return (
                        <Group key={`${cohort.period}-${c}`}>
                          <Bar
                            x={x}
                            y={rowTop}
                            width={CELL_W - GAP}
                            height={CELL_H - GAP}
                            rx={CELL_RADIUS}
                            fill={SCALE[b]}
                            stroke={
                              focused ? FOCUS_RING : "var(--color-border)"
                            }
                            strokeWidth={focused ? FOCUS_RING_W : 1}
                            onPointerEnter={() => setActive(i ?? null)}
                            onPointerLeave={() => setActive(null)}
                          />
                          <text
                            x={x + (CELL_W - GAP) / 2}
                            y={rowTop + (CELL_H - GAP) / 2 + 4}
                            textAnchor="middle"
                            fontSize={CELL_FONT_SIZE}
                            fill={SCALE_TEXT[b]}
                            pointerEvents="none"
                          >
                            {pct(rate)}
                          </text>
                        </Group>
                      );
                    })}
                  </Group>
                );
              })}
            </svg>
          </div>
        </MotionIn>

        <ChartTooltip
          open={activeCell !== undefined}
          left={`${leftPct}%`}
          top={`${topPct}%`}
        >
          <ChartTooltipTitle>
            {activeCell
              ? `${formatCohort(activeCell.cohort.period, period, locale)} · ${unit}${activeCell.c}`
              : ""}
          </ChartTooltipTitle>
          {activeCell ? (
            <ChartTooltipRow
              color={SCALE[bin(activeCell.rate)]!}
              name={retainedLabel}
              value={`${nf.format(activeCell.retained)} / ${nf.format(
                activeCell.cohort.size,
              )} · ${pct(activeCell.rate)}`}
            />
          ) : null}
        </ChartTooltip>
      </div>

      {/* Sequential legend so the color encoding is interpretable. */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
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

      <ChartLiveRegion message={liveMessage} />
    </div>
  );
}

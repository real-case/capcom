"use client";

import { Bar } from "@visx/shape";

import type { FunnelStep } from "@/entities/event";

/**
 * Funnel conversion chart (ADR 0086) — a presentational visx widget. It receives the
 * already-reduced `fn_funnel` rows as props and owns no fetching or aggregation
 * (ADR 0084/0087); the widget decides what to query. Conversion **percentages** are
 * derived here from the per-step user counts — a ratio of two already-reduced numbers
 * is display formatting, not event reduction, so it stays out of SQL (ADR 0087).
 * Every color comes from the generated token allowlist (ADR 0058/0081) via
 * `var(--color-*)` — no raw fill/stroke. A fixed `viewBox` keeps the render
 * deterministic for Chromatic (ADR 0043) while CSS scales the SVG to its container.
 */

const VIEW_W = 720;
const MARGIN = { top: 8, right: 8, bottom: 8, left: 8 };
const INNER_W = VIEW_W - MARGIN.left - MARGIN.right;
const ROW_H = 60;
const BAR_H = 26;
const BAR_RADIUS = 4;
// Text sizes, in viewBox units. Named (not inline literals) so the provenance is
// reviewable — SVG font-size has no token utility (ADR 0058/0081).
const LABEL_FONT_SIZE = 12;
const CAPTION_FONT_SIZE = 11;

const BAR_COLOR = "var(--color-viz-categorical-1)";
const TRACK_COLOR = "var(--color-muted)";

export type FunnelChartProps = {
  /** Reduced rows from fn_funnel (step_index, step_event, users), ordered by step. */
  data: FunnelStep[];
  isLoading?: boolean;
  isError?: boolean;
  /** Accessible description of what the funnel shows. */
  label?: string;
  /** User-facing state copy, supplied (localized) by the widget; ADR 0030. */
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
};

type Row = {
  index: number;
  event: string;
  users: number;
  /** Share of the entry step (step 1), 0..1 — the bar width. */
  overall: number;
  /** Share of the previous step, 0..1 — the step-over-step conversion (undefined at step 1). */
  fromPrev?: number;
};

function toRows(data: FunnelStep[]): Row[] {
  // Step 1 is the max by construction (counts are non-increasing, ADR 0087); guard 0.
  const entry = Math.max(1, Number(data[0]?.users ?? 0));
  return data.map((d, i) => {
    const users = Number(d.users);
    const prev = i > 0 ? Number(data[i - 1]!.users) : undefined;
    return {
      index: Number(d.step_index),
      event: d.step_event,
      users,
      overall: users / entry,
      fromPrev: prev === undefined ? undefined : prev > 0 ? users / prev : 0,
    };
  });
}

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

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

export function FunnelChart({
  data,
  isLoading = false,
  isError = false,
  label = "Funnel conversion by step",
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the funnel.",
  emptyLabel = "No data for these steps.",
}: FunnelChartProps) {
  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;
  if (data.length === 0) return <Message tone="muted" text={emptyLabel} />;

  const rows = toRows(data);
  const viewH = rows.length * ROW_H + MARGIN.top + MARGIN.bottom;
  const last = rows[rows.length - 1]!;

  return (
    <div className="w-full" data-state="data">
      <svg
        viewBox={`0 0 ${VIEW_W} ${viewH}`}
        width="100%"
        height={viewH}
        role="img"
        aria-label={`${label}. ${rows.length} steps, ${pct(
          last.overall,
        )} overall conversion from ${rows[0]!.users} to ${last.users} users.`}
        preserveAspectRatio="xMidYMid meet"
      >
        <title>{label}</title>
        {rows.map((row, i) => {
          const top = MARGIN.top + i * ROW_H;
          const barTop = top + 18;
          const barW = Math.max(0, row.overall) * INNER_W;
          return (
            <g key={`${row.index}-${row.event}`}>
              {/* Header line: step label (left) and the count + overall share (right). */}
              <text
                x={MARGIN.left}
                y={top + 11}
                fontSize={LABEL_FONT_SIZE}
                fill="var(--color-foreground)"
              >
                {`${row.index}. ${row.event}`}
              </text>
              <text
                x={VIEW_W - MARGIN.right}
                y={top + 11}
                textAnchor="end"
                fontSize={LABEL_FONT_SIZE}
                fill="var(--color-muted-foreground)"
              >
                {`${row.users.toLocaleString()} · ${pct(row.overall)}`}
              </text>
              {/* Track (full width) + filled bar (proportional to the entry step). */}
              <Bar
                x={MARGIN.left}
                y={barTop}
                width={INNER_W}
                height={BAR_H}
                rx={BAR_RADIUS}
                fill={TRACK_COLOR}
              />
              <Bar
                x={MARGIN.left}
                y={barTop}
                width={barW}
                height={BAR_H}
                rx={BAR_RADIUS}
                fill={BAR_COLOR}
              />
              {/* Step-over-step conversion caption (every step after the entry). */}
              {row.fromPrev === undefined ? null : (
                <text
                  x={MARGIN.left}
                  y={barTop + BAR_H + 12}
                  fontSize={CAPTION_FONT_SIZE}
                  fill="var(--color-muted-foreground)"
                >
                  {`${pct(row.fromPrev)} from previous step`}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

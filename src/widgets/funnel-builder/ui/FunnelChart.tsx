"use client";

import { Bar } from "@visx/shape";
import { useState } from "react";

import { ChartTooltip, ChartTooltipTitle, MotionIn } from "@/components/charts";
import type { FunnelStep } from "@/entities/event";

/**
 * Funnel conversion chart (ADR 0086, interaction layer ADR 0093) — a presentational visx
 * widget. It receives the already-reduced `fn_funnel` rows as props and owns no fetching
 * or aggregation (ADR 0084/0087). Conversion **percentages** are derived here from the
 * per-step user counts — a ratio of two already-reduced numbers is display formatting,
 * not event reduction (ADR 0087). Every color comes from the token allowlist
 * (ADR 0058/0081) via `var(--color-*)`. Each step is an individually focusable
 * `&lt;g role="img"&gt;` whose `aria-label` states its conversion (ADR 0039/0052) — the sole
 * announcement on the keyboard path, so no separate live region. Hover/focus shows a token
 * tooltip that breaks down users, overall share, and step-over-step conversion, and keeps
 * that step at full weight while the others dim (a non-color highlight). A fixed
 * aspect-ratio box keeps the render deterministic for Chromatic (ADR 0043) and lets the
 * tooltip position in percentages with no layout measurement.
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
const DIM_OPACITY = 0.4;

const BAR_COLOR = "var(--color-viz-categorical-1)";
const TRACK_COLOR = "var(--color-muted)";
const FOCUS_RING = "var(--color-foreground)";

export type FunnelChartProps = {
  /** Reduced rows from fn_funnel (step_index, step_event, users), ordered by step. */
  data: FunnelStep[];
  isLoading?: boolean;
  isError?: boolean;
  /** Accessible description of what the funnel shows. */
  label?: string;
  /** Active app locale for number formatting (ADR 0030). */
  locale?: string;
  /** Pin a step's tooltip open (stories/Chromatic determinism, ADR 0043/0093). */
  initialFocusIndex?: number;
  /** Tooltip line captions (localized; ADR 0030). */
  usersLabel?: string;
  overallLabel?: string;
  fromPrevLabel?: string;
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
  locale = "en-US",
  initialFocusIndex,
  usersLabel = "Users",
  overallLabel = "Overall",
  fromPrevLabel = "From previous",
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the funnel.",
  emptyLabel = "No data for these steps.",
}: FunnelChartProps) {
  const [active, setActive] = useState<number | null>(
    initialFocusIndex ?? null,
  );

  if (isError) return <Message tone="error" text={errorLabel} />;
  if (isLoading) return <Message tone="muted" text={loadingLabel} />;
  if (data.length === 0) return <Message tone="muted" text={emptyLabel} />;

  const rows = toRows(data);
  const viewH = rows.length * ROW_H + MARGIN.top + MARGIN.bottom;
  const last = rows[rows.length - 1]!;
  const nf = new Intl.NumberFormat(locale);

  const activeRow = active !== null ? rows[active] : undefined;
  const activeTop = active !== null ? MARGIN.top + active * ROW_H : 0;
  const tipXRoot =
    activeRow === undefined
      ? 0
      : MARGIN.left + Math.max(0, activeRow.overall) * INNER_W;
  const tipYRoot = activeTop + 18; // the bar top of the active row
  const leftPct = Math.max(6, Math.min(94, (tipXRoot / VIEW_W) * 100));
  const topPct = (tipYRoot / viewH) * 100;

  const rowAria = (row: Row) =>
    `${row.index}. ${row.event}: ${nf.format(row.users)} users, ${pct(
      row.overall,
    )} overall${
      row.fromPrev === undefined
        ? ""
        : `, ${pct(row.fromPrev)} from the previous step`
    }`;

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
            aria-label={`${label}. ${rows.length} steps, ${pct(
              last.overall,
            )} overall conversion from ${nf.format(
              rows[0]!.users,
            )} to ${nf.format(last.users)} users.`}
            preserveAspectRatio="xMidYMid meet"
          >
            <title>{label}</title>
            {rows.map((row, i) => {
              const top = MARGIN.top + i * ROW_H;
              const barTop = top + 18;
              const barW = Math.max(0, row.overall) * INNER_W;
              const dim = active !== null && active !== i;
              return (
                <g
                  key={`${row.index}-${row.event}`}
                  tabIndex={0}
                  role="img"
                  aria-label={rowAria(row)}
                  opacity={dim ? DIM_OPACITY : 1}
                  onPointerEnter={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                >
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
                    {`${nf.format(row.users)} · ${pct(row.overall)}`}
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
                    stroke={active === i ? FOCUS_RING : "none"}
                    strokeWidth={active === i ? 1.5 : 0}
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
        </MotionIn>

        <ChartTooltip
          open={activeRow !== undefined}
          left={`${leftPct}%`}
          top={`${topPct}%`}
        >
          <ChartTooltipTitle>
            {activeRow ? `${activeRow.index}. ${activeRow.event}` : ""}
          </ChartTooltipTitle>
          {activeRow ? (
            <dl className="grid grid-cols-[auto_auto] gap-x-3 text-caption">
              <dt className="text-muted-foreground">{usersLabel}</dt>
              <dd className="text-right font-mono tabular-nums text-foreground">
                {nf.format(activeRow.users)}
              </dd>
              <dt className="text-muted-foreground">{overallLabel}</dt>
              <dd className="text-right font-mono tabular-nums text-foreground">
                {pct(activeRow.overall)}
              </dd>
              {activeRow.fromPrev === undefined ? null : (
                <>
                  <dt className="text-muted-foreground">{fromPrevLabel}</dt>
                  <dd className="text-right font-mono tabular-nums text-foreground">
                    {pct(activeRow.fromPrev)}
                  </dd>
                </>
              )}
            </dl>
          ) : null}
        </ChartTooltip>
      </div>
    </div>
  );
}

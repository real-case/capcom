import { MetricHero } from "@/components/ui/metric-hero";
import { MonoData } from "@/components/ui/mono-data";
import { Panel } from "@/components/ui/panel";

import { formatPacing } from "../model/kpis";

/**
 * The goal cell (ADR 0099, the reference's b-goal) — presentational, owns no fetching. The
 * "goal" is the previous equal-length span's revenue; `pacingRatio = value_sum /
 * value_sum_prev` (>1 = ahead of the prior pace, <1 = behind). Composes a `Panel` + a phead
 * (eyebrow + an honest "vs the previous period" caption — never a "target", since no goals
 * table exists) + a RADIAL gauge (an SVG progress ring swept by the pacingRatio, the fill on
 * `--status-nominal-fg` when ahead / `--status-caution-fg` when behind — a semantic-over-
 * decorative deviation from the reference's viz gradient, disclosed) with the pace percent in
 * its centre (`MetricHero`), and the 4-row target-free kv block (revenue · pace · purchasers ·
 * ARPU) in `MonoData`. The ring is decorative (`aria-hidden`); the percent + kv rows carry the
 * meaning. States: loading, error, empty (an em dash). Mission-control tokens only; no external
 * margin.
 */
export type PacingRow = { label: string; value: string };

export type PacingCardProps = {
  /** Localized label (e.g. "Goal pacing"). */
  label: string;
  /** Localized phead caption (e.g. "vs the previous period"). */
  caption?: string;
  /** value_sum(current) / value_sum(previous equal span); null → em dash, empty ring. */
  pacingRatio: number | null;
  /** The four target-free kv rows, pre-formatted (label + value) by the widget. */
  rows?: PacingRow[];
  locale?: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
};

// Ring geometry, in viewBox units (no token utility for SVG geometry, ADR 0058/0081).
const RING_SIZE = 132;
const RING_R = 56;
const RING_C = 2 * Math.PI * RING_R;
const RING_W = 12;

export function PacingCard({
  label,
  caption,
  pacingRatio,
  rows = [],
  locale = "en-US",
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load pacing.",
}: PacingCardProps) {
  const state = isError ? "error" : isLoading ? "loading" : "data";
  const ahead = pacingRatio !== null && pacingRatio >= 1;
  // The ring sweeps toward a full circle at 100% of the previous span's pace; clamp to [0,1]
  // so far-ahead/behind both render a readable arc.
  const fraction =
    pacingRatio === null ? 0 : Math.max(0, Math.min(1, pacingRatio));

  if (state === "error") {
    return (
      <Panel surface="panel" className="flex flex-col gap-2" data-state="error">
        <span className="text-label text-text-secondary">{label}</span>
        <p role="alert" className="text-status-critical-fg text-sm">
          {errorLabel}
        </p>
      </Panel>
    );
  }
  if (state === "loading") {
    return (
      <Panel
        surface="panel"
        className="flex flex-col gap-2"
        data-state="loading"
      >
        <span className="text-label text-text-secondary">{label}</span>
        <p role="status" className="text-text-secondary text-sm">
          {loadingLabel}
        </p>
      </Panel>
    );
  }

  return (
    <Panel surface="panel" className="flex flex-col gap-4" data-state="data">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label text-text-secondary">{label}</span>
        {caption != null && (
          <span className="text-caption text-text-secondary">{caption}</span>
        )}
      </div>

      <div className="relative mx-auto aspect-square w-[min(60%,132px)]">
        <svg
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          width="100%"
          height="100%"
          aria-hidden="true"
        >
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            fill="none"
            stroke="var(--color-surface-elevated)"
            strokeWidth={RING_W}
          />
          <circle
            cx={RING_SIZE / 2}
            cy={RING_SIZE / 2}
            r={RING_R}
            fill="none"
            stroke={
              ahead
                ? "var(--color-status-nominal-fg)"
                : "var(--color-status-caution-fg)"
            }
            strokeWidth={RING_W}
            strokeLinecap="round"
            strokeDasharray={RING_C}
            strokeDashoffset={RING_C * (1 - fraction)}
            transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <MetricHero className="items-center">
            {formatPacing(pacingRatio, locale)}
          </MetricHero>
        </div>
      </div>

      {rows.length > 0 && (
        <dl className="flex flex-col gap-1.5">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-3"
            >
              <dt className="text-caption text-text-secondary">{row.label}</dt>
              <dd>
                <MonoData tone="primary" className="text-sm">
                  {row.value}
                </MonoData>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}

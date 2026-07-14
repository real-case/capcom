import { MetricHero } from "@/components/ui/metric-hero";
import { Panel } from "@/components/ui/panel";

import { formatPacing } from "../model/kpis";

/**
 * The goal-pacing gauge (ADR 0099) — presentational, owns no fetching. The "goal" is the
 * previous equal-length span's revenue; `pacingRatio = value_sum / value_sum_prev` (>1 =
 * ahead of the prior pace, <1 = behind). Composes a `Panel` + a `MetricHero` pace percent +
 * a token'd progress bar: a `--surface-elevated` track with a `--status-nominal|caution` fill
 * whose width is a computed style (the GroupRollup scaled-bar precedent — a data-driven
 * layout value, not a raw color/size literal, ADR 0058). The bar is decorative
 * (aria-hidden); the pace percent + caption carry the meaning. States: loading, empty (an em
 * dash), error. Mission-control tokens only; no external margin.
 */
export type PacingCardProps = {
  /** Localized label (e.g. "Goal pacing"). */
  label: string;
  /** value_sum(current) / value_sum(previous equal span); null → em dash, no bar. */
  pacingRatio: number | null;
  /** Localized caption (e.g. "vs previous 30 days"). */
  caption?: string;
  locale?: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
};

export function PacingCard({
  label,
  pacingRatio,
  caption,
  locale = "en-US",
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load pacing.",
}: PacingCardProps) {
  const state = isError ? "error" : isLoading ? "loading" : "data";
  const ahead = pacingRatio !== null && pacingRatio >= 1;
  // The bar fills toward 100% = matching the previous span's pace; ahead-of-pace shows a
  // full bar. Clamp to [0, 1] for the visual width regardless of how far ahead/behind.
  const fillPct =
    pacingRatio === null ? 0 : Math.max(0, Math.min(1, pacingRatio)) * 100;

  return (
    <Panel surface="panel" className="flex flex-col gap-3" data-state={state}>
      {state === "error" ? (
        <div className="flex flex-col gap-1">
          <span className="text-label text-text-secondary">{label}</span>
          <p role="alert" className="text-status-critical-fg text-sm">
            {errorLabel}
          </p>
        </div>
      ) : state === "loading" ? (
        <div className="flex flex-col gap-1">
          <span className="text-label text-text-secondary">{label}</span>
          <p role="status" className="text-text-secondary text-sm">
            {loadingLabel}
          </p>
        </div>
      ) : (
        <>
          <MetricHero label={label}>
            {formatPacing(pacingRatio, locale)}
          </MetricHero>
          <div
            aria-hidden="true"
            className="bg-surface-elevated h-2 w-full overflow-hidden rounded-full"
          >
            <div
              className={`h-full rounded-full ${
                ahead ? "bg-status-nominal-fg" : "bg-status-caution-fg"
              }`}
              style={{ width: `${fillPct}%` }}
            />
          </div>
          {caption != null && (
            <span className="text-caption text-text-secondary">{caption}</span>
          )}
        </>
      )}
    </Panel>
  );
}

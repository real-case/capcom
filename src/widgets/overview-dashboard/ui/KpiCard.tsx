import { MetricHero } from "@/components/ui/metric-hero";
import { MonoData } from "@/components/ui/mono-data";
import { Panel } from "@/components/ui/panel";
import { StatusIndicator } from "@/components/ui/status-indicator";

import { formatDelta } from "../model/kpis";

/**
 * A single Overview KPI card (ADR 0099) — presentational, owns no fetching. Composes the
 * shipped mission-control primitives: a `Panel` surface, a `MetricHero` value, and a
 * period-over-period delta as a `StatusIndicator` (nominal for a favorable ↑, caution for
 * an unfavorable ↓ — every Overview KPI is "higher is better") whose signed percent renders
 * in `MonoData`. States: loading, empty (the value is an em dash), and error. Mission-control
 * tokens only (ADR 0058); no external margin. Copy is passed in (localized by the widget,
 * ADR 0030); `locale` formats the numeric delta, matching the TrendsChart prop pattern.
 */
export type KpiCardProps = {
  /** Localized KPI label. */
  label: string;
  /** Pre-formatted value string (locale-aware; an em dash for a guarded null). */
  value: string;
  /** Period-over-period delta ratio; null → no delta chip. */
  deltaRatio: number | null;
  /** Localized accessible suffix for the delta (e.g. "vs previous 30 days"). */
  deltaCaption?: string;
  locale?: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
};

export function KpiCard({
  label,
  value,
  deltaRatio,
  deltaCaption,
  locale = "en-US",
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load this metric.",
}: KpiCardProps) {
  const state = isError ? "error" : isLoading ? "loading" : "data";

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
          <MetricHero label={label}>{value}</MetricHero>
          {deltaRatio !== null && (
            <StatusIndicator
              level={deltaRatio >= 0 ? "nominal" : "caution"}
              aria-label={
                deltaCaption
                  ? `${formatDelta(deltaRatio, locale)} ${deltaCaption}`
                  : undefined
              }
            >
              <MonoData className="text-current">
                {formatDelta(deltaRatio, locale)}
              </MonoData>
            </StatusIndicator>
          )}
        </>
      )}
    </Panel>
  );
}

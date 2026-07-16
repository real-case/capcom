import { MonoData } from "@/components/ui/mono-data";
import { Panel } from "@/components/ui/panel";
import { StatusIndicator } from "@/components/ui/status-indicator";
import type { OverviewSignalBucket } from "@/entities/event";

import { formatDelta, type SignalMeasure } from "../model/kpis";

import { SignalChart } from "./SignalChart";

/**
 * A single Overview `.panel.mini` cell (ADR 0099, the reference's b-stack) — presentational,
 * owns no fetching. A denser card than the hero: a `Panel` surface, an eyebrow, the metric in
 * `MonoData` (a compact numeric face — NOT the metric-hero role), a period-over-period delta
 * as a `StatusIndicator` (nominal for a favorable ↑, caution for an unfavorable ↓ — every
 * Overview KPI is "higher is better") whose signed percent renders in `MonoData`, and a
 * decorative {@link SignalChart} sparkline of the matching signal measure. States: loading,
 * error, and empty (the value is an em dash). Mission-control tokens only (ADR 0058); no
 * external margin. Copy is passed in (localized by the widget, ADR 0030).
 */
export type KpiCardProps = {
  /** Localized KPI label. */
  label: string;
  /** Pre-formatted value string (locale-aware; an em dash for a guarded null). */
  value: string;
  /** Period-over-period delta ratio; null → no delta chip. */
  deltaRatio: number | null;
  /** Localized accessible suffix for the delta (e.g. "vs the previous period"). */
  deltaCaption?: string;
  locale?: string;
  /** Already-reduced signal rows for the sparkline (passed by the widget; not fetched here). */
  signalData?: OverviewSignalBucket[];
  /** Which signal measure this mini's sparkline plots (column or derived ratio). */
  signalMeasure: SignalMeasure;
  /** The sparkline's line/area color — a var(--color-viz-*) token. */
  signalColor?: string;
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
  signalData = [],
  signalMeasure,
  signalColor,
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load this metric.",
}: KpiCardProps) {
  const state = isError ? "error" : isLoading ? "loading" : "data";

  return (
    <Panel surface="panel" className="flex flex-col gap-2" data-state={state}>
      <span className="text-label text-text-secondary">{label}</span>

      {state === "error" ? (
        <p role="alert" className="text-status-critical-fg text-sm">
          {errorLabel}
        </p>
      ) : state === "loading" ? (
        <p role="status" className="text-text-secondary text-sm">
          {loadingLabel}
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-2">
            <MonoData className="text-2xl font-semibold">{value}</MonoData>
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
          </div>
          <SignalChart
            data={signalData}
            measure={signalMeasure}
            color={signalColor}
          />
        </>
      )}
    </Panel>
  );
}

import { Panel } from "@/components/ui/panel";
import type { FunnelStep } from "@/entities/event";

/**
 * The Overview activation-funnel cell (ADR 0086/0099, the reference's b-funnel) —
 * presentational, owns no fetching. A `Panel` + eyebrow + the overall conversion % + the
 * three labelled steps, each a proportional bar with a gradient fill between two
 * `var(--color-viz-*)` tokens (the bar width is a computed style — a data-driven layout value,
 * the GroupRollup precedent — not a raw literal, ADR 0058), plus a step-over-step footnote.
 * Conversion **percentages** are a ratio of two already-reduced counts = presentation
 * (ADR 0087), not event reduction. States: loading, error, empty. Mission-control tokens only.
 */
export type FunnelPreviewProps = {
  /** Reduced rows from fn_funnel (step_index, step_event, users), ordered by step. */
  data: FunnelStep[];
  /** Localized eyebrow (e.g. "Activation funnel"). */
  label: string;
  /** Localized display name per step_event; falls back to the raw event name. */
  stepLabels?: Record<string, string>;
  /** Localized caption for the overall conversion (e.g. "overall"). */
  overallLabel?: string;
  /** Localized caption for the step-over-step conversion (e.g. "from previous step"). */
  fromPrevLabel?: string;
  /** Active app locale for number formatting (ADR 0030). */
  locale?: string;
  isLoading?: boolean;
  isError?: boolean;
  loadingLabel?: string;
  errorLabel?: string;
  emptyLabel?: string;
};

const pct = (ratio: number) => `${Math.round(ratio * 100)}%`;

function Message({ tone, text }: { tone: "muted" | "error"; text: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-state={tone === "error" ? "error" : "empty"}
      className={`flex h-24 w-full items-center justify-center rounded-md border border-dashed border-border-hairline text-sm ${
        tone === "error" ? "text-status-critical-fg" : "text-text-secondary"
      }`}
    >
      {text}
    </div>
  );
}

export function FunnelPreview({
  data,
  label,
  stepLabels = {},
  overallLabel = "overall",
  fromPrevLabel = "from previous step",
  locale = "en-US",
  isLoading = false,
  isError = false,
  loadingLabel = "Loading…",
  errorLabel = "Couldn’t load the funnel.",
  emptyLabel = "No data for these steps.",
}: FunnelPreviewProps) {
  const empty = data.length === 0 || Number(data[0]?.users ?? 0) === 0;
  const nf = new Intl.NumberFormat(locale);
  const entry = Math.max(1, Number(data[0]?.users ?? 0));
  const last = data[data.length - 1];
  const overall = last ? Number(last.users) / entry : 0;

  return (
    <Panel surface="panel" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-label text-text-secondary">{label}</span>
        {!isError && !isLoading && !empty && (
          <span className="text-caption text-text-secondary">
            <span className="text-text-primary font-mono text-sm tabular-nums">
              {pct(overall)}
            </span>{" "}
            {overallLabel}
          </span>
        )}
      </div>

      {isError ? (
        <Message tone="error" text={errorLabel} />
      ) : isLoading ? (
        <Message tone="muted" text={loadingLabel} />
      ) : empty ? (
        <Message tone="muted" text={emptyLabel} />
      ) : (
        <ol className="flex flex-col gap-2.5" data-state="data">
          {data.map((step, i) => {
            const users = Number(step.users);
            const share = users / entry;
            const prev = i > 0 ? Number(data[i - 1]!.users) : undefined;
            const fromPrev =
              prev === undefined ? undefined : prev > 0 ? users / prev : 0;
            return (
              <li key={step.step_event} className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2 text-caption">
                  <span className="text-text-primary">
                    {stepLabels[step.step_event] ?? step.step_event}
                  </span>
                  <span className="text-text-secondary font-mono tabular-nums">
                    {nf.format(users)} · {pct(share)}
                  </span>
                </div>
                <div className="bg-surface-elevated h-2.5 w-full overflow-hidden rounded-full">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(0, share) * 100}%`,
                      background:
                        "linear-gradient(90deg, var(--color-viz-categorical-1), var(--color-viz-categorical-3))",
                    }}
                  />
                </div>
                {fromPrev !== undefined && (
                  <span className="text-caption text-text-secondary">
                    {pct(fromPrev)} {fromPrevLabel}
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </Panel>
  );
}

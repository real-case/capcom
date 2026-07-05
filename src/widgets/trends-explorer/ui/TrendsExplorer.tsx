"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { ChartBrush } from "@/components/charts";

import { useEventTrends, useTopEvents } from "../api/use-trends";
import {
  BREAKDOWN_KEYS,
  DEFAULT_TRENDS_QUERY,
  INTERVALS,
  RANGES,
  resolveWindow,
  toTopEventsArgs,
  toTrendsArgs,
  trendsParsers,
  trendsQuerySchema,
} from "../model/url-state";

import { TopEventsBar } from "./TopEventsBar";
import { TrendsChart } from "./TrendsChart";

/**
 * The trends explorer (PR-4) — the widget that wires URL state to the in-database
 * aggregations and the presentational chart segments. Controls are bound to the query
 * string via nuqs (ADR 0027), so a report is a shareable, bookmarkable link; the two
 * hooks call the `SECURITY INVOKER` RPCs under the signed-in member's RLS (ADR
 * 0084/0013) and TanStack Query caches/polls the result (ADR 0025). Loading / error /
 * empty are threaded down to the widgets as props — the widgets stay presentational
 * (ADR 0086) and never fetch.
 */
export function TrendsExplorer({ projectId }: { projectId: string }) {
  const t = useTranslations("Trends");
  const locale = useLocale();
  const [raw, setQuery] = useQueryStates(trendsParsers);

  // The Zod schema is the validation authority (ADR 0017): run the nuqs-parsed values
  // through it before deriving RPC args. nuqs already constrains the enum params; this
  // also bounds the free-text `event`, falling back to the defaults on a malformed URL.
  const query = trendsQuerySchema.catch(DEFAULT_TRENDS_QUERY).parse(raw);

  // resolveWindow floors `to` to the UTC day, so these args are stable within a day
  // and the TanStack query keys don't thrash across re-renders.
  const now = new Date();
  const trends = useEventTrends(toTrendsArgs(query, projectId, now));
  const top = useTopEvents(toTopEventsArgs(query, projectId, now));

  // The brush track spans the full preset range; the selection is the explicit window,
  // if any. Selecting or clearing it writes nuqs URL-state (ADR 0027/0093) — the feature
  // does the round-trip, the widget never fetches (ADR 0086). Changing the preset range
  // also clears a stale sub-window.
  const brushDomain = resolveWindow(query.range, now);
  const brushValue =
    query.from && query.to ? { from: query.from, to: query.to } : null;

  // The event picker lists what the project actually emits (from fn_top_events),
  // always including the current selection so it stays selectable before data loads.
  const eventOptions = Array.from(
    new Set([query.event, ...(top.data ?? []).map((e) => e.event_name)]),
  );

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-wrap items-end gap-3">
        <legend className="sr-only">{t("controlsLegend")}</legend>

        <Field label={t("eventLabel")}>
          <select
            className={selectClass}
            value={query.event}
            onChange={(e) => void setQuery({ event: e.target.value })}
          >
            {eventOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("rangeLabel")}>
          <select
            className={selectClass}
            value={query.range}
            onChange={(e) => {
              const range = pick(RANGES, e.target.value);
              if (range) void setQuery({ range, from: null, to: null });
            }}
          >
            {RANGES.map((r) => (
              <option key={r} value={r}>
                {t(`range_${r}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("intervalLabel")}>
          <select
            className={selectClass}
            value={query.interval}
            onChange={(e) => {
              const interval = pick(INTERVALS, e.target.value);
              if (interval) void setQuery({ interval });
            }}
          >
            {INTERVALS.map((i) => (
              <option key={i} value={i}>
                {t(`interval_${i}`)}
              </option>
            ))}
          </select>
        </Field>

        <Field label={t("breakdownLabel")}>
          <select
            className={selectClass}
            value={query.breakdown}
            onChange={(e) => {
              const breakdown = pick(BREAKDOWN_KEYS, e.target.value);
              if (breakdown) void setQuery({ breakdown });
            }}
          >
            {BREAKDOWN_KEYS.map((b) => (
              <option key={b} value={b}>
                {t(`breakdown_${b}`)}
              </option>
            ))}
          </select>
        </Field>
      </fieldset>

      <section
        aria-label={t("trendSectionLabel", { event: query.event })}
        className="rounded-lg border border-border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("trendSectionLabel", { event: query.event })}
        </h2>
        <TrendsChart
          data={trends.data ?? []}
          isLoading={trends.isPending}
          isError={trends.isError}
          label={t("trendChartLabel", { event: query.event })}
          locale={locale}
          loadingLabel={t("trendLoading")}
          errorLabel={t("trendError")}
          emptyLabel={t("noEvents")}
        />

        <div className="mt-4 flex flex-col gap-1">
          <div className="flex items-center justify-between">
            <span className="text-caption text-muted-foreground">
              {t("brushHeading")}
            </span>
            {brushValue ? (
              <button
                type="button"
                onClick={() => void setQuery({ from: null, to: null })}
                className="rounded-sm text-caption text-muted-foreground underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                {t("brushReset")}
              </button>
            ) : null}
          </div>
          <ChartBrush
            key={`${query.range}-${query.from ?? ""}-${query.to ?? ""}`}
            domain={brushDomain}
            value={brushValue}
            label={t("brushLabel")}
            onChange={(next) =>
              void setQuery(
                next
                  ? { from: next.from, to: next.to }
                  : { from: null, to: null },
              )
            }
          />
        </div>
      </section>

      <section
        aria-label={t("topEventsLabel")}
        className="rounded-lg border border-border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("topEventsLabel")}
        </h2>
        <TopEventsBar
          data={top.data ?? []}
          isLoading={top.isPending}
          isError={top.isError}
          label={t("topEventsLabel")}
          loadingLabel={t("topLoading")}
          errorLabel={t("topError")}
          emptyLabel={t("noEvents")}
        />
      </section>
    </div>
  );
}

const selectClass =
  "rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";

/**
 * Narrow a raw `<select>` value to one of an allowed const tuple — runtime check, no
 * `as` cast: `find` returns the tuple's element type or undefined, so the URL state
 * stays in lockstep with the parser enums (the value can only be one of the options).
 */
function pick<const T extends readonly string[]>(
  allowed: T,
  value: string,
): T[number] | undefined {
  return allowed.find((option) => option === value);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}

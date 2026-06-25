"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { useEventTrends, useTopEvents } from "../api/use-trends";
import {
  BREAKDOWN_KEYS,
  INTERVALS,
  RANGES,
  toTopEventsArgs,
  toTrendsArgs,
  trendsParsers,
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
  const [query, setQuery] = useQueryStates(trendsParsers);

  // resolveWindow floors `to` to the UTC day, so these args are stable within a day
  // and the TanStack query keys don't thrash across re-renders.
  const now = new Date();
  const trends = useEventTrends(toTrendsArgs(query, projectId, now));
  const top = useTopEvents(toTopEventsArgs(query, projectId, now));

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
            onChange={(e) =>
              void setQuery({
                range: e.target.value as (typeof RANGES)[number],
              })
            }
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
            onChange={(e) =>
              void setQuery({
                interval: e.target.value as (typeof INTERVALS)[number],
              })
            }
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
            onChange={(e) =>
              void setQuery({
                breakdown: e.target.value as (typeof BREAKDOWN_KEYS)[number],
              })
            }
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
        />
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
        />
      </section>
    </div>
  );
}

const selectClass =
  "rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";

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

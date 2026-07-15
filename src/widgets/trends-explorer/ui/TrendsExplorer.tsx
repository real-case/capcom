"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { ChartBrush } from "@/components/charts";
import { Panel } from "@/components/ui/panel";
import { ComboField } from "@/shared/ui";

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
  const tc = useTranslations("Controls");
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

        <ComboField
          label={t("eventLabel")}
          value={query.event}
          options={eventOptions.map((name) => ({ value: name, label: name }))}
          onValueChange={(event) => {
            if (event) void setQuery({ event });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
          className="w-52"
        />

        <ComboField
          label={t("rangeLabel")}
          value={query.range}
          options={RANGES.map((r) => ({ value: r, label: t(`range_${r}`) }))}
          onValueChange={(value) => {
            const range = pick(RANGES, value);
            // A new preset also clears a stale brush sub-window (ADR 0093).
            if (range) void setQuery({ range, from: null, to: null });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />

        <ComboField
          label={t("intervalLabel")}
          value={query.interval}
          options={INTERVALS.map((i) => ({
            value: i,
            label: t(`interval_${i}`),
          }))}
          onValueChange={(value) => {
            const interval = pick(INTERVALS, value);
            if (interval) void setQuery({ interval });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />

        <ComboField
          label={t("breakdownLabel")}
          value={query.breakdown}
          options={BREAKDOWN_KEYS.map((b) => ({
            value: b,
            label: t(`breakdown_${b}`),
          }))}
          onValueChange={(value) => {
            const breakdown = pick(BREAKDOWN_KEYS, value);
            if (breakdown) void setQuery({ breakdown });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />
      </fieldset>

      <Panel
        role="region"
        aria-label={t("trendSectionLabel", { event: query.event })}
      >
        <h2 className="mb-3 text-sm font-medium text-text-primary">
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
            <span className="text-caption text-text-secondary">
              {t("brushHeading")}
            </span>
            {brushValue ? (
              <button
                type="button"
                onClick={() => void setQuery({ from: null, to: null })}
                className="rounded-sm text-caption text-text-secondary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:outline-none"
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
      </Panel>

      <Panel role="region" aria-label={t("topEventsLabel")}>
        <h2 className="mb-3 text-sm font-medium text-text-primary">
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
      </Panel>
    </div>
  );
}

/**
 * Narrow a raw combobox value to one of an allowed const tuple — runtime check, no
 * `as` cast: `find` returns the tuple's element type or undefined, so the URL state
 * stays in lockstep with the parser enums (the value can only be one of the options).
 */
function pick<const T extends readonly string[]>(
  allowed: T,
  value: string,
): T[number] | undefined {
  return allowed.find((option) => option === value);
}

// The labelled Combobox lives in `@/shared/ui` (`ComboField`), shared across the analytics
// widgets — imported above.

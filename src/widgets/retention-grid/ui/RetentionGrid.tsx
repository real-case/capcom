"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { ComboField } from "@/shared/ui";

import { useRetention } from "../api/use-retention";
import {
  DEFAULT_RETENTION_QUERY,
  PERIODS,
  RANGES,
  retentionParsers,
  retentionQuerySchema,
  toRetentionArgs,
  type Period,
  type Range,
} from "../model/url-state";

import { CohortGrid } from "./CohortGrid";

/**
 * The retention cohort grid (PR-6) — the widget that wires URL state to the in-database
 * `fn_retention` aggregation and the presentational heatmap segment. The analysis range
 * and the cohort/period granularity are bound to the query string via nuqs (ADR 0027),
 * so a cohort grid is a shareable, bookmarkable link; the hook calls the `SECURITY
 * INVOKER` RPC under the signed-in member's RLS (ADR 0084/0013) and TanStack Query
 * caches/polls the result (ADR 0025). Loading / error / empty are threaded down to the
 * grid as props — the grid stays presentational (ADR 0086) and never fetches.
 */
export function RetentionGrid({ projectId }: { projectId: string }) {
  const t = useTranslations("Retention");
  const tc = useTranslations("Controls");
  const locale = useLocale();
  const [raw, setQuery] = useQueryStates(retentionParsers);

  // The Zod schema is the validation authority (ADR 0017): run the nuqs-parsed values
  // through it, falling back to the defaults on a malformed URL.
  const query = retentionQuerySchema.catch(DEFAULT_RETENTION_QUERY).parse(raw);

  // resolveWindow floors `to` to the UTC day, so these args are stable within a day and
  // the TanStack query key doesn't thrash across re-renders.
  const now = new Date();
  const retention = useRetention(toRetentionArgs(query, projectId, now));

  return (
    <div className="flex flex-col gap-6">
      <fieldset className="flex flex-wrap items-end gap-3">
        <legend className="sr-only">{t("controlsLegend")}</legend>

        <ComboField
          label={t("rangeLabel")}
          value={query.range}
          options={RANGES.map((r) => ({
            value: r,
            label: t(`range_${r}` as RangeKey),
          }))}
          onValueChange={(value) => {
            const range = pick(RANGES, value);
            if (range) void setQuery({ range });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />

        <ComboField
          label={t("periodLabel")}
          value={query.period}
          options={PERIODS.map((p) => ({
            value: p,
            label: t(`period_${p}` as PeriodKey),
          }))}
          onValueChange={(value) => {
            const period = pick(PERIODS, value);
            if (period) void setQuery({ period });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />
      </fieldset>

      <section
        aria-label={t("gridSectionLabel")}
        className="overflow-x-auto rounded-lg border border-border bg-card p-4"
      >
        <h2 className="mb-3 text-sm font-medium text-foreground">
          {t("gridSectionLabel")}
        </h2>
        <CohortGrid
          data={retention.data ?? []}
          period={query.period}
          locale={locale}
          isLoading={retention.isPending}
          isError={retention.isError}
          label={t("gridChartLabel")}
          loadingLabel={t("loading")}
          errorLabel={t("error")}
          emptyLabel={t("noData")}
          lowLabel={t("legendLow")}
          highLabel={t("legendHigh")}
        />
      </section>
    </div>
  );
}

// Translation-key helpers: keep the dynamic `t(...)` calls inside the typed namespace.
type RangeKey = `range_${Range}`;
type PeriodKey = `period_${Period}`;

/**
 * Narrow a raw combobox value to one of an allowed const tuple — runtime check, no
 * `as` cast: `find` returns the tuple's element type or undefined, so the URL state
 * stays in lockstep with the parser enums.
 */
function pick<const T extends readonly string[]>(
  allowed: T,
  value: string,
): T[number] | undefined {
  return allowed.find((option) => option === value);
}

// The labelled Combobox lives in `@/shared/ui` (`ComboField`), shared across the analytics
// widgets — imported above.

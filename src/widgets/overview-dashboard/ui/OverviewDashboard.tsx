"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import { Panel } from "@/components/ui/panel";
import type { OverviewKpis } from "@/entities/event";
import { ComboField } from "@/shared/ui";

import { useOverviewKpis, useOverviewSignal } from "../api/use-overview";
import { deriveKpis, formatKpiValue, KPI_DESCRIPTORS } from "../model/kpis";
import {
  overviewParsers,
  overviewRangeSchema,
  RANGES,
  toKpisArgs,
  toSignalArgs,
  type OverviewRange,
} from "../model/window";

import { KpiCard } from "./KpiCard";
import { PacingCard } from "./PacingCard";
import { SignalChart, type SignalMeasure } from "./SignalChart";

/**
 * The curated Overview home (ADR 0099) — the console's first-class instrument-panel home,
 * distinct from the user-composed dashboards of ADR 0090. A `"use client"` fetching
 * container: it reads the nuqs `range` (Zod-validated, ADR 0017/0027), builds the two RPC
 * argument bags, calls the `SECURITY INVOKER` aggregations through TanStack Query
 * (ADR 0084/0025), and derives the KPI ratios/deltas/pacing as PRESENTATION over the
 * already-reduced scalars (ADR 0087/0088). It lays out a bento of PRESENTATIONAL children
 * (KpiCard ×4 + PacingCard + SignalCharts) that receive reduced rows as props and never
 * fetch (ADR 0086). Mission-control tokens only; all copy via next-intl (ADR 0030).
 */

const ZEROS: OverviewKpis = {
  active_users: 0,
  active_users_prev: 0,
  new_signups: 0,
  new_signups_prev: 0,
  purchasers: 0,
  purchasers_prev: 0,
  value_sum: 0,
  value_sum_prev: 0,
};

const SIGNALS: { measure: SignalMeasure; color: string }[] = [
  { measure: "active_users", color: "var(--color-viz-categorical-1)" },
  { measure: "new_signups", color: "var(--color-viz-categorical-2)" },
  { measure: "value_sum", color: "var(--color-viz-categorical-3)" },
];

export function OverviewDashboard({ projectId }: { projectId: string }) {
  const t = useTranslations("Overview");
  const tc = useTranslations("Controls");
  const locale = useLocale();
  const [{ range }, setQuery] = useQueryStates(overviewParsers);

  // The Zod schema is the validation authority (ADR 0017): a malformed URL value falls back
  // to the default range rather than breaking the view.
  const activeRange = overviewRangeSchema.parse(range);

  // resolveWindow floors `to` to the UTC day, so the args (and the TanStack keys) are stable
  // within a day and do not thrash across re-renders from the live clock.
  const now = new Date();
  const kpis = useOverviewKpis(toKpisArgs(activeRange, projectId, now));
  const signal = useOverviewSignal(toSignalArgs(activeRange, projectId, now));

  const derived = deriveKpis(kpis.data ?? ZEROS);
  const deltaCaption = t("deltaCaption");

  return (
    <section aria-label={t("title")} className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-text-primary text-lg font-semibold tracking-tight">
            {t("title")}
          </h2>
          <p className="text-text-secondary text-sm">{t("lead")}</p>
        </div>
        <ComboField
          label={t("rangeLabel")}
          value={activeRange}
          options={RANGES.map((r) => ({ value: r, label: t(`range.${r}`) }))}
          onValueChange={(value) => {
            const next = RANGES.find((r) => r === value) as
              | OverviewRange
              | undefined;
            if (next) void setQuery({ range: next });
          }}
          searchPlaceholder={tc("search")}
          emptyText={tc("noResults")}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {KPI_DESCRIPTORS.map((d) => (
          <KpiCard
            key={d.id}
            label={t(`kpi.${d.labelKey}`)}
            value={formatKpiValue(derived[d.id].value, d.format, locale)}
            deltaRatio={derived[d.id].deltaRatio}
            deltaCaption={deltaCaption}
            locale={locale}
            isLoading={kpis.isPending}
            isError={kpis.isError}
            loadingLabel={t("state.loading")}
            errorLabel={t("state.error")}
          />
        ))}
        <PacingCard
          label={t("kpi.pacing")}
          pacingRatio={derived.pacing.ratio}
          caption={t("pacingCaption")}
          locale={locale}
          isLoading={kpis.isPending}
          isError={kpis.isError}
          loadingLabel={t("state.loading")}
          errorLabel={t("state.error")}
        />
      </div>

      <div className="flex flex-col gap-3">
        <h3 className="text-text-secondary text-sm font-medium">
          {t("signalHeading")}
        </h3>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SIGNALS.map((s) => (
            <Panel
              key={s.measure}
              surface="panel"
              className="flex flex-col gap-2"
            >
              <span className="text-label text-text-secondary">
                {t(`signal.${s.measure}`)}
              </span>
              <SignalChart
                data={signal.data ?? []}
                measure={s.measure}
                color={s.color}
                label={t(`signal.${s.measure}`)}
                isLoading={signal.isPending}
                isError={signal.isError}
                loadingLabel={t("state.loading")}
                errorLabel={t("state.error")}
                emptyLabel={t("state.empty")}
              />
            </Panel>
          ))}
        </div>
      </div>
    </section>
  );
}

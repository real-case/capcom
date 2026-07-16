"use client";

import { useLocale, useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";

import type { OverviewKpis } from "@/entities/event";
import { ComboField } from "@/shared/ui";

import {
  useActivationFunnel,
  useOverviewBars,
  useOverviewHero,
  useOverviewKpis,
  useOverviewSignal,
  useSegmentScatter,
} from "../api/use-overview";
import {
  deriveGoalRows,
  deriveKpis,
  formatDelta,
  formatKpiValue,
  GOAL_ROWS,
  HERO_KPI,
  STACK_KPIS,
} from "../model/kpis";
import {
  ACTIVATION_STEPS,
  overviewParsers,
  overviewRangeSchema,
  RANGES,
  toBarsArgs,
  toFunnelArgs,
  toHeroArgs,
  toKpisArgs,
  toScatterArgs,
  toSignalArgs,
  type OverviewRange,
} from "../model/window";

import { BentoGrid } from "./BentoGrid";
import { FunnelPreview } from "./FunnelPreview";
import { HeroChart } from "./HeroChart";
import { KpiCard } from "./KpiCard";
import { PacingCard } from "./PacingCard";
import { SegmentScatter } from "./SegmentScatter";
import { StackedBars } from "./StackedBars";

/**
 * The curated Overview home (ADR 0099) — the console's first-class instrument-panel home,
 * distinct from the user-composed dashboards of ADR 0090. A `"use client"` fetching container:
 * it reads the nuqs `range` (Zod-validated, ADR 0017/0027), builds every RPC argument bag from
 * that ONE range, calls the `SECURITY INVOKER` aggregations through TanStack Query
 * (ADR 0084/0025), and lays out the frozen reference's six-cell BENTO of PRESENTATIONAL
 * children (hero + three mini KpiCards + goal + stacked bars + funnel + scatter) that receive
 * already-reduced rows as props and never fetch (ADR 0086). KPI ratios/deltas/pacing are
 * PRESENTATION over already-reduced scalars (ADR 0087/0088). Mission-control tokens only; all
 * copy via next-intl (ADR 0030).
 */

const KPI_ZEROS: OverviewKpis = {
  active_users: 0,
  active_users_prev: 0,
  new_signups: 0,
  new_signups_prev: 0,
  purchasers: 0,
  purchasers_prev: 0,
  value_sum: 0,
  value_sum_prev: 0,
};

export function OverviewDashboard({ projectId }: { projectId: string }) {
  const t = useTranslations("Overview");
  const tc = useTranslations("Controls");
  const locale = useLocale();
  const [{ range }, setQuery] = useQueryStates(overviewParsers);

  const activeRange = overviewRangeSchema.parse(range);

  // resolveWindow floors `to` to the UTC day, so the args (and the TanStack keys) are stable
  // within a day and do not thrash across re-renders from the live clock.
  const now = new Date();
  const kpis = useOverviewKpis(toKpisArgs(activeRange, projectId, now));
  const signal = useOverviewSignal(toSignalArgs(activeRange, projectId, now));
  const hero = useOverviewHero(toHeroArgs(activeRange, projectId, now));
  const bars = useOverviewBars(toBarsArgs(activeRange, projectId, now));
  const funnel = useActivationFunnel(toFunnelArgs(activeRange, projectId, now));
  const scatter = useSegmentScatter(toScatterArgs(activeRange, projectId, now));

  const derived = deriveKpis(kpis.data ?? KPI_ZEROS);
  const goalRows = deriveGoalRows(kpis.data ?? KPI_ZEROS);
  const deltaCaption = t("deltaCaption");
  const signalRows = signal.data ?? [];

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

      <BentoGrid
        hero={
          <HeroChart
            data={hero.data ?? []}
            label={t(`kpi.${HERO_KPI.labelKey}`)}
            value={formatKpiValue(
              derived[HERO_KPI.id].value,
              HERO_KPI.format,
              locale,
            )}
            delta={
              derived[HERO_KPI.id].deltaRatio === null
                ? null
                : formatDelta(derived[HERO_KPI.id].deltaRatio, locale)
            }
            deltaUp={(derived[HERO_KPI.id].deltaRatio ?? 0) >= 0}
            chartLabel={t("hero.chartLabel")}
            isLoading={hero.isPending}
            isError={hero.isError}
            loadingLabel={t("state.loading")}
            errorLabel={t("state.error")}
            emptyLabel={t("state.empty")}
          />
        }
        stack={
          <div className="flex h-full flex-col gap-4">
            {STACK_KPIS.map((d) => (
              <KpiCard
                key={d.id}
                label={t(`kpi.${d.labelKey}`)}
                value={formatKpiValue(derived[d.id].value, d.format, locale)}
                deltaRatio={derived[d.id].deltaRatio}
                deltaCaption={deltaCaption}
                locale={locale}
                signalData={signalRows}
                signalMeasure={d.signalMeasure}
                signalColor={d.color}
                isLoading={kpis.isPending || signal.isPending}
                isError={kpis.isError}
                loadingLabel={t("state.loading")}
                errorLabel={t("state.error")}
              />
            ))}
          </div>
        }
        goal={
          <PacingCard
            label={t("kpi.pacing")}
            caption={t("goal.caption")}
            pacingRatio={derived.pacing.ratio}
            rows={GOAL_ROWS.map((r) => ({
              label: t(`goal.rows.${r.id}`),
              value: formatKpiValue(goalRows[r.id], r.format, locale),
            }))}
            locale={locale}
            isLoading={kpis.isPending}
            isError={kpis.isError}
            loadingLabel={t("state.loading")}
            errorLabel={t("state.error")}
          />
        }
        bars={
          <StackedBars
            data={bars.data ?? []}
            label={t("bars.label")}
            chartLabel={t("bars.chartLabel")}
            isLoading={bars.isPending}
            isError={bars.isError}
            loadingLabel={t("state.loading")}
            errorLabel={t("state.error")}
            emptyLabel={t("state.empty")}
          />
        }
        funnel={
          <FunnelPreview
            data={funnel.data ?? []}
            label={t("funnel.label")}
            stepLabels={{
              [ACTIVATION_STEPS[0]]: t("funnel.steps.visited"),
              [ACTIVATION_STEPS[1]]: t("funnel.steps.signedUp"),
              [ACTIVATION_STEPS[2]]: t("funnel.steps.activated"),
            }}
            overallLabel={t("funnel.overall")}
            fromPrevLabel={t("funnel.fromPrev")}
            locale={locale}
            isLoading={funnel.isPending}
            isError={funnel.isError}
            loadingLabel={t("state.loading")}
            errorLabel={t("state.error")}
            emptyLabel={t("state.empty")}
          />
        }
        seg={
          <SegmentScatter
            data={scatter.data ?? []}
            label={t("seg.label")}
            chartLabel={t("seg.chartLabel")}
            xLabel={t("seg.x")}
            yLabel={t("seg.y")}
            isLoading={scatter.isPending}
            isError={scatter.isError}
            loadingLabel={t("state.loading")}
            errorLabel={t("state.error")}
            emptyLabel={t("state.empty")}
          />
        }
      />
    </section>
  );
}

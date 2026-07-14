import type { OverviewKpis } from "@/entities/event";

/**
 * The KPI presentation layer for the Overview home (ADR 0099). This is PRESENTATION, not
 * aggregation: `deriveKpis` only divides scalars that `fn_overview_kpis` already reduced in
 * the database — a ratio of two already-reduced counts is display formatting, not event
 * reduction (ADR 0087/0088), so it does not violate the ADR 0084 "no reduction in
 * application code" rule. Every KPI here is "higher is better", so a positive delta is a
 * favorable (nominal) change and a negative one is unfavorable — the cards read tone from
 * the delta sign.
 */

export type KpiFormat = "count" | "percent" | "currency";
export type KpiId = "activeUsers" | "newSignups" | "conversion" | "arpu";

export type KpiDescriptor = {
  id: KpiId;
  /** i18n key under the `Overview.kpi` namespace. */
  labelKey: KpiId;
  format: KpiFormat;
};

/** The four scalar KPI cards, in display order. Goal pacing is the separate PacingCard. */
export const KPI_DESCRIPTORS: readonly KpiDescriptor[] = [
  { id: "activeUsers", labelKey: "activeUsers", format: "count" },
  { id: "newSignups", labelKey: "newSignups", format: "count" },
  { id: "conversion", labelKey: "conversion", format: "percent" },
  { id: "arpu", labelKey: "arpu", format: "currency" },
] as const;

export type DerivedKpi = { value: number | null; deltaRatio: number | null };
export type DerivedKpis = Record<KpiId, DerivedKpi> & {
  pacing: { ratio: number | null };
};

/** n / d, or null when the denominator is zero (guards NaN / Infinity). */
function safeDiv(n: number, d: number): number | null {
  return d === 0 ? null : n / d;
}

/** (cur − prev) / prev, or null when either side is undefined or prev is zero. */
function delta(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || prev === 0) return null;
  return (cur - prev) / prev;
}

/**
 * Derive the five Overview KPIs from one already-reduced `fn_overview_kpis` row. Counts pass
 * through with a period-over-period delta; conversion (purchasers / active users) and ARPU
 * (revenue / active users) are ratios whose delta is the ratio-of-ratios against the `_prev`
 * scalars; pacing compares current revenue to the previous equal-span revenue. Every
 * division guards a zero denominator → null, which the cards render as an em dash (no delta).
 */
export function deriveKpis(data: OverviewKpis): DerivedKpis {
  const conversion = safeDiv(data.purchasers, data.active_users);
  const conversionPrev = safeDiv(data.purchasers_prev, data.active_users_prev);
  const arpu = safeDiv(data.value_sum, data.active_users);
  const arpuPrev = safeDiv(data.value_sum_prev, data.active_users_prev);
  return {
    activeUsers: {
      value: data.active_users,
      deltaRatio: delta(data.active_users, data.active_users_prev),
    },
    newSignups: {
      value: data.new_signups,
      deltaRatio: delta(data.new_signups, data.new_signups_prev),
    },
    conversion: {
      value: conversion,
      deltaRatio: delta(conversion, conversionPrev),
    },
    arpu: { value: arpu, deltaRatio: delta(arpu, arpuPrev) },
    pacing: { ratio: safeDiv(data.value_sum, data.value_sum_prev) },
  };
}

const EM_DASH = "—";

/**
 * Format a derived KPI value for display (presentation, locale-aware, ADR 0030): counts as
 * integers, conversion as a percent, ARPU as USD currency (the demo's amount unit). A null
 * value (a guarded zero denominator) renders as an em dash.
 */
export function formatKpiValue(
  value: number | null,
  format: KpiFormat,
  locale: string,
): string {
  if (value === null) return EM_DASH;
  switch (format) {
    case "count":
      return new Intl.NumberFormat(locale).format(value);
    case "percent":
      return new Intl.NumberFormat(locale, {
        style: "percent",
        maximumFractionDigits: 1,
      }).format(value);
    case "currency":
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "USD",
        maximumFractionDigits: 0,
      }).format(value);
  }
}

/** Format a signed delta ratio as a percent (e.g. +12%); null → em dash. */
export function formatDelta(deltaRatio: number | null, locale: string): string {
  if (deltaRatio === null) return EM_DASH;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(deltaRatio);
}

/** Format the goal-pacing ratio as a percent of the previous equal span; null → em dash. */
export function formatPacing(ratio: number | null, locale: string): string {
  if (ratio === null) return EM_DASH;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
  }).format(ratio);
}

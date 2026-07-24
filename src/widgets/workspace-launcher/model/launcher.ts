import type { OverviewKpis, OverviewSignalBucket } from "@/entities/event";

/**
 * Presentation model for the workspace launcher (ADR 0101 Phase 3). Every function here is
 * PRESENTATION over already-reduced rows — the headline metric passes through a scalar
 * `fn_overview_kpis` already reduced, the delta divides two of its scalars, and
 * `lastActiveDaysAgo` reads dates off the already-reduced `fn_overview_signal` buckets. A
 * ratio or a day-difference over already-reduced values is display formatting, not event
 * reduction (ADR 0087/0088), so none of this violates the ADR 0084 "no aggregation in
 * application code" rule. No fetching lives here.
 */

const DAY_MS = 86_400_000;

/**
 * A project's view-model as the launcher renders it — a DISCRIMINATED UNION, not nullable
 * fields, so exactly one shape means "loaded" and one means "unavailable" and no illegal
 * in-between can be constructed. `status: "error"` is used whenever EITHER RPC of the
 * per-project pair rejected: a resolved kpis row beside a rejected signal must NOT render,
 * because the route would otherwise pre-localize `activityLabel` from an empty series and the
 * card would assert "no activity" about a project whose activity is merely unknown.
 */
export type LauncherProject = { id: string; name: string } & (
  | {
      status: "ok";
      /** One already-reduced fn_overview_kpis row (ADR 0084). */
      kpis: OverviewKpis;
      /** Already-reduced fn_overview_signal buckets for the sparkline (ADR 0084). */
      signal: OverviewSignalBucket[];
      /** Pre-localized activity line the route built from {@link lastActiveDaysAgo}. */
      activityLabel: string;
    }
  | { status: "error" }
);

/** An organization section: the member's role label plus the org's reachable projects. */
export type LauncherOrg = {
  id: string;
  name: string;
  /** Localized role label for the member in this organization; null when unknown. */
  roleLabel: string | null;
  projects: LauncherProject[];
};

/** All localized copy the presentational launcher needs (the route supplies it, ADR 0030). */
export type LauncherCopy = {
  title: string;
  lead: string;
  metricLabel: string;
  windowLabel: string;
  deltaCaption: string;
  noProjects: string;
  cardError: string;
  empty: { title: string; body: string };
};

/** The headline metric + its period-over-period delta, both already-reduced scalars. */
export type LauncherMetric = {
  /** Distinct active users in the current window (the fn_overview_kpis scalar). */
  value: number;
  /** (current − previous) / previous, or null when the previous window is zero. */
  deltaRatio: number | null;
};

/**
 * Derive the launcher's headline metric from one already-reduced kpis row: distinct active
 * users, with a period-over-period delta against the equal-length previous window
 * (`_prev`). The delta guards a zero previous window to null (never NaN/Infinity) — a young
 * project with no prior activity shows a value and no delta chip, not "Infinity%".
 */
export function deriveLauncherMetric(kpis: OverviewKpis): LauncherMetric {
  const prev = kpis.active_users_prev;
  return {
    value: kpis.active_users,
    deltaRatio: prev === 0 ? null : (kpis.active_users - prev) / prev,
  };
}

/** Floor a date to its UTC midnight (ms), so day differences are calendar days, not 24h spans. */
function utcMidnight(d: Date): number {
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Whole UTC days since the latest bucket with any activity (`active_users > 0`) — 0 for
 * "active today", 1 for "yesterday", and so on. Returns null when no bucket in the window
 * has activity; because `fn_overview_signal` zero-fills only inside `[from, to)`, a null
 * means "no activity in the window", not "never active" — the copy must say so. "Activity"
 * is the same `active_users` measure as the headline, so the card's number and its activity
 * line cannot disagree. Assumes day-granularity buckets (the route pins `p_interval`).
 */
export function lastActiveDaysAgo(
  signal: OverviewSignalBucket[],
  now: Date,
): number | null {
  let latest: number | null = null;
  for (const bucket of signal) {
    if (bucket.active_users > 0) {
      const t = utcMidnight(new Date(bucket.bucket));
      if (latest === null || t > latest) latest = t;
    }
  }
  if (latest === null) return null;
  return Math.max(0, Math.round((utcMidnight(now) - latest) / DAY_MS));
}

/** Format the headline count for display (locale-aware, ADR 0030). */
export function formatMetricValue(value: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(value);
}

const EM_DASH = "—";

/** Format a signed delta ratio as a percent (e.g. +12%); null → em dash. */
export function formatDelta(deltaRatio: number | null, locale: string): string {
  if (deltaRatio === null) return EM_DASH;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 0,
    signDisplay: "exceptZero",
  }).format(deltaRatio);
}

/** One project's settled KPI+signal RPC pair (index-aligned with the input projects). */
export type ProjectRpcResult = PromiseSettledResult<
  [OverviewKpis, OverviewSignalBucket[]]
>;

/**
 * Assemble the per-project view-models from the settled RPC pairs — the load-bearing ok/error
 * mapping (AC8), extracted from the coverage-excluded route so it is directly unit-testable.
 * PURE: `settled[i]` is index-aligned with `projects[i]`, and a project is `status: "ok"` only
 * when its pair FULFILLED (both RPCs resolved); a rejected pair — or a missing slot — becomes
 * `status: "error"` with no rows and NO activity label, so an unavailable project is never
 * described as inactive. The localized activity line is supplied by `activityLabelFor` (the
 * route closes it over next-intl + `now`), keeping this helper free of i18n and the clock.
 */
export function buildLauncherProjects(
  projects: ReadonlyArray<{ id: string; name: string }>,
  settled: ReadonlyArray<ProjectRpcResult>,
  activityLabelFor: (signal: OverviewSignalBucket[]) => string,
): LauncherProject[] {
  return projects.map((project, i) => {
    const result = settled[i];
    if (result?.status === "fulfilled") {
      const [kpis, signal] = result.value;
      return {
        id: project.id,
        name: project.name,
        status: "ok",
        kpis,
        signal,
        activityLabel: activityLabelFor(signal),
      };
    }
    return { id: project.id, name: project.name, status: "error" };
  });
}

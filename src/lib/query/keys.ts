/**
 * Query-key convention (ADR 0025). Keys are **hierarchical** and built from one
 * factory so invalidation is predictable: invalidating a broad key cascades to
 * everything nested under it. Calling
 * `queryClient.invalidateQueries({ queryKey: queryKeys.notes.all })` clears
 * every notes list *and* detail, because their keys all start with `["notes"]`.
 *
 * Rules:
 *   - **Always build keys here** — never inline array literals at call sites, so
 *     a rename is one edit and a typo can't silently desync the cache.
 *   - Every level is `as const` → readonly tuples, which TanStack compares
 *     structurally for cache matching.
 *
 * Shape to copy per entity:
 *   all        → entity root                     ["notes"]
 *   lists()    → all list-shaped queries         ["notes","list"]
 *   list(f)    → one list with filters           ["notes","list",{...f}]
 *   details()  → all detail-shaped queries       ["notes","detail"]
 *   detail(id) → one entity by id                ["notes","detail",id]
 */

// TODO(you — ADR 0025 decision point): flesh out the `notes` key factory.
// The `all` root is here as the anchor; add `lists()`, `list(filters)`,
// `details()`, and `detail(id)` following the documented shape. Type the
// params to your real query inputs (e.g. a `NoteFilters` type for `list`), and
// keep each return value `as const`. Add sibling entities (e.g. `profile`) the
// same way as the app grows.
export const queryKeys = {
  // The first real entity (PR-4 trends, ADR 0084/0086). Both aggregations are keyed
  // by the exact RPC argument bag, so changing any control (event / window / interval /
  // breakdown) is a distinct cache entry, and a broad `trends.all` invalidate cascades.
  trends: {
    all: ["trends"] as const,
    /** A trends-series query, keyed by its `fn_event_trends` argument bag. */
    series: (args: Record<string, unknown>) =>
      [...queryKeys.trends.all, "series", args] as const,
    /** A top-events query, keyed by its `fn_top_events` argument bag. */
    top: (args: Record<string, unknown>) =>
      [...queryKeys.trends.all, "top", args] as const,
  },
  // PR-16 events explorer (ADR 0097). The raw-event page and the summary totals are
  // distinct cache entries — the page keyed by project + page window, the summary by its
  // `fn_events_summary` argument bag, and a per-user activity list by distinct_id. A
  // broad `events.all` invalidate cascades (e.g. a live-poll refresh).
  events: {
    all: ["events"] as const,
    /** A page of raw events, keyed by project + page window (offset/limit). */
    page: (args: Record<string, unknown>) =>
      [...queryKeys.events.all, "page", args] as const,
    /** The footer summary, keyed by its `fn_events_summary` argument bag. */
    summary: (args: Record<string, unknown>) =>
      [...queryKeys.events.all, "summary", args] as const,
    /** One facet dimension's per-value counts, keyed by its `fn_events_facets` args. */
    facets: (args: Record<string, unknown>) =>
      [...queryKeys.events.all, "facets", args] as const,
    /** One tracked user's recent activity (the expanded-row timeline). */
    activity: (args: Record<string, unknown>) =>
      [...queryKeys.events.all, "activity", args] as const,
  },
  // PR-5 funnel conversion (ADR 0087/0084/0086). Keyed by the exact `fn_funnel`
  // argument bag, so changing any control (steps / window / range) is a distinct
  // cache entry, and a broad `funnel.all` invalidate cascades.
  funnel: {
    all: ["funnel"] as const,
    /** A funnel-conversion query, keyed by its `fn_funnel` argument bag. */
    conversion: (args: Record<string, unknown>) =>
      [...queryKeys.funnel.all, "conversion", args] as const,
  },
  // PR-6 retention cohorts (ADR 0088/0084/0086). Keyed by the exact `fn_retention`
  // argument bag, so changing any control (range / period) is a distinct cache entry,
  // and a broad `retention.all` invalidate cascades.
  retention: {
    all: ["retention"] as const,
    /** A retention-cohort query, keyed by its `fn_retention` argument bag. */
    cohorts: (args: Record<string, unknown>) =>
      [...queryKeys.retention.all, "cohorts", args] as const,
  },
  // PR-7 segmentation (ADR 0089/0084/0086). The size and the distribution are distinct
  // cache entries, each keyed by its exact RPC argument bag (the jsonb rule included),
  // so any control change (rule / dimension / range) is a fresh entry, and a broad
  // `segment.all` invalidate cascades.
  segment: {
    all: ["segment"] as const,
    /** A segment-size query, keyed by its `fn_segment_size` argument bag. */
    size: (args: Record<string, unknown>) =>
      [...queryKeys.segment.all, "size", args] as const,
    /** A segment-distribution query, keyed by its `fn_segment_distribution` argument bag. */
    distribution: (args: Record<string, unknown>) =>
      [...queryKeys.segment.all, "distribution", args] as const,
  },
  // Phase D Overview home (ADR 0099/0084). The scalar KPIs and the signal series are
  // distinct cache entries, each keyed by its exact RPC argument bag (project + window
  // [+ interval]), so any range change is a fresh entry and a broad `overview.all`
  // invalidate cascades.
  overview: {
    all: ["overview"] as const,
    /** The scalar KPI row, keyed by its `fn_overview_kpis` argument bag. */
    kpis: (args: Record<string, unknown>) =>
      [...queryKeys.overview.all, "kpis", args] as const,
    /** The signal series (per-bucket, incl. purchasers), keyed by its `fn_overview_signal` argument bag. */
    signal: (args: Record<string, unknown>) =>
      [...queryKeys.overview.all, "signal", args] as const,
    /** The hero multi-series trend, keyed by its `fn_event_trends` argument bag. */
    hero: (args: Record<string, unknown>) =>
      [...queryKeys.overview.all, "hero", args] as const,
    /** The stacked-bars trend, keyed by its `fn_event_trends` argument bag. */
    bars: (args: Record<string, unknown>) =>
      [...queryKeys.overview.all, "bars", args] as const,
    /** The activation funnel, keyed by its `fn_funnel` argument bag. */
    funnel: (args: Record<string, unknown>) =>
      [...queryKeys.overview.all, "funnel", args] as const,
    /** The segment scatter, keyed by its `fn_segment_scatter` argument bag. */
    scatter: (args: Record<string, unknown>) =>
      [...queryKeys.overview.all, "scatter", args] as const,
  },
  // PR-8 saved analyses (ADR 0090) — the first WRITABLE entities, so the keys are
  // list/detail-shaped (not RPC-arg-shaped) and an optimistic mutation invalidates the
  // affected list. A broad `report.all` / `dashboard.all` invalidate cascades.
  report: {
    all: ["report"] as const,
    /** All report lists. */
    lists: () => [...queryKeys.report.all, "list"] as const,
    /** One project's saved reports. */
    list: (projectId: string) =>
      [...queryKeys.report.lists(), projectId] as const,
    /** All report details. */
    details: () => [...queryKeys.report.all, "detail"] as const,
    /** One report by id. */
    detail: (id: string) => [...queryKeys.report.details(), id] as const,
  },
  dashboard: {
    all: ["dashboard"] as const,
    /** All dashboard lists. */
    lists: () => [...queryKeys.dashboard.all, "list"] as const,
    /** One project's dashboards (each with its composed reports). */
    list: (projectId: string) =>
      [...queryKeys.dashboard.lists(), projectId] as const,
    /** All dashboard details. */
    details: () => [...queryKeys.dashboard.all, "detail"] as const,
    /** One dashboard by id. */
    detail: (id: string) => [...queryKeys.dashboard.details(), id] as const,
  },
} as const;

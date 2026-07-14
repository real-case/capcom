/**
 * Public API of the `event` entity (ADR 0065/0066). Consumers import
 * `@/entities/event`, never a deep segment path.
 */
export type {
  AnalyticsEvent,
  EventsFacet,
  EventsFacetsArgs,
  EventsQueryFilter,
  EventSortColumn,
  EventsSortSpec,
  EventsSummary,
  EventsSummaryArgs,
  EventTrendBucket,
  EventTrendsArgs,
  FunnelArgs,
  FunnelStep,
  OverviewKpis,
  OverviewKpisArgs,
  OverviewSignalArgs,
  OverviewSignalBucket,
  RetentionArgs,
  RetentionCell,
  TopEvent,
  TopEventsArgs,
} from "./model/types";
export {
  fetchEvents,
  fetchEventsFacets,
  fetchEventsSummary,
  fetchEventTrends,
  fetchFunnel,
  fetchOverviewKpis,
  fetchOverviewSignal,
  fetchRecentEvents,
  fetchRetention,
  fetchTopEvents,
} from "./api/queries";

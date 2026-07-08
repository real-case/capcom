/**
 * Public API of the `event` entity (ADR 0065/0066). Consumers import
 * `@/entities/event`, never a deep segment path.
 */
export type {
  AnalyticsEvent,
  EventsSummary,
  EventsSummaryArgs,
  EventTrendBucket,
  EventTrendsArgs,
  FunnelArgs,
  FunnelStep,
  RetentionArgs,
  RetentionCell,
  TopEvent,
  TopEventsArgs,
} from "./model/types";
export {
  fetchEvents,
  fetchEventsSummary,
  fetchEventTrends,
  fetchFunnel,
  fetchRecentEvents,
  fetchRetention,
  fetchTopEvents,
} from "./api/queries";

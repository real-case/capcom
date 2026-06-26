/**
 * Public API of the `event` entity (ADR 0065/0066). Consumers import
 * `@/entities/event`, never a deep segment path.
 */
export type {
  AnalyticsEvent,
  EventTrendBucket,
  EventTrendsArgs,
  FunnelArgs,
  FunnelStep,
  TopEvent,
  TopEventsArgs,
} from "./model/types";
export {
  fetchEventTrends,
  fetchFunnel,
  fetchRecentEvents,
  fetchTopEvents,
} from "./api/queries";

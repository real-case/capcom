/**
 * Public API of the `event` entity (ADR 0065/0066). Consumers import
 * `@/entities/event`, never a deep segment path.
 */
export type {
  AnalyticsEvent,
  EventTrendBucket,
  EventTrendsArgs,
  TopEvent,
  TopEventsArgs,
} from "./model/types";
export {
  fetchEventTrends,
  fetchRecentEvents,
  fetchTopEvents,
} from "./api/queries";

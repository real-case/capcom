/**
 * Public API of the `event` entity (ADR 0065/0066). Consumers import
 * `@/entities/event`, never a deep segment path.
 */
export type { AnalyticsEvent } from "./model/types";
export { fetchRecentEvents } from "./api/queries";

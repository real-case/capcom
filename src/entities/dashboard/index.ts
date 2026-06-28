/**
 * Public API of the `dashboard` entity (ADR 0065/0066). Consumers import
 * `@/entities/dashboard`, never a deep path. Groups the dashboard domain: the generated
 * row type, the composed `DashboardWithReports` shape, and the RLS-scoped read fetcher.
 * Persistence (create / rename / delete / compose / reorder) lives in the
 * `report-actions` feature (Server Actions, ADR 0020/0025/0090).
 */
export type {
  Dashboard,
  DashboardReportItem,
  DashboardReportRow,
  DashboardWithReports,
} from "./model/types";
export { fetchDashboards } from "./api/queries";

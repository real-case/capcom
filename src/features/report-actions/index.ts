/**
 * Public API of the `report-actions` feature (ADR 0065/0066) — the saved-analysis
 * write path (Server Actions, ADR 0020/0025/0090). The `dashboard` widget composes
 * these actions into its optimistic mutations; the input schemas stay internal, only
 * the actions and their result/value types are exposed.
 */
export {
  addReportToDashboard,
  createDashboard,
  createReport,
  deleteDashboard,
  deleteReport,
  removeReportFromDashboard,
  renameDashboard,
  renameReport,
  reorderDashboardReports,
} from "./api/actions";
export type {
  ActionError,
  ActionResult,
  AddReportResult,
  AddReportValues,
  CreateDashboardResult,
  CreateDashboardValues,
  CreateReportResult,
  CreateReportValues,
  DeleteDashboardValues,
  DeleteReportValues,
  RemoveItemValues,
  RenameDashboardValues,
  RenameReportValues,
  ReorderValues,
} from "./model/schemas";

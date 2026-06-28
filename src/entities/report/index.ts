/**
 * Public API of the `report` entity (ADR 0065/0066). Consumers import
 * `@/entities/report`, never a deep path. Groups the saved-analysis domain: the
 * generated row/kind types (ADR 0015), the `[report]` write envelope + config contract
 * (ADR 0017/0090), the kind→route map and config→URL-state serializer used to reopen a
 * report on its surface (ADR 0027), per-kind defaults, and the RLS-scoped read fetchers.
 * Persistence (writes) lives in the `report-actions` feature (Server Actions, ADR 0020/0025).
 */
export type { Report, ReportKind } from "./model/types";
export {
  REPORT_KINDS,
  defaultConfigForKind,
  reportConfigSchema,
  reportConfigToSearchParams,
  reportInputSchema,
  reportKindRoute,
  reportKindSchema,
} from "./model/config";
export type { ReportConfig, ReportInput } from "./model/config";
export { fetchReport, fetchReports } from "./api/queries";

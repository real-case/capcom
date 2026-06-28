import type { Database } from "@/lib/supabase/database.types";

/**
 * Domain types for the `dashboard` entity (ADR 0090), derived from the generated schema
 * (ADR 0015). A dashboard composes reports through the ordered `dashboard_reports` link.
 *
 * The composed report row is derived here from the generated table type rather than
 * imported from `@/entities/report`: under FSD (ADR 0065/0066) sibling entity slices are
 * isolated, so `dashboard` may not import `report`. Both derive the same row from the
 * shared schema, so the shape is identical; the `report` entity owns the report's
 * behaviour (config contract, fetchers), this entity only embeds the row for display.
 */

/** A dashboard row. */
export type Dashboard = Database["public"]["Tables"]["dashboards"]["Row"];

/** A report row as embedded under a dashboard (structurally identical to `Report`). */
export type DashboardReportRow = Database["public"]["Tables"]["reports"]["Row"];

/** One report composed onto a dashboard at a position (the link row + its report). */
export type DashboardReportItem = {
  /** The `dashboard_reports` link id — the handle for remove/reorder mutations. */
  id: string;
  position: number;
  report: DashboardReportRow;
};

/** A dashboard with its ordered composed reports. */
export type DashboardWithReports = Dashboard & {
  items: DashboardReportItem[];
};

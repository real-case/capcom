import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { DashboardWithReports } from "../model/types";

/**
 * Read access for the `dashboard` entity (ADR 0013/0090). Reads run as the signed-in
 * user under RLS, so a non-member sees nothing (ADR 0083). Each dashboard is returned
 * with its composed reports embedded through the `dashboard_reports` link (a PostgREST
 * nested select, not a client-side join); the items are ordered by `position` here —
 * presentation of an already-fetched list, not an aggregation (ADR 0084). Writes go
 * through the Server Actions (ADR 0020/0025).
 */

/** A project's dashboards (newest first), each with its ordered composed reports. */
export async function fetchDashboards(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<DashboardWithReports[]> {
  const { data, error } = await supabase
    .from("dashboards")
    .select(
      "id, project_id, owner_id, name, created_at, updated_at, items:dashboard_reports(id, position, report:reports(*))",
    )
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;

  // Order each dashboard's composed reports by position (display ordering of a small
  // embedded list — not SQL reduction). PostgREST does not guarantee embedded order.
  return (data ?? []).map((dashboard) => ({
    ...dashboard,
    items: [...dashboard.items].sort((a, b) => a.position - b.position),
  })) as DashboardWithReports[];
}

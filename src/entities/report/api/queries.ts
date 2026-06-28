import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { Report } from "../model/types";

/**
 * Read access for the `report` entity (ADR 0013/0090). Reads run as the signed-in user
 * under RLS, so a non-member of the project sees nothing (ADR 0083); the explicit
 * `project_id` filter narrows a multi-project member to the project asked for. Writes
 * go through the Server Actions (ADR 0020/0025), not these fetchers.
 */

/** A project's saved reports, newest first. Empty for a non-member (RLS). */
export async function fetchReports(
  supabase: SupabaseClient<Database>,
  projectId: string,
): Promise<Report[]> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/** A single report by id, or `null` when not visible (RLS) or absent. */
export async function fetchReport(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Report | null> {
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

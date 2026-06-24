import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { AnalyticsEvent } from "../model/types";

/**
 * Read access for the event entity (ADR 0013). Reads run as the signed-in user
 * under RLS, so a non-member of the project sees nothing (ADR 0083); the explicit
 * `project_id` filter narrows a multi-project member to the one project asked for.
 * Events are written only through the ingest path (ADR 0085) — there is no member
 * write fetcher here by design.
 */

/** The most recent events in a project, newest first. */
export async function fetchRecentEvents(
  supabase: SupabaseClient<Database>,
  projectId: string,
  limit = 50,
): Promise<AnalyticsEvent[]> {
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("project_id", projectId)
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

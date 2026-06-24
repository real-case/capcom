import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { Profile } from "../model/types";

/**
 * Read access for the profile entity (ADR 0013). Reads run as the signed-in user
 * under RLS, so a non-member of the project sees nothing (ADR 0083); the explicit
 * `project_id` filter narrows a multi-project member to the project asked for.
 * Profiles are written only through the ingest path (ADR 0085).
 */

/** Tracked end-users in a project, most-recently-seen first. */
export async function fetchProfiles(
  supabase: SupabaseClient<Database>,
  projectId: string,
  limit = 50,
): Promise<Profile[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("project_id", projectId)
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

/** A single tracked end-user by distinct_id, or `null` when not visible (RLS). */
export async function fetchProfile(
  supabase: SupabaseClient<Database>,
  projectId: string,
  distinctId: string,
): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("project_id", projectId)
    .eq("distinct_id", distinctId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

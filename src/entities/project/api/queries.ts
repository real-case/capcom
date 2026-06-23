import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { Project } from "../model/types";

/**
 * Data access for the project entity (ADR 0013). Reads run as the signed-in user
 * under RLS, so the rows returned are exactly the projects in organizations the
 * caller is a member of (ADR 0083) — scope is ambient, never re-derived here.
 */

/** Projects in the caller's organizations. RLS returns nothing for non-members. */
export async function fetchProjects(
  supabase: SupabaseClient<Database>,
): Promise<Project[]> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/** A single project by id, or `null` when the caller may not see it (RLS). */
export async function fetchProject(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Project | null> {
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { Organization } from "../model/types";

/**
 * Data access for the organization entity (ADR 0013). Each function takes a
 * request-scoped Supabase client (server or browser) so the caller controls the
 * context; every read runs as the signed-in user under RLS, so the result is
 * already tenant-scoped — there is no client-supplied org filter to forge
 * (ADR 0083). The membership join in the RLS policy is the only authority.
 */

/** Organizations the caller belongs to. RLS returns nothing for non-members. */
export async function fetchOrganizations(
  supabase: SupabaseClient<Database>,
): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .order("name");
  if (error) throw error;
  return data ?? [];
}

/** A single organization by id, or `null` when the caller may not see it (RLS). */
export async function fetchOrganization(
  supabase: SupabaseClient<Database>,
  id: string,
): Promise<Organization | null> {
  const { data, error } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

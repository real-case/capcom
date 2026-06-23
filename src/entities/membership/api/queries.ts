import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { Membership } from "../model/types";

/**
 * Data access for the membership entity (ADR 0013). The memberships SELECT policy
 * lets a member read the full roster of organizations they belong to, so to get
 * *the caller's own* rows we pin `user_id` to the authenticated user id. RLS still
 * guarantees the caller can only ever see rosters of their own organizations
 * (ADR 0083).
 */
export async function fetchMyMemberships(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Membership[]> {
  const { data, error } = await supabase
    .from("memberships")
    .select("*")
    .eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

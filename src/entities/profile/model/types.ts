import type { Tables } from "@/lib/supabase/database.types";

/**
 * A profile — the tracked end-user within a project, keyed by `distinct_id`
 * (ADR 0083). Deliberately NOT the authenticated member (`auth.users`): the
 * identity split is structural. `traits` holds the user properties the emitter
 * sets. Generated row shape (ADR 0015).
 */
export type Profile = Tables<"profiles">;

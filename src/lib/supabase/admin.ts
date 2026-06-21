import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

import type { Database } from "./database.types";

/**
 * Service-role client — **bypasses RLS** and runs with full privileges, so it
 * is confined to trusted server-only code (ADR 0013). The `server-only` import
 * plus the `env.server` fence (ADR 0018) keep the key out of client bundles: a
 * client import of this module fails `next build`.
 *
 * No admin operation exists yet; this establishes the fence for when one does.
 * The key is optional in `env.server` (it has no build-time default), so
 * presence is checked here at call time.
 */
export function createAdminClient() {
  if (!serverEnv.SUPABASE_SECRET_KEY) {
    throw new Error(
      "[supabase] SUPABASE_SECRET_KEY is required for admin (service-role) operations",
    );
  }

  return createSupabaseClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SECRET_KEY,
    // A service-role client is stateless: no session to persist or refresh.
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

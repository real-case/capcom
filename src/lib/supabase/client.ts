import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Browser Supabase client for Client Components (ADR 0013). Uses the public
 * publishable key and runs as the signed-in user, so all access is RLS-gated.
 * Typed
 * with the generated `Database` so queries are checked against the schema
 * (ADR 0015).
 */
export function createClient() {
  return createBrowserClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}

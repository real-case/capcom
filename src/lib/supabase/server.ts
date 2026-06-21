import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Request-scoped Supabase client for Server Components, Server Actions, and
 * route handlers (ADR 0013). Reads/writes the auth session from the request
 * cookies and runs as the signed-in user under RLS. Create one per request —
 * never hoist to a module-level singleton.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Thrown when called from a Server Component (cookies are
            // read-only there). Safe to ignore: the proxy refreshes the
            // session cookie on every request (ADR 0013, 0016).
          }
        },
      },
    },
  );
}

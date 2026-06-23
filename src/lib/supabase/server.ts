import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { cache } from "react";

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

/**
 * Request-scoped, deduplicated server client and current user (React `cache`).
 * A Server Component tree typically resolves the user more than once per
 * request — the protected layout guards on it, then a page reads it again — and
 * each raw `getUser()` is a round-trip to the Auth server. `cache` collapses
 * both the client construction and the user lookup to one per request, while
 * still revalidating the token with the Auth server (not `getSession`, ADR 0013/
 * 0016). Use these from Server Components; Server Actions still build their own
 * client via `createClient` (they are their own request).
 */
export const getServerClient = cache(createClient);

export const getCurrentUser = cache(async () => {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

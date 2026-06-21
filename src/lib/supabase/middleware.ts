import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/env";

import type { Database } from "./database.types";

/**
 * Refreshes the Supabase auth session and writes any rotated cookies onto the
 * `response` produced upstream (next-intl), so locale negotiation and session
 * refresh both run per request (ADR 0013, 0016, 0030). Called from `proxy.ts`.
 *
 * `getUser()` revalidates the token with the Auth server (unlike `getSession`,
 * which only reads the cookie); per Supabase guidance, run no code between
 * client creation and that call.
 */
export async function updateSession(
  request: NextRequest,
  response: NextResponse,
): Promise<NextResponse> {
  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mirror onto the request (for any downstream read this pass) and
          // onto the response (so the browser receives the rotated cookie).
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  await supabase.auth.getUser();

  return response;
}

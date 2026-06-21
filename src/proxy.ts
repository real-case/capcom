import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { updateSession } from "@/lib/supabase/middleware";

/**
 * Request-time middleware (Next 16's `proxy` convention). Two concerns run per
 * request and must compose, not replace each other (ADR 0030 + 0013/0016):
 *
 *   1. next-intl negotiates the locale and shapes the response — with the
 *      "always" prefix policy that means redirecting `/` to the locale and
 *      routing prefixed paths through the `[locale]` segment.
 *   2. Supabase refreshes the auth session, writing any rotated cookies onto
 *      that same response.
 *
 * Order matters: next-intl produces the response first; the Supabase refresh
 * then attaches its cookies to it.
 */
const handleI18n = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  const response = handleI18n(request);
  return updateSession(request, response);
}

export const config = {
  // Run on everything except Next internals, the metadata/crawl routes
  // (sitemap, robots, favicon), and any path with a file extension (static
  // assets). Those must not be locale-redirected or session-refreshed.
  matcher: ["/((?!api|_next|_vercel|sitemap.xml|robots.txt|.*\\..*).*)"],
};

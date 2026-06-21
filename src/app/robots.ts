import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/**
 * Crawl rules + sitemap pointer (ADR 0031). Allow-all is the baseline; routes
 * that must stay out of the index get explicit `disallow` entries as they land.
 */
export default function robots(): MetadataRoute.Robots {
  const origin = env.NEXT_PUBLIC_SITE_URL;

  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: new URL("/sitemap.xml", origin).toString(),
    host: origin,
  };
}

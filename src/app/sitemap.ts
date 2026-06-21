import type { MetadataRoute } from "next";

import { getPathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";

/**
 * Locale-free routes that exist for every locale (ADR 0031). Add entries as
 * pages land; each is emitted once per locale with `hreflang` alternates, so
 * the sitemap scales with both the route list and the locale config.
 */
const routes = ["/"] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = env.NEXT_PUBLIC_SITE_URL;
  const absolute = (locale: (typeof routing.locales)[number], href: string) =>
    new URL(getPathname({ href, locale }), origin).toString();

  return routes.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: absolute(locale, href),
      alternates: {
        languages: Object.fromEntries(
          routing.locales.map((alt) => [alt, absolute(alt, href)]),
        ),
      },
    })),
  );
}

import { getPathname } from "./navigation";
import { routing, type Locale } from "./routing";

/**
 * Precise shape: `canonical` is always a concrete locale-prefixed string, so
 * callers can reuse it (e.g. as the Open Graph `url`) without re-narrowing the
 * broad `Metadata["alternates"]` union. Assignable to `Metadata["alternates"]`.
 */
type LocaleAlternates = {
  canonical: string;
  languages: Record<string, string>;
};

/**
 * Canonical + `hreflang` alternates for a route, derived from the locale
 * config (ADR 0031). Given an internal `pathname` (locale-free, e.g. `"/"`),
 * it returns the current locale's canonical URL plus one alternate per locale,
 * including `x-default` pointing at the default locale.
 *
 * Paths are returned locale-prefixed but origin-relative; Next.js resolves
 * them against `metadataBase` (set in the root layout), so there is no second
 * source of truth for the site origin.
 */
export function buildAlternates(
  locale: Locale,
  pathname: string,
): LocaleAlternates {
  const localizedPath = (target: Locale) =>
    getPathname({ href: pathname, locale: target });

  const languages = Object.fromEntries([
    ...routing.locales.map((target) => [target, localizedPath(target)]),
    // x-default routes locale-agnostic crawlers to the canonical default.
    ["x-default", localizedPath(routing.defaultLocale)],
  ]);

  return { canonical: localizedPath(locale), languages };
}

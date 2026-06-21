import { defineRouting } from "next-intl/routing";

/**
 * The one place locales are configured (ADR 0030).
 *
 * Everything locale-aware — the `[locale]` segment, middleware negotiation,
 * navigation helpers, canonical/`hreflang` alternates (ADR 0031) and the
 * sitemap — derives from this object, so adding a locale is a config change
 * here plus a `messages/<locale>.json` catalog, with no routing code to touch.
 *
 * `defaultLocale` is the **canonical source locale**: all authored copy starts
 * here and the ADR 0055 agent-translation workflow (Phase 12) drafts the other
 * catalogs from it.
 */
export const routing = defineRouting({
  // A single locale today; the machinery is multi-locale from day one.
  locales: ["en"],
  defaultLocale: "en",
  // "always": every locale is prefixed (`/en/…`), including the default, and
  // `/` redirects to the negotiated locale. This keeps one canonical URL per
  // locale, which makes the ADR 0031 canonical/`hreflang` alternates
  // unambiguous (no default-locale special case).
  localePrefix: "always",
});

/** Union of the configured locale codes — e.g. `"en"`. */
export type Locale = (typeof routing.locales)[number];

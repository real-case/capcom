import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";

/**
 * Per-request i18n configuration consumed by `next-intl` Server Components and
 * by `NextIntlClientProvider` (which inherits `locale`/`messages` from here in
 * next-intl v4). The `[locale]` segment supplies `requestLocale`; an unknown
 * value (the segment also catches stray paths) falls back to the default so a
 * request never renders without messages (ADR 0030).
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});

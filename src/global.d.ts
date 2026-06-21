import type messages from "../messages/en.json";

import type { Locale } from "@/i18n/routing";

/**
 * Augments next-intl with project types (ADR 0030 "typed message access"):
 * `useTranslations`/`getTranslations` keys are checked against the canonical
 * `en` catalog, and `locale` values are narrowed to the configured set. A
 * typo'd key or an unknown locale becomes a compile error (`tsc --noEmit`).
 */
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof messages;
  }
}

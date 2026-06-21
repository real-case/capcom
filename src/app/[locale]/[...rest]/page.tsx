import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { routing } from "@/i18n/routing";

/**
 * Catch-all under `[locale]` (ADR 0019, 0030). Any path that matches no real
 * route lands here and becomes a localized 404 via `notFound()` (→
 * `not-found.tsx`). The request locale is set first so the not-found catalog
 * resolves for the matched locale even under static rendering.
 */
export default async function CatchAllPage({
  params,
}: {
  params: Promise<{ locale: string; rest: string[] }>;
}) {
  const { locale } = await params;
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);
  notFound();
}

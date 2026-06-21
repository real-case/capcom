import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing } from "@/i18n/routing";

/**
 * Placeholder home route. A Server Component rendering localized copy (ADR 0030)
 * — the minimal "the app builds and serves" page. Replace it with the first real
 * screen; the i18n/SEO/error-boundary scaffolding around it stays.
 */
export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // The [locale] layout already 404s unknown locales; narrow before enabling
  // static rendering so next-intl hooks read against a valid locale (ADR 0030).
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);

  const t = await getTranslations("HomePage");

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center gap-4 px-6 py-24 text-center">
      <h1 className="text-3xl font-semibold tracking-tight text-foreground">
        {t("heading")}
      </h1>
      <p className="max-w-md text-base leading-7 text-muted-foreground">
        {t("lead")}
      </p>
    </main>
  );
}

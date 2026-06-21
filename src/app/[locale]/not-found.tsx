import { useTranslations } from "next-intl";

import { Link } from "@/i18n/navigation";

/**
 * Localized 404 (ADR 0019, 0030). Renders when `notFound()` is called inside a
 * valid locale — the catch-all route (`[...rest]`) routes unknown paths here,
 * and the locale layout calls `notFound()` for an invalid locale. A Server
 * Component: `useTranslations` reads the request catalog and `Link` keeps the
 * active locale prefix.
 */
export default function NotFound() {
  const t = useTranslations("NotFound");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      <Link
        href="/"
        className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
      >
        {t("home")}
      </Link>
    </main>
  );
}

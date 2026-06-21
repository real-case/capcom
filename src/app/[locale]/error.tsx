"use client";

import { useTranslations } from "next-intl";

/**
 * Segment error boundary for the locale tree (ADR 0019, 0002). The App Router
 * requires this to be a Client Component. Copy stays **generic** — the actual
 * error detail is recorded server-side by `src/lib/logger.ts` and never shown
 * here. `digest` is a safe correlation hash (not internal detail), surfaced so
 * a user/support can tie a report back to the matching server log line.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("Error");

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <p className="text-sm text-muted-foreground">{t("description")}</p>
      {error.digest && (
        <p className="font-mono text-xs text-muted-foreground">
          {t("reference", { digest: error.digest })}
        </p>
      )}
      <button
        type="button"
        onClick={() => reset()}
        className="mt-2 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:opacity-90"
      >
        {t("retry")}
      </button>
    </main>
  );
}

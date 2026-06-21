"use client";

/**
 * Root error boundary (ADR 0019, 0002). It replaces the root layout when that
 * layout itself throws (`[locale]/layout.tsx` is the de-facto root here), so it
 * must render its own <html>/<body>. The provider that supplies translations is
 * exactly what failed in this path, so copy is intentionally **generic English**
 * — no next-intl, no design tokens that depend on the layout's fonts. The real
 * detail lives in the server logs (`src/lib/logger.ts`); `digest` is a safe
 * correlation hash.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="text-sm text-gray-500">
          An unexpected error occurred. Please try again.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-gray-400">
            Reference: {error.digest}
          </p>
        )}
        <button
          type="button"
          onClick={() => reset()}
          className="mt-2 rounded-md border px-4 py-2 text-sm font-medium"
        >
          Try again
        </button>
      </body>
    </html>
  );
}

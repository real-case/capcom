"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import { getQueryClient } from "@/lib/query/get-query-client";

/**
 * Client provider tree (ADR 0025, 0027). Mounted once in the locale layout,
 * inside `NextIntlClientProvider`, so the whole client app is wrapped:
 *   - **TanStack Query** — the server-state cache (server-aware client, 0025);
 *   - **nuqs adapter** — the URL-as-state bucket (0027).
 * Zustand (0026) needs no provider here — stores are imported directly where
 * used.
 */
export function Providers({ children }: { children: ReactNode }) {
  // Call directly (not via useState/useMemo): getQueryClient already returns a
  // stable browser singleton, and the React Compiler (ADR 0029) owns memoization.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <NuqsAdapter>{children}</NuqsAdapter>
    </QueryClientProvider>
  );
}

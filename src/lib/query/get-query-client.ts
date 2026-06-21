import {
  QueryClient,
  defaultShouldDehydrateQuery,
} from "@tanstack/react-query";

// Server vs browser without the deprecated `isServer` re-export: on the server
// there is no `window`.
const isServer = typeof window === "undefined";

/**
 * Server-aware QueryClient (ADR 0025) — the canonical TanStack App-Router
 * pattern. The **browser** keeps one stable client for the whole session; the
 * **server** builds a fresh client per request so one user's cache never leaks
 * into another's render.
 */
function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Initial/server-rendered data comes from RSC (ADR 0002/0013); a short
        // staleTime stops the client from immediately refetching what the
        // server just sent on hydration.
        staleTime: 60 * 1000,
      },
      dehydrate: {
        // Dehydrate pending queries too, so server-prefetched (streamed)
        // queries hydrate on the client without a flash of loading state.
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

export function getQueryClient(): QueryClient {
  if (isServer) {
    // Never reuse across requests on the server.
    return makeQueryClient();
  }
  // Reuse the one browser client so the cache (and in-flight queries) survive
  // re-renders, Suspense, and HMR.
  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}

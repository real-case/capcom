// No "use client" here: this hook module is only imported by the interactive leaf
// (EventsExplorer.tsx), which owns the client boundary — the directive belongs at the
// leaf, not widened across the hook module (ADR 0002).
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchEvents,
  fetchEventsFacets,
  fetchEventsSummary,
  type EventsFacetsArgs,
  type EventsQueryFilter,
  type EventsSortSpec,
  type EventsSummaryArgs,
} from "@/entities/event";
import { fetchProfile } from "@/entities/profile";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Server-state hooks for the events explorer (ADR 0025/0097). The page, the summary, and each
 * facet dimension are distinct cache entries; the browser Supabase client (ADR 0013) runs all
 * of them as the signed-in member, so the raw-event SELECT and the `SECURITY INVOKER` RPCs
 * inherit that member's RLS scope (ADR 0083). The hooks own no aggregation — the SQL functions
 * do (ADR 0084) — and the presentational table that consumes them owns no fetching.
 */

/** The full page read: window + closed filter + multi-sort (ADR 0097). */
export type EventsPageArgs = {
  offset: number;
  limit: number;
  filter: EventsQueryFilter;
  sort: EventsSortSpec;
};

/** A page of raw events; `keepPreviousData` holds the last page visible while the next loads. */
export function useEventsPage(
  projectId: string,
  args: EventsPageArgs,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: queryKeys.events.page({ projectId, ...args }),
    queryFn: () => fetchEvents(createClient(), projectId, args),
    placeholderData: keepPreviousData,
    refetchInterval: options?.refetchInterval ?? false,
  });
}

/** The footer totals (total events, distinct users, value sum) from fn_events_summary. */
export function useEventsSummary(
  args: EventsSummaryArgs,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: queryKeys.events.summary(args),
    queryFn: () => fetchEventsSummary(createClient(), args),
    refetchInterval: options?.refetchInterval ?? false,
  });
}

/**
 * One facet dimension's per-value counts from fn_events_facets (ADR 0097/0084). `enabled`
 * gates the fetch to when the facet popover is open, so closed facets cost nothing; the counts
 * re-fetch when the active filter (in `args`) changes, keeping them honest.
 */
export function useEventsFacets(
  args: EventsFacetsArgs,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: queryKeys.events.facets(args),
    queryFn: () => fetchEventsFacets(createClient(), args),
    enabled: options?.enabled ?? true,
  });
}

/** The trailing window the LIVE rate is reduced over (ADR 0098). */
const LIVE_RATE_WINDOW_MS = 60_000;

/**
 * The header's "LIVE · n/min" rate (ADR 0098): total events in the trailing minute,
 * reduced by `fn_events_summary` over a `[from, to)` window (ADR 0084) — never a
 * client-side count. The key is stable (no timestamp in it); each poll computes a
 * fresh window at fetch time, and pausing the stream stops the poll with the others.
 */
export function useLiveRate(
  projectId: string,
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: queryKeys.events.summary({
      p_project_id: projectId,
      window: "live-1m",
    }),
    queryFn: () => {
      const to = Date.now();
      return fetchEventsSummary(createClient(), {
        p_project_id: projectId,
        p_from: new Date(to - LIVE_RATE_WINDOW_MS).toISOString(),
        p_to: new Date(to).toISOString(),
      });
    },
    refetchInterval: options?.refetchInterval ?? false,
  });
}

/**
 * The expanded row's detail data — the tracked user's profile and their most recent
 * events (the activity timeline) — fetched only while a row is open (`enabled`).
 */
export function useEventDetail(projectId: string, distinctId: string | null) {
  // `enabled` gates the fetch, but each queryFn still narrows `distinctId` explicitly
  // rather than assert it — the type checker (not an `as`) proves it non-null (ADR 0003).
  const profile = useQuery({
    queryKey: queryKeys.events.activity({
      projectId,
      distinctId,
      kind: "profile",
    }),
    queryFn: () => {
      if (distinctId === null) throw new Error("distinctId is required");
      return fetchProfile(createClient(), projectId, distinctId);
    },
    enabled: distinctId !== null,
  });
  const activity = useQuery({
    queryKey: queryKeys.events.activity({
      projectId,
      distinctId,
      kind: "timeline",
    }),
    queryFn: () => {
      if (distinctId === null) throw new Error("distinctId is required");
      return fetchEvents(createClient(), projectId, { distinctId, limit: 6 });
    },
    enabled: distinctId !== null,
  });
  return { profile, activity };
}

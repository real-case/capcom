// No "use client" here: this hook module is only imported by the interactive leaf
// (EventsExplorer.tsx), which owns the client boundary — the directive belongs at the
// leaf, not widened across the hook module (ADR 0002).
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchEvents,
  fetchEventsSummary,
  type EventsSummaryArgs,
} from "@/entities/event";
import { fetchProfile } from "@/entities/profile";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Server-state hooks for the events explorer (ADR 0025/0097). The page and the summary
 * are distinct cache entries; the browser Supabase client (ADR 0013) runs both as the
 * signed-in member, so the raw-event SELECT and the `SECURITY INVOKER` summary RPC inherit
 * that member's RLS scope (ADR 0083). The hooks own no aggregation — the SQL function does
 * (ADR 0084) — and the presentational table that consumes them owns no fetching.
 */

/** A page of raw events; `keepPreviousData` holds the last page visible while the next loads. */
export function useEventsPage(
  projectId: string,
  window: { offset: number; limit: number },
  options?: { refetchInterval?: number | false },
) {
  return useQuery({
    queryKey: queryKeys.events.page({ projectId, ...window }),
    queryFn: () => fetchEvents(createClient(), projectId, window),
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
 * The expanded row's detail data — the tracked user's profile and their most recent
 * events (the activity timeline) — fetched only while a row is open (`enabled`).
 */
export function useEventDetail(projectId: string, distinctId: string | null) {
  const profile = useQuery({
    queryKey: queryKeys.events.activity({
      projectId,
      distinctId,
      kind: "profile",
    }),
    queryFn: () =>
      fetchProfile(createClient(), projectId, distinctId as string),
    enabled: distinctId !== null,
  });
  const activity = useQuery({
    queryKey: queryKeys.events.activity({
      projectId,
      distinctId,
      kind: "timeline",
    }),
    queryFn: () =>
      fetchEvents(createClient(), projectId, {
        distinctId: distinctId as string,
        limit: 6,
      }),
    enabled: distinctId !== null,
  });
  return { profile, activity };
}

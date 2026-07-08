"use client";

import { useState } from "react";
import { useQueryStates } from "nuqs";

import {
  useEventDetail,
  useEventsPage,
  useEventsSummary,
} from "../api/use-events";
import {
  DEFAULT_EVENTS_QUERY,
  eventsParsers,
  eventsQuerySchema,
  toPageWindow,
  toSummaryArgs,
  type Density,
} from "../model/url-state";

import { EventsTable } from "./EventsTable";

/**
 * The events explorer (PR-16, ADR 0097) — the interactive leaf that wires URL-state to
 * the raw-event page and the summary reduction, and threads both down to the
 * presentational table (which owns no fetching). Controls bind to the query string via
 * nuqs (ADR 0027) so a view is a shareable link; the hooks read as the signed-in member
 * under RLS (ADR 0013/0083). Live polling is local ephemeral UI (ADR 0026): a paused
 * stream stops the refetch interval. The footer totals come from `fn_events_summary`
 * (ADR 0084) — never a client-side reduce.
 */
export function EventsExplorer({ projectId }: { projectId: string }) {
  const [raw, setQuery] = useQueryStates(eventsParsers);
  const query = eventsQuerySchema.catch(DEFAULT_EVENTS_QUERY).parse(raw);

  const [streamPaused, setStreamPaused] = useState(false);
  const refetchInterval = streamPaused ? false : 15_000;

  const window = toPageWindow(query);
  const page = useEventsPage(projectId, window, { refetchInterval });
  const summary = useEventsSummary(toSummaryArgs(projectId), {
    refetchInterval,
  });

  const rows = page.data ?? [];
  // The expanded row's user drives the detail fetch; resolved from the current page so a
  // stale `expanded` from a shared link (its row not on this page) simply shows nothing.
  const expandedEvent = rows.find((row) => row.id === query.expanded) ?? null;
  const detail = useEventDetail(projectId, expandedEvent?.distinct_id ?? null);

  // Relative-time reference = the page's last-fetch timestamp (a pure value from the
  // query, not an impure `Date.now()` in render, ADR 0029). The poll refresh advances it,
  // so "12s ago" re-stamps on each refetch. Falls back to the summary's fetch time before
  // the first page lands.
  const nowMs = page.dataUpdatedAt || summary.dataUpdatedAt;

  return (
    <EventsTable
      rows={rows}
      summary={summary.data}
      total={summary.data?.total_events ?? 0}
      page={query.page}
      pageSize={query.pageSize}
      density={query.density}
      isLoading={page.isLoading}
      isError={page.isError}
      streamPaused={streamPaused}
      expandedId={query.expanded}
      detail={{
        profile: detail.profile.data,
        activity: detail.activity.data,
        isLoading: detail.profile.isLoading || detail.activity.isLoading,
      }}
      nowMs={nowMs}
      onToggleExpand={(id) =>
        void setQuery({ expanded: query.expanded === id ? null : id })
      }
      onPage={(next) =>
        void setQuery({ page: Math.max(1, next), expanded: null })
      }
      onPageSize={(size) =>
        void setQuery({ pageSize: size, page: 1, expanded: null })
      }
      onDensity={(density: Density) => void setQuery({ density })}
      onToggleStream={() => setStreamPaused((paused) => !paused)}
    />
  );
}

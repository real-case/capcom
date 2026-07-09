"use client";

import { useState } from "react";
import { useQueryStates } from "nuqs";

import {
  useEventDetail,
  useEventsPage,
  useEventsSummary,
} from "../api/use-events";
import {
  clearFacet,
  cycleSort,
  DEFAULT_FILTER,
  isFilterActive,
  toggleFacetValue,
  withSearch,
  type FacetDimension,
  type SortColumn,
} from "../model/filter";
import {
  DEFAULT_EVENTS_QUERY,
  eventsParsers,
  eventsQuerySchema,
  toFetchArgs,
  toSummaryArgs,
  type Density,
} from "../model/url-state";

import { EventsTable } from "./EventsTable";
import { EventsToolbar } from "./EventsToolbar";

/**
 * The events explorer (ADR 0097) — the interactive leaf that wires URL-state to the raw-event
 * page, the filtered summary reduction, and the facet counts, threading them down to the
 * presentational toolbar and table (which own no fetching). Controls bind to the query string
 * via nuqs (ADR 0027) so a filtered/sorted view is a shareable link; the hooks read as the
 * signed-in member under RLS (ADR 0013/0083). Changing the filter or sort resets to page 1 and
 * closes any open row. The footer totals come from `fn_events_summary` and the facet counts from
 * `fn_events_facets` (ADR 0084) — never a client-side reduce. Live polling is local ephemeral
 * UI (ADR 0026): a paused stream stops the refetch interval.
 */
export function EventsExplorer({ projectId }: { projectId: string }) {
  const [raw, setQuery] = useQueryStates(eventsParsers);
  const query = eventsQuerySchema.catch(DEFAULT_EVENTS_QUERY).parse(raw);

  const [streamPaused, setStreamPaused] = useState(false);
  const refetchInterval = streamPaused ? false : 15_000;

  const page = useEventsPage(projectId, toFetchArgs(query), {
    refetchInterval,
  });
  const summary = useEventsSummary(toSummaryArgs(projectId, query.filter), {
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

  // Filter / sort mutations. Each resets to page 1 and closes any open row, since the visible
  // set changes; the whole filter and sort are single nuqs-encoded values (ADR 0027).
  const resetView = { page: 1, expanded: null };
  const onSearchChange = (search: string) =>
    void setQuery({ filter: withSearch(query.filter, search), ...resetView });
  const onToggleFacet = (dimension: FacetDimension, value: string) =>
    void setQuery({
      filter: toggleFacetValue(query.filter, dimension, value),
      ...resetView,
    });
  const onClearFacet = (dimension: FacetDimension) =>
    void setQuery({
      filter: clearFacet(query.filter, dimension),
      ...resetView,
    });
  const onClearAll = () =>
    void setQuery({ filter: DEFAULT_FILTER, ...resetView });
  const onToggleSort = (column: SortColumn, additive: boolean) =>
    void setQuery({
      sort: cycleSort(query.sort, column, additive),
      ...resetView,
    });

  return (
    <div className="flex flex-col gap-3">
      <EventsToolbar
        projectId={projectId}
        filter={query.filter}
        onSearchChange={onSearchChange}
        onToggleFacet={onToggleFacet}
        onClearFacet={onClearFacet}
        onClearAll={onClearAll}
      />
      <EventsTable
        rows={rows}
        summary={summary.data}
        total={summary.data?.total_events ?? 0}
        page={query.page}
        pageSize={query.pageSize}
        density={query.density}
        sort={query.sort}
        filterActive={isFilterActive(query.filter)}
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
        onToggleSort={onToggleSort}
        onPage={(next) =>
          void setQuery({ page: Math.max(1, next), expanded: null })
        }
        onPageSize={(size) =>
          void setQuery({ pageSize: size, page: 1, expanded: null })
        }
        onDensity={(density: Density) => void setQuery({ density })}
        onToggleStream={() => setStreamPaused((paused) => !paused)}
      />
    </div>
  );
}

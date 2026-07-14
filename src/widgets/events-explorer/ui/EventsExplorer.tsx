"use client";

import type { RowSelectionState } from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useQueryStates } from "nuqs";

import type { Report } from "@/entities/report";

import {
  useEventDetail,
  useEventsPage,
  useEventsSummary,
  useLiveRate,
} from "../api/use-events";
import { useSavedViews, useSaveView } from "../api/use-views";
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
import { jsonRecord } from "../model/presentation";
import {
  DEFAULT_EVENTS_QUERY,
  eventsParsers,
  eventsQuerySchema,
  fromViewConfig,
  toFetchArgs,
  toSummaryArgs,
  toViewConfig,
  type Density,
  type GroupBy,
  type HideableColumn,
} from "../model/url-state";

import { ColumnsMenu } from "./ColumnsMenu";
import { EventsTable } from "./EventsTable";
import { EventsToolbar } from "./EventsToolbar";
import { GroupByMenu } from "./GroupByMenu";
import { GroupRollup } from "./GroupRollup";
import { SaveViewPopover } from "./SaveViewPopover";
import { ViewTabs } from "./ViewTabs";

/**
 * The events explorer (ADR 0097) — the interactive leaf that wires URL-state to the raw-event
 * page, the filtered summary reduction, and the facet counts, threading them down to the
 * presentational toolbar and table (which own no fetching). Controls bind to the query string
 * via nuqs (ADR 0027) so a filtered/sorted view is a shareable link; the hooks read as the
 * signed-in member under RLS (ADR 0013/0083). Changing the filter or sort resets to page 1 and
 * closes any open row. The footer totals come from `fn_events_summary` and the facet counts from
 * `fn_events_facets` (ADR 0084) — never a client-side reduce. Live polling is local ephemeral
 * UI (ADR 0026): a paused stream stops every refetch interval, including the LIVE rate.
 *
 * The row selection (PR-18) is likewise EPHEMERAL local view-state (ADR 0026), never nuqs
 * URL-state — a selection is not a shareable view. It drives only the read-only bulk actions
 * (export CSV + deep-links, ADR 0083/0090/0097) and is cleared whenever the visible set
 * changes (filter, sort, page, page size).
 *
 * Saved views (PR-19, ADR 0098) are reports of kind `events` (ADR 0090): a tab click hydrates
 * the report's config through the URL grammar (`fromViewConfig`) and stamps the view id; the
 * save popover persists the CURRENT persistable slice (`toViewConfig`). Group-by swaps the row
 * grid for the in-database roll-up; density sets the ADR 0082 `[data-density]` attribute on
 * the widget root — the dimension primitives do the rest.
 */
export function EventsExplorer({ projectId }: { projectId: string }) {
  const t = useTranslations("Events");
  const [raw, setQuery] = useQueryStates(eventsParsers);
  const query = eventsQuerySchema.catch(DEFAULT_EVENTS_QUERY).parse(raw);

  const [streamPaused, setStreamPaused] = useState(false);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [saveFailed, setSaveFailed] = useState(false);
  const refetchInterval = streamPaused ? false : 15_000;

  const page = useEventsPage(projectId, toFetchArgs(query), {
    refetchInterval,
  });
  const summary = useEventsSummary(toSummaryArgs(projectId, query.filter), {
    refetchInterval,
  });
  const liveRate = useLiveRate(projectId, { refetchInterval });
  const savedViews = useSavedViews(projectId);
  const saveView = useSaveView(projectId, {
    onSaved: (report) => void setQuery({ view: report.id }),
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

  // Filter / sort mutations. Each resets to page 1, closes any open row, and drops the row
  // selection, since the visible set changes; the whole filter and sort are single
  // nuqs-encoded values (ADR 0027) while the selection stays local (ADR 0026).
  const resetView = { page: 1, expanded: null };
  const clearSelection = () => setRowSelection({});
  const onSearchChange = (search: string) => {
    clearSelection();
    void setQuery({ filter: withSearch(query.filter, search), ...resetView });
  };
  const onToggleFacet = (dimension: FacetDimension, value: string) => {
    clearSelection();
    void setQuery({
      filter: toggleFacetValue(query.filter, dimension, value),
      ...resetView,
    });
  };
  const onClearFacet = (dimension: FacetDimension) => {
    clearSelection();
    void setQuery({
      filter: clearFacet(query.filter, dimension),
      ...resetView,
    });
  };
  const onClearAll = () => {
    clearSelection();
    void setQuery({ filter: DEFAULT_FILTER, ...resetView });
  };
  const onToggleSort = (column: SortColumn, additive: boolean) => {
    clearSelection();
    void setQuery({
      sort: cycleSort(query.sort, column, additive),
      ...resetView,
    });
  };

  // Saved views (ADR 0098): a tab hydrates the report's config through the grammar —
  // `null` (All events) hydrates an empty config, i.e. the defaults.
  const onOpenView = (view: Report | null) => {
    clearSelection();
    void setQuery({
      ...fromViewConfig(view ? jsonRecord(view.config) : {}),
      view: view?.id ?? null,
      ...resetView,
    });
  };
  const onSaveView = (name: string) => {
    setSaveFailed(false);
    saveView.mutate(
      { name, config: toViewConfig(query) },
      { onError: () => setSaveFailed(true) },
    );
  };

  // Group-by (ADR 0098): a dimension swaps in the roll-up; picking a roll-up row
  // applies it as a facet selection and returns to the row grid.
  const onGroupBy = (groupBy: GroupBy) => {
    clearSelection();
    void setQuery({ groupBy, ...resetView });
  };
  const onPickGroup = (dimension: FacetDimension, value: string) => {
    void setQuery({
      filter: toggleFacetValue(query.filter, dimension, value),
      groupBy: "none",
      ...resetView,
    });
  };
  const onToggleColumn = (column: HideableColumn) => {
    void setQuery({
      hidden: query.hidden.includes(column)
        ? query.hidden.filter((entry) => entry !== column)
        : [...query.hidden, column],
    });
  };

  return (
    <div
      className="flex flex-col gap-3"
      data-density={query.density === "dense" ? "dense" : undefined}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <ViewTabs
          views={savedViews.views}
          activeId={query.view}
          onOpen={onOpenView}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <GroupByMenu value={query.groupBy} onChange={onGroupBy} />
          <ColumnsMenu hidden={query.hidden} onToggle={onToggleColumn} />
          <SaveViewPopover onSave={onSaveView} isPending={saveView.isPending} />
        </div>
      </div>
      {saveFailed ? (
        <p role="alert" className="text-sm text-status-critical-fg">
          {t("saveViewFailed")}
        </p>
      ) : null}
      <EventsToolbar
        projectId={projectId}
        filter={query.filter}
        onSearchChange={onSearchChange}
        onToggleFacet={onToggleFacet}
        onClearFacet={onClearFacet}
        onClearAll={onClearAll}
      />
      {query.groupBy !== "none" ? (
        <GroupRollup
          projectId={projectId}
          dimension={query.groupBy}
          filter={query.filter}
          onPick={onPickGroup}
        />
      ) : (
        <EventsTable
          projectId={projectId}
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
          rowSelection={rowSelection}
          onRowSelectionChange={setRowSelection}
          hidden={query.hidden}
          liveRate={liveRate.data?.total_events}
          onToggleExpand={(id) =>
            void setQuery({ expanded: query.expanded === id ? null : id })
          }
          onToggleSort={onToggleSort}
          onPage={(next) => {
            clearSelection();
            void setQuery({ page: Math.max(1, next), expanded: null });
          }}
          onPageSize={(size) => {
            clearSelection();
            void setQuery({ pageSize: size, page: 1, expanded: null });
          }}
          onDensity={(density: Density) => void setQuery({ density })}
          onToggleStream={() => setStreamPaused((paused) => !paused)}
          onViewUser={(id) => void setQuery({ expanded: id })}
          onClearSelection={clearSelection}
        />
      )}
    </div>
  );
}

// No "use client": this table is rendered only inside the client leaf (EventsExplorer),
// which owns the boundary (ADR 0002). Marking it a client entry would flag its callback
// props as needing to be Server Actions.
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowSelectionState,
} from "@tanstack/react-table";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronRight as Caret,
} from "lucide-react";
import { Fragment } from "react";

import type { AnalyticsEvent, EventsSummary } from "@/entities/event";
import type { Profile } from "@/entities/profile";
import { CategoryPill } from "@/components/ui/category-pill";
import { MonoData } from "@/components/ui/mono-data";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import {
  SORTABLE_COLUMNS,
  type EventsSort,
  type SortColumn,
} from "../model/filter";
import { toColumnVisibility, type HideableColumn } from "../model/url-state";
import {
  eventHue,
  formatValue,
  propertyChips,
  shortId,
  trait,
} from "../model/presentation";
import { PAGE_SIZES, type Density } from "../model/url-state";

/** The column ids that support server-side sorting (widget id === sort column id). */
const SORTABLE_IDS = new Set<string>(SORTABLE_COLUMNS);

import { BulkActionsBar } from "./BulkActionsBar";
import { EventDetail } from "./EventDetail";
import { RelativeTime } from "./RelativeTime";

export type EventsTableProps = {
  /** The project the deep-link bulk actions target (ADR 0090). */
  projectId: string;
  rows: AnalyticsEvent[];
  summary: EventsSummary | undefined;
  /** Total matching events (from the summary RPC) — the pager denominator. */
  total: number;
  page: number;
  pageSize: number;
  density: Density;
  /** The active multi-sort — drives the header indicators and aria-sort. */
  sort: EventsSort;
  /** Whether any filter is active — selects the empty-state message. */
  filterActive: boolean;
  isLoading: boolean;
  isError: boolean;
  streamPaused: boolean;
  expandedId: string | null;
  detail: {
    profile: Profile | null | undefined;
    activity: AnalyticsEvent[] | undefined;
    isLoading: boolean;
  };
  nowMs: number;
  /** The row selection (by event id) — ephemeral local view-state at the leaf (ADR 0026). */
  rowSelection: RowSelectionState;
  onRowSelectionChange: OnChangeFn<RowSelectionState>;
  /** Hidden columns (URL-state, ADR 0098) — drives TanStack columnVisibility. */
  hidden: readonly HideableColumn[];
  /** Events in the trailing minute (fn_events_summary, ADR 0098) — the LIVE badge. */
  liveRate: number | undefined;
  onToggleExpand: (id: string) => void;
  onToggleSort: (column: SortColumn, additive: boolean) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onDensity: (density: Density) => void;
  onToggleStream: () => void;
  /** View-user bulk action: the leaf opens the row's user detail via `?expanded`. */
  onViewUser: (eventId: string) => void;
  onClearSelection: () => void;
};

export function EventsTable({
  projectId,
  rows,
  summary,
  total,
  page,
  pageSize,
  density,
  sort,
  filterActive,
  isLoading,
  isError,
  streamPaused,
  expandedId,
  detail,
  nowMs,
  rowSelection,
  onRowSelectionChange,
  hidden,
  liveRate,
  onToggleExpand,
  onToggleSort,
  onPage,
  onPageSize,
  onDensity,
  onToggleStream,
  onViewUser,
  onClearSelection,
}: EventsTableProps) {
  // TanStack Table's `useReactTable()` returns functions the React Compiler cannot safely
  // memoize, so opt this component out of auto-memoization rather than risk stale UI
  // (ADR 0029 documented exception). Only compiler memoization is skipped.
  "use no memo";
  const t = useTranslations("Events");
  const locale = useLocale();
  // Cell padding reads the ADR 0082 dimension semantics — the [data-density] attribute
  // on the widget root swaps the underlying --c-space-* primitives, so density needs no
  // per-component branch (ADR 0098).
  const cellPad = "py-(--space-2)";

  // The active sort as a lookup (column id → direction + 1-based rank); `multiSort` shows the
  // rank badge only when more than one key is active.
  const sortState = new Map(
    sort.map((key, index) => [key.id as string, { desc: key.desc, index }]),
  );
  const multiSort = sort.length > 1;

  const columns: ColumnDef<AnalyticsEvent>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          aria-label={t("selectAll")}
          checked={table.getIsAllRowsSelected()}
          ref={(el) => {
            if (el) el.indeterminate = table.getIsSomeRowsSelected();
          }}
          onChange={table.getToggleAllRowsSelectedHandler()}
          className="size-4 cursor-pointer accent-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          aria-label={t("selectRow", { event: row.original.event_name })}
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="size-4 cursor-pointer accent-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        />
      ),
    },
    {
      id: "event",
      header: t("col_event"),
      cell: ({ row }) => {
        const event = row.original;
        const open = event.id === expandedId;
        return (
          <button
            type="button"
            aria-expanded={open}
            aria-controls={`event-detail-${event.id}`}
            aria-label={t("expandRow")}
            onClick={() => onToggleExpand(event.id)}
            className="flex items-center gap-2 rounded-sm text-left font-medium text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <Caret
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-text-secondary transition-transform",
                open && "rotate-90 text-text-primary",
              )}
            />
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-[3px]"
              style={{ background: eventHue(event.event_name) }}
            />
            {event.event_name}
          </button>
        );
      },
    },
    {
      id: "user",
      header: t("col_user"),
      cell: ({ row }) => (
        <MonoData tone="secondary">
          {shortId(row.original.distinct_id)}
        </MonoData>
      ),
    },
    {
      id: "plan",
      header: t("col_plan"),
      cell: ({ row }) => {
        const plan = trait(row.original, "plan");
        return plan ? (
          <CategoryPill hue={eventHue(plan)} className="capitalize">
            {plan}
          </CategoryPill>
        ) : (
          <span className="text-text-secondary">—</span>
        );
      },
    },
    {
      id: "country",
      header: t("col_country"),
      cell: ({ row }) => (
        <MonoData tone="secondary">
          {trait(row.original, "country") ?? "—"}
        </MonoData>
      ),
    },
    {
      id: "device",
      header: t("col_device"),
      cell: ({ row }) => (
        <span className="capitalize text-text-secondary">
          {trait(row.original, "device") ?? "—"}
        </span>
      ),
    },
    {
      id: "value",
      header: t("col_value"),
      cell: ({ row }) => {
        const value = formatValue(row.original, locale);
        return value ? (
          <MonoData className="font-semibold">{value}</MonoData>
        ) : (
          <MonoData tone="secondary">—</MonoData>
        );
      },
    },
    {
      id: "properties",
      header: t("col_properties"),
      cell: ({ row }) => {
        const { chips, overflow } = propertyChips(row.original);
        return (
          <span className="flex items-center gap-1">
            {chips.map((chip) => (
              <span
                key={chip.key}
                className="rounded border border-border-hairline px-1.5 py-0.5 font-mono text-[0.6875rem] text-text-secondary"
              >
                <span className="text-text-primary">{chip.key}</span>=
                {chip.value}
              </span>
            ))}
            {overflow > 0 ? (
              <span className="text-[0.6875rem] text-text-secondary">
                +{overflow}
              </span>
            ) : null}
          </span>
        );
      },
    },
    {
      id: "time",
      header: t("col_time"),
      cell: ({ row }) => (
        <MonoData tone="secondary">
          <RelativeTime tsIso={row.original.ts} nowMs={nowMs} />
        </MonoData>
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
    enableRowSelection: true,
    onRowSelectionChange,
    // columnVisibility is fully controlled by the hidden-column URL-state (ADR 0098);
    // changes arrive through the leaf's ColumnsMenu, never from the table itself.
    state: { rowSelection, columnVisibility: toColumnVisibility(hidden) },
    // Filtering, sorting, and pagination all happen SERVER-SIDE (the URL-state drives the
    // fetcher, ADR 0097) — declare them manual so TanStack never runs its client-side
    // auto-resets. Without this, the select-all header's `getIsAllRowsSelected()` builds
    // the filtered row model, whose recompute on every data change queues a microtask
    // `setPageIndex(0)` state write — an extra re-render right after each fetch that
    // remounts the (inline, per-render) cell components and detaches their DOM mid-test.
    manualFiltering: true,
    manualSorting: true,
    manualPagination: true,
  });

  // The selection resolved against the CURRENT page data — an id that scrolled off the
  // page (poll refresh, page change) simply stops resolving; no stale row ever reaches
  // the bulk actions.
  const selectedRows = table
    .getSelectedRowModel()
    .rows.map((row) => row.original);

  // Visible-column geometry: full-width cells (empty/loading/detail) and the footer
  // split around the value column must track the hidden-column set (ADR 0098).
  const visibleIds = table.getVisibleLeafColumns().map((column) => column.id);
  const COLS = visibleIds.length;
  const valueIdx = visibleIds.indexOf("value");

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-text-secondary">
          {t("subtitle", { count: total })}
        </p>
        <button
          type="button"
          aria-pressed={streamPaused}
          onClick={onToggleStream}
          className="inline-flex items-center gap-1.5 rounded-full border border-border-hairline bg-surface-panel px-2.5 py-1 text-xs text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              !streamPaused && "animate-pulse",
            )}
            style={{
              background: streamPaused
                ? "var(--color-text-tertiary)"
                : "var(--color-viz-categorical-3)",
            }}
          />
          {streamPaused ? t("resumeStream") : t("pauseStream")}
        </button>
        {liveRate !== undefined ? (
          // Events in the trailing minute — reduced by fn_events_summary over a
          // [from, to) window (ADR 0098/0084), never counted client-side.
          <MonoData tone="secondary" className="font-medium">
            {t("live", { rate: liveRate })}
          </MonoData>
        ) : null}
        <div
          className="ms-auto flex items-center gap-1"
          role="group"
          aria-label={t("densityLabel")}
        >
          {(["comfortable", "dense"] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={density === option}
              onClick={() => onDensity(option)}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary",
                density === option
                  ? "bg-surface-elevated text-text-primary"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              {t(`density_${option}`)}
            </button>
          ))}
        </div>
      </div>

      {/* bulk actions over the selection (read-only, ADR 0083/0097) */}
      <BulkActionsBar
        rows={selectedRows}
        projectId={projectId}
        nowMs={nowMs}
        onViewUser={onViewUser}
        onClear={onClearSelection}
      />

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-border-hairline bg-surface-panel">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <caption className="sr-only">{t("tableLabel")}</caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr
                key={headerGroup.id}
                className="border-b border-border-hairline"
              >
                {headerGroup.headers.map((header) => {
                  const columnId = header.column.id;
                  const sortable = SORTABLE_IDS.has(columnId);
                  const state = sortState.get(columnId);
                  const alignRight =
                    columnId === "value" || columnId === "time";
                  const headerNode = flexRender(
                    header.column.columnDef.header,
                    header.getContext(),
                  );
                  const headerText =
                    typeof header.column.columnDef.header === "string"
                      ? header.column.columnDef.header
                      : columnId;
                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={
                        sortable
                          ? state
                            ? state.desc
                              ? "descending"
                              : "ascending"
                            : "none"
                          : undefined
                      }
                      className={cn(
                        "bg-surface-elevated px-3 py-2.5 text-left text-xs font-medium text-text-secondary",
                        alignRight && "text-right",
                        columnId === "select" && "w-8",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={(event) =>
                            onToggleSort(
                              columnId as SortColumn,
                              event.shiftKey || event.altKey,
                            )
                          }
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary",
                            state && "text-text-primary",
                          )}
                          aria-label={t("sortBy", { column: headerText })}
                        >
                          {headerNode}
                          {state ? (
                            state.desc ? (
                              <ArrowDown aria-hidden className="size-3" />
                            ) : (
                              <ArrowUp aria-hidden className="size-3" />
                            )
                          ) : (
                            <ArrowUpDown
                              aria-hidden
                              className="size-3 opacity-40"
                            />
                          )}
                          {multiSort && state ? (
                            <span className="tabular-nums text-[0.625rem] text-text-secondary">
                              {state.index + 1}
                            </span>
                          ) : null}
                        </button>
                      ) : (
                        headerNode
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isError ? (
              <tr>
                <td
                  colSpan={COLS}
                  className="px-3 py-10 text-center text-sm text-text-secondary"
                >
                  {t("error")}
                </td>
              </tr>
            ) : isLoading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLS}
                  className="px-3 py-10 text-center text-sm text-text-secondary"
                >
                  {t("loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLS}
                  className="px-3 py-10 text-center text-sm text-text-secondary"
                >
                  {filterActive ? t("emptyFiltered") : t("empty")}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => {
                const open = row.original.id === expandedId;
                return (
                  <Fragment key={row.id}>
                    <tr
                      data-state={row.getIsSelected() ? "selected" : undefined}
                      className={cn(
                        "border-b border-border-hairline transition-colors hover:bg-surface-elevated",
                        // Selected rows reuse the open-row neutral tint: a primary-tinted
                        // background drops the secondary text below the 4.5:1 AA ratio in the
                        // light composition (axe, ADR 0039/0092) — the checkbox +
                        // data-state carry the selection semantics.
                        (open || row.getIsSelected()) && "bg-surface-elevated",
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className={cn(
                            "whitespace-nowrap px-3 align-middle",
                            cellPad,
                            (cell.column.id === "value" ||
                              cell.column.id === "time") &&
                              "text-right",
                          )}
                        >
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </td>
                      ))}
                    </tr>
                    {open ? (
                      <tr>
                        <td
                          id={`event-detail-${row.original.id}`}
                          colSpan={COLS}
                          className="p-0"
                        >
                          <EventDetail
                            event={row.original}
                            profile={detail.profile}
                            activity={detail.activity}
                            isLoading={detail.isLoading}
                            locale={locale}
                            nowMs={nowMs}
                          />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                );
              })
            )}
          </tbody>
          <tfoot>
            {/* The footer splits around the value column; both spans track the
                hidden-column set (ADR 0098). */}
            <tr className="border-t border-border-hairline bg-surface-elevated">
              <td
                colSpan={valueIdx === -1 ? COLS : valueIdx}
                className="px-3 py-2.5 text-xs text-text-secondary"
              >
                {t("summary", {
                  events: summary?.total_events ?? 0,
                  users: summary?.distinct_users ?? 0,
                })}
              </td>
              {valueIdx !== -1 ? (
                <>
                  <td className="px-3 py-2.5 text-right">
                    <MonoData className="font-semibold">
                      {formatSummaryValue(summary?.value_sum ?? 0, locale)}
                    </MonoData>
                  </td>
                  {COLS - valueIdx - 1 > 0 ? (
                    <td colSpan={COLS - valueIdx - 1} />
                  ) : null}
                </>
              ) : null}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* pager */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-text-secondary">
          {t("pageInfo", { from, to, total })}
        </p>
        <div className="flex items-center gap-2">
          <div
            className="flex items-center gap-1"
            role="group"
            aria-label={t("perPage", { size: pageSize })}
          >
            {PAGE_SIZES.map((size) => (
              <button
                key={size}
                type="button"
                aria-pressed={pageSize === size}
                onClick={() => onPageSize(size)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary",
                  pageSize === size
                    ? "bg-surface-elevated text-text-primary"
                    : "text-text-secondary hover:text-text-primary",
                )}
              >
                {size}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => onPage(page - 1)}
            disabled={page <= 1}
            aria-label={t("prevPage")}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border-hairline bg-surface-panel text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <MonoData tone="secondary">
            {page} / {pageCount}
          </MonoData>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount}
            aria-label={t("nextPage")}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border-hairline bg-surface-panel text-text-secondary transition-colors hover:text-text-primary disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary"
          >
            <ChevronRight aria-hidden className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatSummaryValue(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

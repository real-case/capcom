// No "use client": this table is rendered only inside the client leaf (EventsExplorer),
// which owns the boundary (ADR 0002). Marking it a client entry would flag its callback
// props as needing to be Server Actions.
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
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
import { Badge } from "@/components/ui/badge";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

import {
  SORTABLE_COLUMNS,
  type EventsSort,
  type SortColumn,
} from "../model/filter";
import {
  eventHue,
  formatValue,
  planVariant,
  propertyChips,
  shortId,
  trait,
} from "../model/presentation";
import { PAGE_SIZES, type Density } from "../model/url-state";

/** The column ids that support server-side sorting (widget id === sort column id). */
const SORTABLE_IDS = new Set<string>(SORTABLE_COLUMNS);

import { EventDetail } from "./EventDetail";
import { RelativeTime } from "./RelativeTime";

export type EventsTableProps = {
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
  onToggleExpand: (id: string) => void;
  onToggleSort: (column: SortColumn, additive: boolean) => void;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
  onDensity: (density: Density) => void;
  onToggleStream: () => void;
};

const COLS = 8;

export function EventsTable({
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
  onToggleExpand,
  onToggleSort,
  onPage,
  onPageSize,
  onDensity,
  onToggleStream,
}: EventsTableProps) {
  // TanStack Table's `useReactTable()` returns functions the React Compiler cannot safely
  // memoize, so opt this component out of auto-memoization rather than risk stale UI
  // (ADR 0029 documented exception). Only compiler memoization is skipped.
  "use no memo";
  const t = useTranslations("Events");
  const locale = useLocale();
  const cellPad = density === "dense" ? "py-1.5" : "py-2.5";

  // The active sort as a lookup (column id → direction + 1-based rank); `multiSort` shows the
  // rank badge only when more than one key is active.
  const sortState = new Map(
    sort.map((key, index) => [key.id as string, { desc: key.desc, index }]),
  );
  const multiSort = sort.length > 1;

  const columns: ColumnDef<AnalyticsEvent>[] = [
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
            className="flex items-center gap-2 rounded-sm text-left font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Caret
              aria-hidden
              className={cn(
                "size-3.5 shrink-0 text-muted-foreground transition-transform",
                open && "rotate-90 text-primary",
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
        <span className="font-mono text-muted-foreground">
          {shortId(row.original.distinct_id)}
        </span>
      ),
    },
    {
      id: "plan",
      header: t("col_plan"),
      cell: ({ row }) => {
        const plan = trait(row.original, "plan");
        return plan ? (
          <Badge variant={planVariant(plan)} className="capitalize">
            {plan}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    },
    {
      id: "country",
      header: t("col_country"),
      cell: ({ row }) => (
        <span className="font-mono text-muted-foreground">
          {trait(row.original, "country") ?? "—"}
        </span>
      ),
    },
    {
      id: "device",
      header: t("col_device"),
      cell: ({ row }) => (
        <span className="capitalize text-muted-foreground">
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
          <span className="font-mono font-semibold text-foreground">
            {value}
          </span>
        ) : (
          <span className="font-mono text-muted-foreground">—</span>
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
                className="rounded border border-border px-1.5 py-0.5 font-mono text-[0.6875rem] text-muted-foreground"
              >
                <span className="text-foreground">{chip.key}</span>={chip.value}
              </span>
            ))}
            {overflow > 0 ? (
              <span className="text-[0.6875rem] text-muted-foreground">
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
        <span className="font-mono text-muted-foreground">
          <RelativeTime tsIso={row.original.ts} nowMs={nowMs} />
        </span>
      ),
    },
  ];

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.id,
  });

  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-3">
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-muted-foreground">
          {t("subtitle", { count: total })}
        </p>
        <button
          type="button"
          aria-pressed={streamPaused}
          onClick={onToggleStream}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span
            aria-hidden
            className={cn(
              "size-1.5 rounded-full",
              !streamPaused && "animate-pulse",
            )}
            style={{
              background: streamPaused
                ? "var(--color-muted-foreground)"
                : "var(--color-viz-categorical-3)",
            }}
          />
          {streamPaused ? t("resumeStream") : t("pauseStream")}
        </button>
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
                "rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                density === option
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t(`density_${option}`)}
            </button>
          ))}
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <caption className="sr-only">{t("tableLabel")}</caption>
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} className="border-b border-border">
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
                        "bg-muted/50 px-3 py-2.5 text-left text-xs font-medium text-muted-foreground",
                        alignRight && "text-right",
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
                            "inline-flex items-center gap-1 rounded-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                            state && "text-foreground",
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
                            <span className="tabular-nums text-[0.625rem] text-muted-foreground">
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
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {t("error")}
                </td>
              </tr>
            ) : isLoading && rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLS}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
                >
                  {t("loading")}
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td
                  colSpan={COLS}
                  className="px-3 py-10 text-center text-sm text-muted-foreground"
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
                      className={cn(
                        "border-b border-border transition-colors hover:bg-muted/40",
                        open && "bg-muted/40",
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
            <tr className="border-t border-border bg-muted/50">
              <td
                colSpan={5}
                className="px-3 py-2.5 text-xs text-muted-foreground"
              >
                {t("summary", {
                  events: summary?.total_events ?? 0,
                  users: summary?.distinct_users ?? 0,
                })}
              </td>
              <td className="px-3 py-2.5 text-right font-mono text-xs font-semibold text-foreground">
                {formatSummaryValue(summary?.value_sum ?? 0, locale)}
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>

      {/* pager */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
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
                  "rounded-md px-2 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  pageSize === size
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground",
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
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronLeft aria-hidden className="size-4" />
          </button>
          <span className="text-xs tabular-nums text-muted-foreground">
            {page} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => onPage(page + 1)}
            disabled={page >= pageCount}
            aria-label={t("nextPage")}
            className="inline-flex size-8 items-center justify-center rounded-md border border-border bg-card text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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

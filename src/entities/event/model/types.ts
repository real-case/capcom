import type { Database, Tables } from "@/lib/supabase/database.types";

/**
 * An analytics event — one immutable, append-only fact in a project's stream
 * (ADR 0083): `event_name`, `distinct_id`, an open `properties` bag, and the
 * emitter `ts`. Named `AnalyticsEvent` to avoid shadowing the DOM `Event`.
 * Generated row shape (ADR 0015).
 */
export type AnalyticsEvent = Tables<"events">;

/**
 * One-row totals from the `fn_events_summary` aggregation (ADR 0097, under the 0084
 * strategy): `total_events`, `distinct_users`, and `value_sum` over a project's stream
 * (optionally a `[from, to)` window). Backs the events-explorer footer — these are
 * genuine reductions and come from the database, never a client-side reduce. Generated
 * RPC return type (ADR 0015).
 */
export type EventsSummary =
  Database["public"]["Functions"]["fn_events_summary"]["Returns"][number];

/** The argument bag for the `fn_events_summary` RPC (generated, ADR 0015). */
export type EventsSummaryArgs =
  Database["public"]["Functions"]["fn_events_summary"]["Args"];

/**
 * One per-value facet count from the `fn_events_facets` aggregation (ADR 0097, under the
 * 0084 strategy): a facet `value` and its `count` under the active filter. Backs the filter
 * popover's counts — a genuine reduction from the database, never a client-side tally.
 * Generated RPC return type (ADR 0015).
 */
export type EventsFacet =
  Database["public"]["Functions"]["fn_events_facets"]["Returns"][number];

/** The argument bag for the `fn_events_facets` RPC (generated, ADR 0015). */
export type EventsFacetsArgs =
  Database["public"]["Functions"]["fn_events_facets"]["Args"];

/**
 * The closed filter applied to a raw-event page read (ADR 0097): a free-text `search` over
 * the event name, multi-value predicates over the event name and the top-level `properties`
 * keys plan / country / device, and an optional half-open `[from, to)` window. Every field is
 * user-authored data the fetcher applies through a **parameterized** query-builder operator
 * (`.ilike`/`.in`/`.gte`/`.lt`) — never string-concatenated SQL (ADR 0089). An empty array or
 * blank string means "unconstrained on that dimension".
 */
export type EventsQueryFilter = {
  search?: string;
  events?: readonly string[];
  plans?: readonly string[];
  countries?: readonly string[];
  devices?: readonly string[];
  from?: string | null;
  to?: string | null;
};

/** The `events` columns the raw-event page can be sorted by (ADR 0097). */
export type EventSortColumn = "ts" | "event_name" | "distinct_id";

/**
 * A multi-column sort for the raw-event page — an ordered list of (column, direction). The
 * fetcher applies each in order, then a stable `id desc` tiebreak; an empty list means the
 * default `ts desc`.
 */
export type EventsSortSpec = ReadonlyArray<{
  column: EventSortColumn;
  desc: boolean;
}>;

/**
 * One reduced row from the `fn_event_trends` aggregation (ADR 0084): a single
 * time `bucket`, the `series` it belongs to (the event name, or a breakdown value /
 * 'Other'), and the `count` for that pair. Derived from the generated RPC return
 * type — never hand-written (ADR 0015) — so a signature change surfaces here at
 * compile time.
 */
export type EventTrendBucket =
  Database["public"]["Functions"]["fn_event_trends"]["Returns"][number];

/**
 * One reduced row from the `fn_top_events` aggregation (ADR 0084): an `event_name`
 * and its `count` over the window. Generated RPC return type (ADR 0015).
 */
export type TopEvent =
  Database["public"]["Functions"]["fn_top_events"]["Returns"][number];

/** The argument bag for the `fn_event_trends` RPC (generated, ADR 0015). */
export type EventTrendsArgs =
  Database["public"]["Functions"]["fn_event_trends"]["Args"];

/** The argument bag for the `fn_top_events` RPC (generated, ADR 0015). */
export type TopEventsArgs =
  Database["public"]["Functions"]["fn_top_events"]["Args"];

/**
 * One reduced row from the `fn_funnel` aggregation (ADR 0087, under the 0084
 * strategy): a 1-based `step_index`, the `step_event` name at that position, and the
 * count of distinct `users` who reached it. Counts are non-increasing down the steps
 * by construction. Derived from the generated RPC return type — never hand-written
 * (ADR 0015) — so a signature change surfaces here at compile time.
 */
export type FunnelStep =
  Database["public"]["Functions"]["fn_funnel"]["Returns"][number];

/** The argument bag for the `fn_funnel` RPC (generated, ADR 0015). */
export type FunnelArgs = Database["public"]["Functions"]["fn_funnel"]["Args"];

/**
 * One reduced row from the `fn_retention` aggregation (ADR 0088, under the 0084
 * strategy): an acquisition `cohort_period`, the `cohort_size` (distinct users acquired
 * in it), a `period_offset` (whole calendar periods after the cohort), and the
 * `retained_users` active in that offset's period. Offset 0's `retained_users` equals
 * `cohort_size` by construction, and `retained_users <= cohort_size` for every cell.
 * Derived from the generated RPC return type — never hand-written (ADR 0015) — so a
 * signature change surfaces here at compile time.
 */
export type RetentionCell =
  Database["public"]["Functions"]["fn_retention"]["Returns"][number];

/** The argument bag for the `fn_retention` RPC (generated, ADR 0015). */
export type RetentionArgs =
  Database["public"]["Functions"]["fn_retention"]["Args"];

/**
 * One row of curated Overview KPIs from the `fn_overview_kpis` aggregation (ADR 0099,
 * under the 0084 strategy): the reduced scalars over the current window AND over the
 * equal-length preceding window (the `_prev` columns) — `active_users`, `new_signups`,
 * `purchasers`, and purchase `value_sum`. Backs the console Overview bento; the deltas,
 * conversion, ARPU, and goal-pace are PRESENTATION derived from these already-reduced
 * scalars (a ratio of two counts, ADR 0087/0088), never a client-side reduction.
 * Generated RPC return type (ADR 0015).
 */
export type OverviewKpis =
  Database["public"]["Functions"]["fn_overview_kpis"]["Returns"][number];

/** The argument bag for the `fn_overview_kpis` RPC (generated, ADR 0015). */
export type OverviewKpisArgs =
  Database["public"]["Functions"]["fn_overview_kpis"]["Args"];

/**
 * One per-bucket row from the `fn_overview_signal` aggregation (ADR 0099, under the 0084
 * strategy): a time `bucket` and its distinct `active_users`, distinct `new_signups`,
 * purchase `value_sum`, and distinct `purchasers`. Zero-filled over the window so the
 * Overview sparklines are contiguous. `purchasers` uses the same reduction as
 * `fn_overview_kpis`' scalar, so the conversion sparkline (`purchasers / active_users`, a
 * per-bucket ratio of two already-reduced scalars — presentation, ADR 0087/0088) cannot
 * drift from the conversion KPI. Generated RPC return type (ADR 0015).
 */
export type OverviewSignalBucket =
  Database["public"]["Functions"]["fn_overview_signal"]["Returns"][number];

/** The argument bag for the `fn_overview_signal` RPC (generated, ADR 0015). */
export type OverviewSignalArgs =
  Database["public"]["Functions"]["fn_overview_signal"]["Args"];

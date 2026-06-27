import type { Database, Tables } from "@/lib/supabase/database.types";

/**
 * An analytics event — one immutable, append-only fact in a project's stream
 * (ADR 0083): `event_name`, `distinct_id`, an open `properties` bag, and the
 * emitter `ts`. Named `AnalyticsEvent` to avoid shadowing the DOM `Event`.
 * Generated row shape (ADR 0015).
 */
export type AnalyticsEvent = Tables<"events">;

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

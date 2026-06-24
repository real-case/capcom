import type { Tables } from "@/lib/supabase/database.types";

/**
 * An analytics event — one immutable, append-only fact in a project's stream
 * (ADR 0083): `event_name`, `distinct_id`, an open `properties` bag, and the
 * emitter `ts`. Named `AnalyticsEvent` to avoid shadowing the DOM `Event`.
 * Generated row shape (ADR 0015).
 */
export type AnalyticsEvent = Tables<"events">;

import type { Tables } from "@/lib/supabase/database.types";

/**
 * An organization — the tenant root (ADR 0083). The row shape is generated from
 * the schema (ADR 0015), never hand-written, so it cannot drift from the table.
 */
export type Organization = Tables<"organizations">;

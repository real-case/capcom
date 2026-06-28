import type { Database } from "@/lib/supabase/database.types";

/**
 * Domain types for the `report` entity (ADR 0090), derived from the generated schema
 * (ADR 0015) so they track the migration. A report is one saved analysis: a named,
 * kind-discriminated config under a project.
 */

/** A saved-analysis row. */
export type Report = Database["public"]["Tables"]["reports"]["Row"];

/** The four flagship surfaces a report can be (the `report_kind` enum). */
export type ReportKind = Database["public"]["Enums"]["report_kind"];

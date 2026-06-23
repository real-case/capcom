import type { Tables } from "@/lib/supabase/database.types";

/**
 * A project — the analytics workspace under an organization (ADR 0083). Every
 * later domain entity (events, profiles, …) belongs to a project. Generated
 * row shape (ADR 0015).
 */
export type Project = Tables<"projects">;

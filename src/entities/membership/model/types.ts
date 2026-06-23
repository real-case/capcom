import type { Enums, Tables } from "@/lib/supabase/database.types";

/**
 * A membership — the link between an auth user and an organization, carrying the
 * member's role (ADR 0083). This is the authority every RLS policy joins through.
 * Generated row shape (ADR 0015).
 */
export type Membership = Tables<"memberships">;

/** The RBAC roles, as the generated `app_role` enum union (ADR 0083). */
export type AppRole = Enums<"app_role">;

/**
 * Privilege ladder, mirrored from the SQL `role_rank()` in the create_tenancy
 * migration. The database is authoritative — this client-side copy is only for
 * display ordering and optimistic UI gating; it never substitutes for the RLS
 * `has_role` check, which re-decides every privileged write server-side.
 */
export const ROLE_RANK: Record<AppRole, number> = {
  owner: 40,
  admin: 30,
  analyst: 20,
  viewer: 10,
};

/** Roles most-privileged first — the canonical order for menus and rosters. */
export const ROLE_ORDER: readonly AppRole[] = [
  "owner",
  "admin",
  "analyst",
  "viewer",
];

/**
 * True when `role` meets or exceeds `min` — the UI-side mirror of the SQL
 * `has_role(project, min)`. Use to hint affordances (e.g. show a "New project"
 * button to admins); the server still enforces the real gate.
 */
export function roleAtLeast(role: AppRole, min: AppRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

import { z } from "zod";

import type { Dashboard } from "@/entities/dashboard";
import { reportInputSchema, type Report } from "@/entities/report";

/**
 * Input schemas + result types for the saved-analysis Server Actions (ADR 0017/0090).
 * The schemas are the validation authority each action re-checks before touching the
 * database (ADR 0020); they reuse the `report` entity's `[report]` envelope so the
 * write contract matches what a widget produces. Kept in `model/` (not the `"use server"`
 * module, which may export only async functions) so the result types can be exported too.
 */

// A uuid-SHAPED id (8-4-4-4-12 hex), not a strict RFC v1–5 uuid: the demo's seeded ids
// (e.g. `0a000000-0000-0000-0000-0000000000a1`) are uuid-shaped but carry no version
// nibble, while real rows use `gen_random_uuid()` (v4). Both must pass; the id is only
// ever a parameterized `.eq()` filter under RLS, so shape-validation is the right guard.
const uuid = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    "must be a uuid",
  );
const name = z.string().trim().min(1).max(120);

/** Create a saved report under a project (config is the widget URL-state, ADR 0027). */
export const createReportInput = reportInputSchema.extend({ projectId: uuid });
export type CreateReportValues = z.infer<typeof createReportInput>;

export const renameReportInput = z.object({ id: uuid, name });
export type RenameReportValues = z.infer<typeof renameReportInput>;

export const deleteReportInput = z.object({ id: uuid });
export type DeleteReportValues = z.infer<typeof deleteReportInput>;

export const createDashboardInput = z.object({ projectId: uuid, name });
export type CreateDashboardValues = z.infer<typeof createDashboardInput>;

export const renameDashboardInput = z.object({ id: uuid, name });
export type RenameDashboardValues = z.infer<typeof renameDashboardInput>;

export const deleteDashboardInput = z.object({ id: uuid });
export type DeleteDashboardValues = z.infer<typeof deleteDashboardInput>;

/**
 * Compose a report onto a dashboard. `projectId` is client-supplied but cannot widen
 * scope: the migration's composite FKs reject any projectId that does not match BOTH the
 * dashboard's and the report's project, and RLS requires `analyst` in that project
 * (ADR 0090) — so a forged projectId fails the FK or the policy.
 */
export const addReportInput = z.object({
  projectId: uuid,
  dashboardId: uuid,
  reportId: uuid,
  position: z.number().int().min(0),
});
export type AddReportValues = z.infer<typeof addReportInput>;

export const removeItemInput = z.object({ itemId: uuid });
export type RemoveItemValues = z.infer<typeof removeItemInput>;

/** Reorder a dashboard's composed reports: the new top-to-bottom order of link-row ids. */
export const reorderInput = z.object({
  dashboardId: uuid,
  orderedItemIds: z.array(uuid).min(1),
});
export type ReorderValues = z.infer<typeof reorderInput>;

/**
 * Coarse failure reasons (ADR 0019) the UI maps to generic translated copy:
 *   - `invalid_input`  — the payload failed its schema.
 *   - `forbidden`      — RLS rejected a write (e.g. a viewer INSERT → 42501).
 *   - `not_found`      — an UPDATE/DELETE matched no row (absent, or RLS-invisible —
 *                        the two are deliberately indistinguishable, ADR 0083).
 *   - `failed`         — any other database error (FK/unique violation, etc.).
 */
export type ActionError =
  | "invalid_input"
  | "forbidden"
  | "not_found"
  | "failed";

export type ActionResult = { ok: true } | { ok: false; error: ActionError };
export type CreateReportResult =
  | { ok: true; report: Report }
  | { ok: false; error: ActionError };
export type CreateDashboardResult =
  | { ok: true; dashboard: Dashboard }
  | { ok: false; error: ActionError };
export type AddReportResult =
  | { ok: true; itemId: string }
  | { ok: false; error: ActionError };

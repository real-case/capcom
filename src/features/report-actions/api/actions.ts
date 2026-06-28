"use server";

import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

import {
  addReportInput,
  createDashboardInput,
  createReportInput,
  deleteDashboardInput,
  deleteReportInput,
  removeItemInput,
  renameDashboardInput,
  renameReportInput,
  reorderInput,
  type ActionError,
  type ActionResult,
  type AddReportResult,
  type AddReportValues,
  type CreateDashboardResult,
  type CreateDashboardValues,
  type CreateReportResult,
  type CreateReportValues,
  type DeleteDashboardValues,
  type DeleteReportValues,
  type RemoveItemValues,
  type RenameDashboardValues,
  type RenameReportValues,
  type ReorderValues,
} from "../model/schemas";

/**
 * Server Actions for saved analyses (ADR 0090) — the first member WRITE path. Each
 * re-validates its input against the canonical schema (ADR 0020), then runs as the
 * request under the signed-in user's RLS (ADR 0013): authorization is the database's
 * job, not re-implemented here. They return a discriminated result and never throw
 * across the action boundary, so the client's optimistic mutation (ADR 0025) can roll
 * back on `ok: false`. Writes are scoped by RLS — a viewer's INSERT raises 42501
 * (`forbidden`); an UPDATE/DELETE the caller may not perform matches zero rows
 * (`not_found`), since RLS makes "absent" and "forbidden" indistinguishable (ADR 0083).
 */

/** Map a Postgres/PostgREST error to a coarse reason. 42501 = RLS insert/check denial. */
function failure(error: { code?: string } | null): {
  ok: false;
  error: ActionError;
} {
  if (error?.code === "42501") return { ok: false, error: "forbidden" };
  return { ok: false, error: "failed" };
}

// ── Reports ──────────────────────────────────────────────────────────────────

export async function createReport(
  input: CreateReportValues,
): Promise<CreateReportResult> {
  const parsed = createReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { projectId, name, kind, config } = parsed.data;

  const supabase = await createClient();
  // owner_id is NOT set here: the column defaults to auth.uid() and the RLS WITH CHECK
  // pins it to the caller, so identity cannot be spoofed (ADR 0090/0083).
  const { data, error } = await supabase
    .from("reports")
    .insert({
      project_id: projectId,
      name,
      kind,
      // Validated as a JSON object by the schema; cast to the column's Json type.
      config: config as unknown as Json,
    })
    .select("*")
    .single();
  if (error) return failure(error);
  return { ok: true, report: data };
}

export async function renameReport(
  input: RenameReportValues,
): Promise<ActionResult> {
  const parsed = renameReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return failure(error);
  if (!data || data.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

export async function deleteReport(
  input: DeleteReportValues,
): Promise<ActionResult> {
  const parsed = deleteReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reports")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return failure(error);
  if (!data || data.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

// ── Dashboards ───────────────────────────────────────────────────────────────

export async function createDashboard(
  input: CreateDashboardValues,
): Promise<CreateDashboardResult> {
  const parsed = createDashboardInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .insert({ project_id: parsed.data.projectId, name: parsed.data.name })
    .select("*")
    .single();
  if (error) return failure(error);
  return { ok: true, dashboard: data };
}

export async function renameDashboard(
  input: RenameDashboardValues,
): Promise<ActionResult> {
  const parsed = renameDashboardInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .update({ name: parsed.data.name })
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return failure(error);
  if (!data || data.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

export async function deleteDashboard(
  input: DeleteDashboardValues,
): Promise<ActionResult> {
  const parsed = deleteDashboardInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboards")
    .delete()
    .eq("id", parsed.data.id)
    .select("id");
  if (error) return failure(error);
  if (!data || data.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

// ── Composition ──────────────────────────────────────────────────────────────

export async function addReportToDashboard(
  input: AddReportValues,
): Promise<AddReportResult> {
  const parsed = addReportInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };
  const { projectId, dashboardId, reportId, position } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboard_reports")
    .insert({
      project_id: projectId,
      dashboard_id: dashboardId,
      report_id: reportId,
      position,
    })
    .select("id")
    .single();
  if (error) return failure(error);
  return { ok: true, itemId: data.id };
}

export async function removeReportFromDashboard(
  input: RemoveItemValues,
): Promise<ActionResult> {
  const parsed = removeItemInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("dashboard_reports")
    .delete()
    .eq("id", parsed.data.itemId)
    .select("id");
  if (error) return failure(error);
  if (!data || data.length === 0) return { ok: false, error: "not_found" };
  return { ok: true };
}

export async function reorderDashboardReports(
  input: ReorderValues,
): Promise<ActionResult> {
  const parsed = reorderInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid_input" };

  const supabase = await createClient();
  // Rewrite each link row's position to its index in the new order. `position` carries
  // no unique constraint, so transient duplicates mid-rewrite are fine. A row the caller
  // may not update (RLS) matches zero rows → not_found, and the reorder is reported failed.
  // NOTE: this is a per-row rewrite, not one transaction — a mid-list failure can leave a
  // PARTIAL order persisted while the action returns failure. The blast radius is tiny (a
  // viewer's first UPDATE matches zero rows before any write; an analyst on consistent data
  // always completes) and the client's optimistic rollback + onSettled refetch reconciles,
  // so atomicity is an accepted demo boundary; a single SECURITY INVOKER RPC (set position
  // from `unnest(... with ordinality`) would close the window if it ever mattered.
  for (const [index, itemId] of parsed.data.orderedItemIds.entries()) {
    const { data, error } = await supabase
      .from("dashboard_reports")
      .update({ position: index })
      .eq("id", itemId)
      .select("id");
    if (error) return failure(error);
    if (!data || data.length === 0) return { ok: false, error: "not_found" };
  }
  return { ok: true };
}

// No "use client" here: imported by the interactive leaf (DashboardManager.tsx), which
// owns the client boundary (ADR 0002).
import { useMutation, useQueryClient } from "@tanstack/react-query";

import type {
  DashboardReportItem,
  DashboardWithReports,
} from "@/entities/dashboard";
import {
  defaultConfigForKind,
  type Report,
  type ReportKind,
} from "@/entities/report";
import {
  addReportToDashboard,
  createDashboard,
  createReport,
  deleteDashboard,
  deleteReport,
  removeReportFromDashboard,
  renameDashboard,
  renameReport,
  reorderDashboardReports,
} from "@/features/report-actions";
import { queryKeys } from "@/lib/query/keys";
import type { Database, Json } from "@/lib/supabase/database.types";

import { OPTIMISTIC_ID_PREFIX } from "../model/optimistic";

/**
 * Optimistic mutation hooks for saved analyses (ADR 0025/0090) — the optimistic-mutation
 * default applied to the first member write path. Each follows the canonical shape:
 * `onMutate` cancels in-flight reads, snapshots the affected list cache, and applies the
 * change immediately; `onError` rolls back to the snapshot and reports a coarse reason;
 * `onSettled` invalidates the list so the cache reconciles against server truth. The
 * Server Actions return a discriminated `{ ok }` result rather than throwing, so the
 * `mutationFn` throws on `ok: false` to drive the rollback (the thrown message is the
 * action's reason). Authorization is the database's (RLS) job — a viewer's write is
 * rejected and rolled back here, never gated client-side.
 */

type ReportRow = Database["public"]["Tables"]["reports"]["Row"];

/** Options shared by every hook: a callback the UI uses to surface a failed write. */
type MutationOptions = { onActionError?: (reason: string) => void };

/** Throw on a non-ok action result so TanStack's `onError` fires the rollback. */
function unwrap<T extends { ok: boolean }>(
  result: T,
): T extends { ok: true } ? T : never {
  if (!result.ok) {
    throw new Error(
      "error" in result && typeof result.error === "string"
        ? result.error
        : "failed",
    );
  }
  return result as never;
}

function nowIso() {
  return new Date().toISOString();
}

/** A throwaway client-side id for an optimistic row, replaced on settle by server truth. */
function tempId() {
  return `${OPTIMISTIC_ID_PREFIX}${crypto.randomUUID()}`;
}

// ── Reports ──────────────────────────────────────────────────────────────────

export function useCreateReport(projectId: string, opts: MutationOptions = {}) {
  const qc = useQueryClient();
  const key = queryKeys.report.list(projectId);
  return useMutation({
    mutationFn: async (vars: { name: string; kind: ReportKind }) =>
      unwrap(
        await createReport({
          projectId,
          name: vars.name,
          kind: vars.kind,
          config: defaultConfigForKind[vars.kind],
        }),
      ),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Report[]>(key);
      const optimistic: ReportRow = {
        id: tempId(),
        project_id: projectId,
        owner_id: null,
        name: vars.name,
        kind: vars.kind,
        config: defaultConfigForKind[vars.kind] as unknown as Json,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      qc.setQueryData<Report[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRenameReport(projectId: string, opts: MutationOptions = {}) {
  const qc = useQueryClient();
  const key = queryKeys.report.list(projectId);
  return useMutation({
    mutationFn: async (vars: { id: string; name: string }) =>
      unwrap(await renameReport(vars)),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Report[]>(key);
      qc.setQueryData<Report[]>(key, (old) =>
        (old ?? []).map((r) =>
          r.id === vars.id ? { ...r, name: vars.name } : r,
        ),
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteReport(projectId: string, opts: MutationOptions = {}) {
  const qc = useQueryClient();
  const key = queryKeys.report.list(projectId);
  // A deleted report also disappears from any dashboard composing it (FK cascade), so
  // invalidate the dashboards list too on settle.
  const dashKey = queryKeys.dashboard.list(projectId);
  return useMutation({
    mutationFn: async (vars: { id: string }) =>
      unwrap(await deleteReport(vars)),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Report[]>(key);
      qc.setQueryData<Report[]>(key, (old) =>
        (old ?? []).filter((r) => r.id !== vars.id),
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: dashKey });
    },
  });
}

// ── Dashboards ───────────────────────────────────────────────────────────────

export function useCreateDashboard(
  projectId: string,
  opts: MutationOptions = {},
) {
  const qc = useQueryClient();
  const key = queryKeys.dashboard.list(projectId);
  return useMutation({
    mutationFn: async (vars: { name: string }) =>
      unwrap(await createDashboard({ projectId, name: vars.name })),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DashboardWithReports[]>(key);
      const optimistic: DashboardWithReports = {
        id: tempId(),
        project_id: projectId,
        owner_id: null,
        name: vars.name,
        created_at: nowIso(),
        updated_at: nowIso(),
        items: [],
      };
      qc.setQueryData<DashboardWithReports[]>(key, (old) => [
        optimistic,
        ...(old ?? []),
      ]);
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRenameDashboard(
  projectId: string,
  opts: MutationOptions = {},
) {
  const qc = useQueryClient();
  const key = queryKeys.dashboard.list(projectId);
  return useMutation({
    mutationFn: async (vars: { id: string; name: string }) =>
      unwrap(await renameDashboard(vars)),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DashboardWithReports[]>(key);
      qc.setQueryData<DashboardWithReports[]>(key, (old) =>
        (old ?? []).map((d) =>
          d.id === vars.id ? { ...d, name: vars.name } : d,
        ),
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

export function useDeleteDashboard(
  projectId: string,
  opts: MutationOptions = {},
) {
  const qc = useQueryClient();
  const key = queryKeys.dashboard.list(projectId);
  return useMutation({
    mutationFn: async (vars: { id: string }) =>
      unwrap(await deleteDashboard(vars)),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DashboardWithReports[]>(key);
      qc.setQueryData<DashboardWithReports[]>(key, (old) =>
        (old ?? []).filter((d) => d.id !== vars.id),
      );
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

// ── Composition (add / remove / reorder) ──────────────────────────────────────

/** A helper that maps one dashboard within the list cache, leaving the rest untouched. */
function patchDashboard(
  qc: ReturnType<typeof useQueryClient>,
  key: readonly unknown[],
  dashboardId: string,
  fn: (d: DashboardWithReports) => DashboardWithReports,
) {
  qc.setQueryData<DashboardWithReports[]>(key, (old) =>
    (old ?? []).map((d) => (d.id === dashboardId ? fn(d) : d)),
  );
}

export function useAddReportToDashboard(
  projectId: string,
  opts: MutationOptions = {},
) {
  const qc = useQueryClient();
  const key = queryKeys.dashboard.list(projectId);
  return useMutation({
    mutationFn: async (vars: {
      dashboardId: string;
      report: Report;
      position: number;
    }) =>
      unwrap(
        await addReportToDashboard({
          projectId,
          dashboardId: vars.dashboardId,
          reportId: vars.report.id,
          position: vars.position,
        }),
      ),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DashboardWithReports[]>(key);
      const item: DashboardReportItem = {
        id: tempId(),
        position: vars.position,
        report: vars.report,
      };
      patchDashboard(qc, key, vars.dashboardId, (d) => ({
        ...d,
        items: [...d.items, item],
      }));
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveReportFromDashboard(
  projectId: string,
  opts: MutationOptions = {},
) {
  const qc = useQueryClient();
  const key = queryKeys.dashboard.list(projectId);
  return useMutation({
    mutationFn: async (vars: { dashboardId: string; itemId: string }) =>
      unwrap(await removeReportFromDashboard({ itemId: vars.itemId })),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DashboardWithReports[]>(key);
      patchDashboard(qc, key, vars.dashboardId, (d) => ({
        ...d,
        items: d.items.filter((i) => i.id !== vars.itemId),
      }));
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

export function useReorderDashboardReports(
  projectId: string,
  opts: MutationOptions = {},
) {
  const qc = useQueryClient();
  const key = queryKeys.dashboard.list(projectId);
  return useMutation({
    mutationFn: async (vars: {
      dashboardId: string;
      orderedItemIds: string[];
    }) =>
      unwrap(
        await reorderDashboardReports({
          dashboardId: vars.dashboardId,
          orderedItemIds: vars.orderedItemIds,
        }),
      ),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<DashboardWithReports[]>(key);
      patchDashboard(qc, key, vars.dashboardId, (d) => {
        const byId = new Map(d.items.map((i) => [i.id, i]));
        const items = vars.orderedItemIds
          .map((id, position) => {
            const item = byId.get(id);
            return item ? { ...item, position } : undefined;
          })
          .filter((i): i is DashboardReportItem => i !== undefined);
        return { ...d, items };
      });
      return { prev };
    },
    onError: (error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      opts.onActionError?.(error.message);
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

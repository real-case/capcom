// No "use client" here: this hook module is only imported by the interactive leaf
// (EventsExplorer.tsx), which owns the client boundary (ADR 0002).
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  fetchReports,
  type Report,
  type ReportConfig,
} from "@/entities/report";
import { createReport } from "@/features/report-actions";
import type { Json } from "@/lib/supabase/database.types";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Saved events views (ADR 0098): a view is a report of kind `events` under the 0090
 * model, so this module reads and writes the SAME reports list the dashboards surface
 * uses — one cache key (`queryKeys.report.list`), one invalidation path (ADR 0025).
 * The save goes through the existing `createReport` Server Action under the caller's
 * RLS (analyst-writable, ADR 0090); optimistic add mirrors the dashboards idiom.
 */

/** Client-visible marker for optimistic rows (mirrors the dashboards convention). */
const OPTIMISTIC_ID_PREFIX = "optimistic-";

/** The project's saved events views — the reports list narrowed to kind `events`. */
export function useSavedViews(projectId: string) {
  const query = useQuery({
    queryKey: queryKeys.report.list(projectId),
    queryFn: () => fetchReports(createClient(), projectId),
  });
  const views = (query.data ?? []).filter((report) => report.kind === "events");
  return { ...query, views };
}

/**
 * Save the current view (name + the persistable URL-state slice) as an `events`
 * report. Optimistic against the shared reports list; the settled invalidate restores
 * server truth (real id, owner) for both this surface and the dashboards (ADR 0025).
 */
export function useSaveView(
  projectId: string,
  opts: { onSaved?: (report: Report) => void } = {},
) {
  const qc = useQueryClient();
  const key = queryKeys.report.list(projectId);
  return useMutation({
    mutationFn: async (vars: { name: string; config: ReportConfig }) => {
      const result = await createReport({
        projectId,
        name: vars.name,
        kind: "events",
        config: vars.config,
      });
      if (!result.ok) throw new Error(result.error);
      return result.report;
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<Report[]>(key);
      const optimistic: Report = {
        id: `${OPTIMISTIC_ID_PREFIX}${crypto.randomUUID()}`,
        project_id: projectId,
        owner_id: null,
        name: vars.name,
        kind: "events",
        // The config is a validated URL-state slice — structurally Json; the same
        // single-cast posture the dashboards mutation takes (ADR 0090).
        config: vars.config as unknown as Json,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      qc.setQueryData<Report[]>(key, (old) => [optimistic, ...(old ?? [])]);
      return { prev };
    },
    onError: (_error, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
    },
    onSuccess: (report) => opts.onSaved?.(report),
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}

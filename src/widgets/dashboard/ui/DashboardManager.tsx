"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";

import {
  reportConfigToSearchParams,
  reportKindRoute,
  type Report,
  type ReportConfig,
} from "@/entities/report";

import { useDashboards, useReports } from "../api/use-dashboard-data";
import {
  useAddReportToDashboard,
  useCreateDashboard,
  useCreateReport,
  useDeleteDashboard,
  useDeleteReport,
  useRemoveReportFromDashboard,
  useRenameDashboard,
  useRenameReport,
  useReorderDashboardReports,
} from "../api/use-mutations";
import { DashboardBoard } from "./DashboardBoard";

/**
 * The dashboards surface (PR-8) — the container that wires the saved-analysis reads and
 * the optimistic write mutations (ADR 0025/0090) to the presentational `DashboardBoard`.
 * It owns the data hooks, the failed-write message state, and the deep-link that reopens
 * a report on its surface straight from the saved nuqs URL-state (ADR 0027). The board
 * stays presentational; authorization stays in the database (RLS) — a viewer's write is
 * rejected server-side and rolled back, surfaced here as a generic message (ADR 0019).
 */
export function DashboardManager({ projectId }: { projectId: string }) {
  const t = useTranslations("Dashboards");
  const [actionError, setActionError] = useState<string | null>(null);

  const messageForReason = (reason: string) => {
    if (reason === "forbidden") return t("errorForbidden");
    if (reason === "not_found") return t("errorNotFound");
    if (reason === "invalid_input") return t("errorInvalidInput");
    return t("errorFailed");
  };
  const onActionError = (reason: string) =>
    setActionError(messageForReason(reason));
  const opts = { onActionError };

  const reports = useReports(projectId);
  const dashboards = useDashboards(projectId);

  const createReport = useCreateReport(projectId, opts);
  const renameReport = useRenameReport(projectId, opts);
  const deleteReport = useDeleteReport(projectId, opts);
  const createDashboard = useCreateDashboard(projectId, opts);
  const renameDashboard = useRenameDashboard(projectId, opts);
  const deleteDashboard = useDeleteDashboard(projectId, opts);
  const addReport = useAddReportToDashboard(projectId, opts);
  const removeItem = useRemoveReportFromDashboard(projectId, opts);
  const reorder = useReorderDashboardReports(projectId, opts);

  const reportHref = (report: Report) => {
    // config is a jsonb object by construction (the DB CHECK + the widget's schema);
    // treat it as the report-config record to serialize back to URL-state.
    const config = (report.config ?? {}) as unknown as ReportConfig;
    const qs = reportConfigToSearchParams(report.kind, config);
    return `/p/${projectId}/${reportKindRoute[report.kind]}${qs ? `?${qs}` : ""}`;
  };

  return (
    <DashboardBoard
      reports={reports.data ?? []}
      dashboards={dashboards.data ?? []}
      isLoading={reports.isPending || dashboards.isPending}
      isError={reports.isError || dashboards.isError}
      actionError={actionError}
      onDismissError={() => setActionError(null)}
      reportHref={reportHref}
      onCreateReport={(values) => createReport.mutate(values)}
      onRenameReport={(id, name) => renameReport.mutate({ id, name })}
      onDeleteReport={(id) => deleteReport.mutate({ id })}
      onCreateDashboard={(values) => createDashboard.mutate(values)}
      onRenameDashboard={(id, name) => renameDashboard.mutate({ id, name })}
      onDeleteDashboard={(id) => deleteDashboard.mutate({ id })}
      onAddReport={(dashboardId, reportId) => {
        const dashboard = (dashboards.data ?? []).find(
          (d) => d.id === dashboardId,
        );
        const report = (reports.data ?? []).find((r) => r.id === reportId);
        if (!dashboard || !report) return;
        addReport.mutate({
          dashboardId,
          report,
          position: dashboard.items.length,
        });
      }}
      onRemoveItem={(dashboardId, itemId) =>
        removeItem.mutate({ dashboardId, itemId })
      }
      onReorder={(dashboardId, orderedItemIds) =>
        reorder.mutate({ dashboardId, orderedItemIds })
      }
    />
  );
}

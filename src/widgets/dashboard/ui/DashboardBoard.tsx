// No "use client" directive: the client boundary is owned by the parent leaf
// (DashboardManager.tsx). This presentational board is only ever rendered inside that
// boundary (and in stories/tests), so it inherits the client context — and because it
// is not a boundary entry, it may take function props (the write callbacks) without the
// RSC serialization constraint (ADR 0002).
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useForm } from "react-hook-form";

import type { DashboardWithReports } from "@/entities/dashboard";
import { REPORT_KINDS, type Report, type ReportKind } from "@/entities/report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import {
  dashboardFormSchema,
  reportFormSchema,
  type DashboardFormValues,
  type ReportFormValues,
} from "../model/forms";
import { isOptimisticId } from "../model/optimistic";

/**
 * Presentational dashboard board (ADR 0086 split): it renders saved reports and
 * dashboards from props and raises every write through callbacks — it owns no data
 * fetching and no Server Action wiring (the `DashboardManager` container does). Stories
 * exercise this component directly (empty / loading / error / overflow / dark) under the
 * axe gate (ADR 0039). Styling is token-only (ADR 0058): semantic utilities, no raw
 * literals, no SVG.
 */

const inputClass =
  "h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
const selectClass =
  "h-9 rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground";
const cardClass = "rounded-lg border border-border bg-card p-4";

export type DashboardBoardProps = {
  reports: Report[];
  dashboards: DashboardWithReports[];
  isLoading: boolean;
  isError: boolean;
  /** A pre-localized message for the most recent failed write, or null. */
  actionError: string | null;
  onDismissError: () => void;
  /** Build the surface deep-link that reopens a report from its saved config (ADR 0027). */
  reportHref: (report: Report) => string;
  onCreateReport: (values: ReportFormValues) => void;
  onRenameReport: (id: string, name: string) => void;
  onDeleteReport: (id: string) => void;
  onCreateDashboard: (values: DashboardFormValues) => void;
  onRenameDashboard: (id: string, name: string) => void;
  onDeleteDashboard: (id: string) => void;
  onAddReport: (dashboardId: string, reportId: string) => void;
  onRemoveItem: (dashboardId: string, itemId: string) => void;
  onReorder: (dashboardId: string, orderedItemIds: string[]) => void;
};

export function DashboardBoard(props: DashboardBoardProps) {
  const t = useTranslations("Dashboards");

  return (
    <div className="flex flex-col gap-8">
      {props.actionError ? (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-md border border-status-critical-border bg-status-critical-bg px-3 py-2 text-sm text-status-critical-fg"
        >
          <span>{props.actionError}</span>
          <button
            type="button"
            onClick={props.onDismissError}
            aria-label={t("dismissError")}
            className="text-xs font-medium text-status-critical-fg hover:underline"
          >
            {t("dismiss")}
          </button>
        </div>
      ) : null}

      <ReportsPanel {...props} t={t} />
      <DashboardsPanel {...props} t={t} />
    </div>
  );
}

type T = ReturnType<typeof useTranslations<"Dashboards">>;

// ── Reports panel ──────────────────────────────────────────────────────────────

function ReportsPanel({
  reports,
  isLoading,
  isError,
  reportHref,
  onCreateReport,
  onRenameReport,
  onDeleteReport,
  t,
}: DashboardBoardProps & { t: T }) {
  return (
    <section aria-labelledby="reports-heading" className="flex flex-col gap-3">
      <h2 id="reports-heading" className="text-sm font-medium text-foreground">
        {t("reportsHeading")}
      </h2>

      <CreateReportForm onCreate={onCreateReport} t={t} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t("loadingReports")}</p>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("errorReports")}
        </p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noReports")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reports.map((report) => (
            <ReportRow
              key={report.id}
              report={report}
              href={reportHref(report)}
              onRename={onRenameReport}
              onDelete={onDeleteReport}
              t={t}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CreateReportForm({
  onCreate,
  t,
}: {
  onCreate: (values: ReportFormValues) => void;
  t: T;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ReportFormValues>({
    resolver: zodResolver(reportFormSchema),
    defaultValues: { name: "", kind: "trends" },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onCreate(values);
        reset();
      })}
      noValidate
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="report-name" className="text-xs text-muted-foreground">
          {t("reportNameLabel")}
        </label>
        <input
          id="report-name"
          className={`${inputClass} w-56`}
          placeholder={t("reportNamePlaceholder")}
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="report-kind" className="text-xs text-muted-foreground">
          {t("kindLabel")}
        </label>
        <select id="report-kind" className={selectClass} {...register("kind")}>
          {REPORT_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {t(`kind_${kind}`)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" size="sm">
        {t("createReport")}
      </Button>
      {errors.name ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {t("nameRequired")}
        </p>
      ) : null}
    </form>
  );
}

function ReportRow({
  report,
  href,
  onRename,
  onDelete,
  t,
}: {
  report: Report;
  href: string;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  t: T;
}) {
  return (
    <li className={`flex flex-wrap items-center gap-3 ${cardClass}`}>
      <Badge variant="outline">{t(`kind_${report.kind as ReportKind}`)}</Badge>
      <InlineName
        name={report.name}
        onRename={(name) => onRename(report.id, name)}
        renameLabel={t("renameReport", { name: report.name })}
        saveLabel={t("save")}
        cancelLabel={t("cancel")}
        editLabel={t("rename")}
      />
      <div className="ml-auto flex items-center gap-2">
        <Link
          href={href}
          className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
        >
          {t("open")}
        </Link>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onDelete(report.id)}
          aria-label={t("deleteReport", { name: report.name })}
        >
          {t("delete")}
        </Button>
      </div>
    </li>
  );
}

// ── Dashboards panel ─────────────────────────────────────────────────────────

function DashboardsPanel({
  dashboards,
  reports,
  isLoading,
  isError,
  onCreateDashboard,
  onRenameDashboard,
  onDeleteDashboard,
  onAddReport,
  onRemoveItem,
  onReorder,
  t,
}: DashboardBoardProps & { t: T }) {
  return (
    <section
      aria-labelledby="dashboards-heading"
      className="flex flex-col gap-3"
    >
      <h2
        id="dashboards-heading"
        className="text-sm font-medium text-foreground"
      >
        {t("dashboardsHeading")}
      </h2>

      <CreateDashboardForm onCreate={onCreateDashboard} t={t} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">
          {t("loadingDashboards")}
        </p>
      ) : isError ? (
        <p role="alert" className="text-sm text-destructive">
          {t("errorDashboards")}
        </p>
      ) : dashboards.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("noDashboards")}</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {dashboards.map((dashboard) => (
            <DashboardCard
              key={dashboard.id}
              dashboard={dashboard}
              reports={reports}
              onRename={onRenameDashboard}
              onDelete={onDeleteDashboard}
              onAddReport={onAddReport}
              onRemoveItem={onRemoveItem}
              onReorder={onReorder}
              t={t}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function CreateDashboardForm({
  onCreate,
  t,
}: {
  onCreate: (values: DashboardFormValues) => void;
  t: T;
}) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<DashboardFormValues>({
    resolver: zodResolver(dashboardFormSchema),
    defaultValues: { name: "" },
  });

  return (
    <form
      onSubmit={handleSubmit((values) => {
        onCreate(values);
        reset();
      })}
      noValidate
      className="flex flex-wrap items-end gap-2"
    >
      <div className="flex flex-col gap-1">
        <label
          htmlFor="dashboard-name"
          className="text-xs text-muted-foreground"
        >
          {t("dashboardNameLabel")}
        </label>
        <input
          id="dashboard-name"
          className={`${inputClass} w-56`}
          placeholder={t("dashboardNamePlaceholder")}
          aria-invalid={errors.name ? true : undefined}
          {...register("name")}
        />
      </div>
      <Button type="submit" size="sm">
        {t("createDashboard")}
      </Button>
      {errors.name ? (
        <p role="alert" className="w-full text-sm text-destructive">
          {t("nameRequired")}
        </p>
      ) : null}
    </form>
  );
}

function DashboardCard({
  dashboard,
  reports,
  onRename,
  onDelete,
  onAddReport,
  onRemoveItem,
  onReorder,
  t,
}: {
  dashboard: DashboardWithReports;
  reports: Report[];
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAddReport: (dashboardId: string, reportId: string) => void;
  onRemoveItem: (dashboardId: string, itemId: string) => void;
  onReorder: (dashboardId: string, orderedItemIds: string[]) => void;
  t: T;
}) {
  const itemIds = dashboard.items.map((i) => i.id);
  const composedReportIds = new Set(dashboard.items.map((i) => i.report.id));
  // Exclude reports already on the board, and any not-yet-persisted optimistic row (its
  // temp id has no `reports` row, so composing it would fail the FK — ADR 0025/0090).
  const available = reports.filter(
    (r) => !composedReportIds.has(r.id) && !isOptimisticId(r.id),
  );

  const move = (index: number, delta: number) => {
    const next = [...itemIds];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    const a = next[index];
    const b = next[target];
    if (a === undefined || b === undefined) return;
    next[index] = b;
    next[target] = a;
    onReorder(dashboard.id, next);
  };

  return (
    <li className={`flex flex-col gap-3 ${cardClass}`}>
      <div className="flex flex-wrap items-center gap-3">
        <InlineName
          name={dashboard.name}
          onRename={(name) => onRename(dashboard.id, name)}
          renameLabel={t("renameDashboard", { name: dashboard.name })}
          saveLabel={t("save")}
          cancelLabel={t("cancel")}
          editLabel={t("rename")}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => onDelete(dashboard.id)}
          aria-label={t("deleteDashboard", { name: dashboard.name })}
        >
          {t("delete")}
        </Button>
      </div>

      {dashboard.items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t("emptyDashboard")}</p>
      ) : (
        <ol className="flex flex-col gap-2">
          {dashboard.items.map((item, index) => (
            <li
              key={item.id}
              className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-background px-3 py-2"
            >
              <Badge variant="outline">
                {t(`kind_${item.report.kind as ReportKind}`)}
              </Badge>
              <span className="text-sm text-foreground">
                {item.report.name}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  aria-label={t("moveUp", { name: item.report.name })}
                >
                  {t("up")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={index === dashboard.items.length - 1}
                  onClick={() => move(index, 1)}
                  aria-label={t("moveDown", { name: item.report.name })}
                >
                  {t("down")}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemoveItem(dashboard.id, item.id)}
                  aria-label={t("removeFromDashboard", {
                    name: item.report.name,
                  })}
                >
                  {t("remove")}
                </Button>
              </div>
            </li>
          ))}
        </ol>
      )}

      {available.length > 0 ? (
        <AddReportControl
          dashboardId={dashboard.id}
          available={available}
          onAdd={onAddReport}
          t={t}
        />
      ) : null}
    </li>
  );
}

function AddReportControl({
  dashboardId,
  available,
  onAdd,
  t,
}: {
  dashboardId: string;
  available: Report[];
  onAdd: (dashboardId: string, reportId: string) => void;
  t: T;
}) {
  const [selected, setSelected] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor={`add-${dashboardId}`} className="sr-only">
        {t("addReportLabel")}
      </label>
      <select
        id={`add-${dashboardId}`}
        className={selectClass}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">{t("addReportPlaceholder")}</option>
        {available.map((report) => (
          <option key={report.id} value={report.id}>
            {report.name}
          </option>
        ))}
      </select>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={selected === ""}
        onClick={() => {
          if (selected === "") return;
          onAdd(dashboardId, selected);
          setSelected("");
        }}
      >
        {t("addReport")}
      </Button>
    </div>
  );
}

// ── Inline rename ──────────────────────────────────────────────────────────────

function InlineName({
  name,
  onRename,
  renameLabel,
  editLabel,
  saveLabel,
  cancelLabel,
}: {
  name: string;
  onRename: (name: string) => void;
  renameLabel: string;
  editLabel: string;
  saveLabel: string;
  cancelLabel: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  if (!editing) {
    return (
      <span className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">{name}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(name);
            setEditing(true);
          }}
          aria-label={renameLabel}
        >
          {editLabel}
        </Button>
      </span>
    );
  }

  const submit = () => {
    const trimmed = draft.trim();
    if (trimmed.length > 0 && trimmed !== name) onRename(trimmed);
    setEditing(false);
  };

  return (
    <span className="flex items-center gap-2">
      <input
        autoFocus
        aria-label={renameLabel}
        className={`${inputClass} w-48`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
      <Button type="button" variant="outline" size="sm" onClick={submit}>
        {saveLabel}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setEditing(false)}
      >
        {cancelLabel}
      </Button>
    </span>
  );
}

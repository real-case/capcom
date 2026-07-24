import { Badge } from "@/components/ui/badge";
import { MonoData } from "@/components/ui/mono-data";
import { Panel } from "@/components/ui/panel";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Link } from "@/i18n/navigation";

import {
  deriveLauncherMetric,
  formatDelta,
  formatMetricValue,
  type LauncherCopy,
  type LauncherProject,
} from "../model/launcher";

import { LauncherSparkline } from "./LauncherSparkline";

/**
 * A single project launcher card (ADR 0101 Phase 3) — presentational, owns no fetching. The
 * whole card is one next-intl `Link` wrapping a `Panel`, following ProjectHub's idiom (a large
 * keyboard-focusable hit target), with `aria-labelledby` pointing at the project-name node so
 * the link's accessible name is the project name, not the run-on card body. Inside: the
 * member's role, the headline active-users metric with its label + window caption, a
 * period-over-period delta (nominal ↑ / caution ↓; omitted when null), the sparkline, and the
 * pre-localized activity line.
 *
 * The card switches on the project's `status` DISCRIMINANT, never nullable fields: a
 * `status: "error"` project (either RPC of its pair rejected) shows the error copy in place of
 * the whole metric block and makes NO activity claim — an unavailable project is never
 * described as inactive. The role is known from membership regardless, so it always renders.
 * Mission-control tokens only (ADR 0058/0081); kit primitives carry explicit call-site classes
 * because their default variants bake shadcn tokens no grep can see. No external margin.
 */
export type ProjectCardProps = {
  project: LauncherProject;
  /** Localized role label for the member in this org; null when unknown. */
  roleLabel: string | null;
  copy: LauncherCopy;
  /** BCP-47 tag for Intl number formatting. */
  locale: string;
};

export function ProjectCard({
  project,
  roleLabel,
  copy,
  locale,
}: ProjectCardProps) {
  const nameId = `launcher-card-${project.id}`;
  const roleId = `launcher-card-role-${project.id}`;
  const descId = `launcher-card-desc-${project.id}`;
  const metric =
    project.status === "ok" ? deriveLauncherMetric(project.kpis) : null;
  // Name the link with the project name — a clean, non-run-on accessible name (AC2) — but
  // DESCRIBE it with the role + metric + activity, so a screen-reader user tabbing card to
  // card still hears the data this launcher exists to surface. aria-labelledby ALONE would
  // hide every other descendant from the link's announcement. Both ids resolve in each branch.
  const describedBy = [roleLabel ? roleId : null, descId]
    .filter(Boolean)
    .join(" ");

  return (
    <Link
      href={`/p/${project.id}`}
      aria-labelledby={nameId}
      aria-describedby={describedBy}
      className="group block h-full rounded-lg focus-visible:ring-2 focus-visible:ring-text-primary focus-visible:outline-none"
    >
      <Panel className="flex h-full flex-col gap-3 transition-colors group-hover:bg-surface-elevated">
        <div className="flex items-start justify-between gap-2">
          <h3 id={nameId} className="font-medium text-text-primary">
            {project.name}
          </h3>
          {roleLabel ? (
            <Badge
              id={roleId}
              variant="outline"
              className="shrink-0 border-border-hairline bg-surface-elevated font-normal text-text-secondary"
            >
              {roleLabel}
            </Badge>
          ) : null}
        </div>

        {project.status === "error" || metric === null ? (
          <p
            id={descId}
            role="alert"
            className="text-sm text-status-critical-fg"
          >
            {copy.cardError}
          </p>
        ) : (
          <div id={descId} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-label text-text-secondary">
                {copy.metricLabel}
              </span>
              <div className="flex flex-wrap items-baseline gap-2">
                <MonoData className="text-2xl font-semibold">
                  {formatMetricValue(metric.value, locale)}
                </MonoData>
                {metric.deltaRatio !== null && (
                  <StatusIndicator
                    level={metric.deltaRatio >= 0 ? "nominal" : "caution"}
                    aria-label={`${formatDelta(metric.deltaRatio, locale)} ${copy.deltaCaption}`}
                  >
                    <MonoData className="text-current">
                      {formatDelta(metric.deltaRatio, locale)}
                    </MonoData>
                  </StatusIndicator>
                )}
              </div>
              <span className="text-caption text-text-secondary">
                {copy.windowLabel}
              </span>
            </div>

            <LauncherSparkline data={project.signal} />

            <p className="text-sm text-text-secondary">
              {project.activityLabel}
            </p>
          </div>
        )}
      </Panel>
    </Link>
  );
}

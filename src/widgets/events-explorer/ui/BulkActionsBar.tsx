// No "use client": rendered only inside the client leaf (EventsExplorer), which owns
// the boundary (ADR 0002) — the same posture as EventsTable / EventsToolbar.
import { Download, Filter, User, Users, X } from "lucide-react";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";

import { Button, buttonVariants } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { AnalyticsEvent } from "@/entities/event";
import { Link } from "@/i18n/navigation";

import {
  csvFilename,
  funnelDeepLink,
  segmentDeepLink,
  toCsv,
} from "../model/bulk";

/**
 * BulkActionsBar — read-only actions over the current row selection (PR-18, ADR 0097):
 * client-side CSV export of the selected rows (serialization, not aggregation,
 * ADR 0084) and deep-links into the funnel / segment surfaces via the report entity's
 * reopen path (ADR 0090), plus view-user, which the leaf resolves to the events
 * surface's own `?expanded` URL-state (the user-detail panel). Events are immutable
 * (ADR 0083) — there is deliberately no delete or edit action. A link renders only
 * when its config validates against the target grammar; otherwise the action shows
 * disabled. The bar owns no state: the selection arrives as the already-resolved rows.
 */
export function BulkActionsBar({
  rows,
  projectId,
  nowMs,
  onViewUser,
  onClear,
}: {
  rows: AnalyticsEvent[];
  projectId: string;
  /** Reference timestamp for the export filename (injected — deterministic). */
  nowMs: number;
  onViewUser: (eventId: string) => void;
  onClear: () => void;
}) {
  const t = useTranslations("Events");
  if (rows.length === 0) return null;

  const funnelHref = funnelDeepLink(projectId, rows);
  const segmentHref = segmentDeepLink(projectId, rows);
  const single = rows.length === 1 ? rows[0] : undefined;

  const exportCsv = () => {
    const blob = new Blob([toCsv(rows)], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = csvFilename(nowMs);
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Panel
      role="group"
      aria-label={t("bulkLabel")}
      className="flex flex-wrap items-center gap-2 px-3 py-2"
    >
      <p className="text-sm font-medium text-text-primary">
        {t("selectedCount", { count: rows.length })}
      </p>
      <div className="ms-auto flex flex-wrap items-center gap-1.5">
        <Button type="button" variant="outline" size="sm" onClick={exportCsv}>
          <Download aria-hidden className="size-3.5" />
          {t("exportCsv")}
        </Button>
        <BulkLink href={segmentHref}>
          <Users aria-hidden className="size-3.5" />
          {t("addToSegment")}
        </BulkLink>
        <BulkLink href={funnelHref}>
          <Filter aria-hidden className="size-3.5" />
          {t("buildFunnel")}
        </BulkLink>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={single === undefined}
          onClick={single ? () => onViewUser(single.id) : undefined}
        >
          <User aria-hidden className="size-3.5" />
          {t("viewUser")}
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClear}
          aria-label={t("clearSelection")}
        >
          <X aria-hidden className="size-3.5" />
        </Button>
      </div>
    </Panel>
  );
}

/**
 * A deep-link styled as an outline button, or the same action disabled when the
 * selection cannot form a valid config for the target grammar (`href === null`).
 */
function BulkLink({
  href,
  children,
}: {
  href: string | null;
  children: ReactNode;
}) {
  if (href === null) {
    return (
      <Button type="button" variant="outline" size="sm" disabled>
        {children}
      </Button>
    );
  }
  return (
    <Link
      href={href}
      className={buttonVariants({ variant: "outline", size: "sm" })}
    >
      {children}
    </Link>
  );
}

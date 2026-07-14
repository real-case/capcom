// No "use client": rendered only inside the client leaf (EventsExplorer), which owns
// the boundary (ADR 0002) — the same posture as the other segments of this widget.
import { useTranslations } from "next-intl";

import type { Report } from "@/entities/report";

import { cn } from "@/lib/utils";

/**
 * ViewTabs — the saved-view strip (ADR 0098): the default "All events" tab plus one
 * tab per saved `events` report. Purely presentational: the leaf resolves a click into
 * URL-state (the view's config hydrated through the grammar + the `view` id, ADR
 * 0027/0090), so the active tab is a shareable link. Views are saved here but managed
 * (rename/delete) where all reports are managed — the dashboards surface (ADR 0090).
 */
export function ViewTabs({
  views,
  activeId,
  onOpen,
}: {
  views: Report[];
  /** The active saved-view id, or null for "All events". */
  activeId: string | null;
  /** Open a saved view, or null to return to "All events". */
  onOpen: (view: Report | null) => void;
}) {
  const t = useTranslations("Events");
  const tabClass = (active: boolean) =>
    cn(
      "rounded-md px-2.5 py-1 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-text-primary",
      active
        ? "bg-surface-elevated font-medium text-text-primary"
        : "text-text-secondary hover:text-text-primary",
    );

  return (
    <div
      role="group"
      aria-label={t("viewsLabel")}
      className="flex flex-wrap items-center gap-1"
    >
      <button
        type="button"
        aria-pressed={activeId === null}
        onClick={() => onOpen(null)}
        className={tabClass(activeId === null)}
      >
        {t("viewAll")}
      </button>
      {views.map((view) => (
        <button
          key={view.id}
          type="button"
          aria-pressed={activeId === view.id}
          onClick={() => onOpen(view)}
          className={tabClass(activeId === view.id)}
        >
          {view.name}
        </button>
      ))}
    </div>
  );
}

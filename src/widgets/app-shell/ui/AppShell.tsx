"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Search } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";

import { SECTIONS } from "../model/sections";
import { CommandPalette } from "./CommandPalette";
import { SidebarNav } from "./SidebarNav";
import { TelemetryFooter } from "./TelemetryFooter";

/**
 * The project-scoped product shell (ADR 0065 widget). A persistent sidebar of the analytics
 * sections, a breadcrumb of the current context, a ⌘K command palette, and a telemetry footer
 * frame the analysis surfaces. Re-skinned onto the mission-control instrument-panel surface
 * (ADR 0099): chrome consumes the `--surface-*` / `--text-*` / `--border-hairline` tokens
 * (ADR 0081), never the shadcn value layer, so chrome and data-viz read as one panel; it flips
 * light/dark as one unit (ADR 0092). It sits below the app-wide top bar (brand / theme /
 * sign-out live there), so the shell owns navigation only. Presentational chrome: every value
 * (project / org names, the project list) arrives as props from the RLS-scoped Server Component
 * that renders it (ADR 0083); the shell fetches nothing. The sidebar collapses below `md`,
 * where the palette carries navigation.
 */
export function AppShell({
  projectId,
  projectName,
  orgName,
  projects,
  children,
}: {
  projectId: string;
  projectName: string;
  orgName: string;
  projects: { id: string; name: string }[];
  children: ReactNode;
}) {
  const t = useTranslations("AppShell");
  const pathname = usePathname();
  const [commandOpen, setCommandOpen] = useState(false);

  // ⌘K / Ctrl-K toggles the palette from anywhere in the shell.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // The trailing breadcrumb segment, derived from the locale-stripped path.
  const tail = pathname.replace(/^\/p\/[^/]+\/?/, "").split("/")[0] ?? "";
  const current = SECTIONS.find((s) => s.segment === tail);

  return (
    <div className="bg-surface-background text-text-primary flex min-h-full">
      <aside className="border-border-hairline bg-surface-panel hidden w-60 shrink-0 flex-col gap-2 border-r px-3 py-4 md:flex">
        <p className="text-text-secondary px-3 text-xs font-medium tracking-wider uppercase">
          {t("sidebar.sectionsLabel")}
        </p>
        <SidebarNav projectId={projectId} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="border-border-hairline flex items-center justify-between gap-4 border-b px-6 py-3">
          <nav
            aria-label={t("breadcrumb.label")}
            className="flex min-w-0 items-center gap-1.5 text-sm"
          >
            <Link
              href="/p"
              className="text-text-secondary hover:text-text-primary hidden shrink-0 transition-colors sm:inline"
            >
              {t("breadcrumb.workspaces")}
            </Link>
            <ChevronRight className="text-text-secondary hidden size-3.5 shrink-0 sm:inline" />
            <span className="text-text-secondary hidden shrink-0 sm:inline">
              {orgName}
            </span>
            <ChevronRight className="text-text-secondary hidden size-3.5 shrink-0 sm:inline" />
            <Link
              href={`/p/${projectId}`}
              className="text-text-primary truncate font-medium"
            >
              {projectName}
            </Link>
            {current && current.key !== "overview" && (
              <>
                <ChevronRight className="text-text-secondary size-3.5 shrink-0" />
                <span className="text-text-secondary truncate">
                  {t(`nav.${current.key}`)}
                </span>
              </>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label={t("command.openHint")}
            className="border-border-hairline bg-surface-panel text-text-secondary hover:text-text-primary focus-visible:ring-text-primary flex h-9 shrink-0 items-center gap-2 rounded-md border px-3 text-sm transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{t("command.trigger")}</span>
            <kbd className="border-border-hairline bg-surface-elevated hidden rounded border px-1.5 font-mono text-xs sm:inline">
              ⌘K
            </kbd>
          </button>
        </div>

        <main className="min-w-0 flex-1">{children}</main>

        <TelemetryFooter />
      </div>

      <CommandPalette
        open={commandOpen}
        onOpenChange={setCommandOpen}
        projectId={projectId}
        projects={projects}
      />
    </div>
  );
}

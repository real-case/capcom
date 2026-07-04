"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronRight, Search } from "lucide-react";

import { Link, usePathname } from "@/i18n/navigation";

import { SECTIONS } from "../model/sections";
import { CommandPalette } from "./CommandPalette";
import { SidebarNav } from "./SidebarNav";

/**
 * The project-scoped product shell (ADR 0065 widget). A persistent sidebar of the
 * analytics sections, a breadcrumb of the current context, and a ⌘K command palette
 * frame the analysis surfaces — replacing the PR-2 dashed placeholder and thin header.
 * It sits below the app-wide top bar (brand / theme / sign-out live there), so the
 * shell owns navigation only. Presentational chrome: every value (project / org names,
 * the project list for switching) arrives as props from the RLS-scoped Server Component
 * that renders it (ADR 0083); the shell fetches nothing. Colors are semantic tokens
 * (ADR 0058); the sidebar collapses below `md`, where the palette carries navigation.
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
    <div className="flex min-h-full">
      <aside className="hidden w-60 shrink-0 flex-col gap-2 border-r border-border px-3 py-4 md:flex">
        <p className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("sidebar.sectionsLabel")}
        </p>
        <SidebarNav projectId={projectId} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
          <nav
            aria-label={t("breadcrumb.label")}
            className="flex min-w-0 items-center gap-1.5 text-sm"
          >
            <Link
              href="/p"
              className="hidden shrink-0 text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              {t("breadcrumb.workspaces")}
            </Link>
            <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:inline" />
            <span className="hidden shrink-0 text-muted-foreground sm:inline">
              {orgName}
            </span>
            <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground sm:inline" />
            <Link
              href={`/p/${projectId}`}
              className="truncate font-medium text-foreground"
            >
              {projectName}
            </Link>
            {current && current.key !== "overview" && (
              <>
                <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />
                <span className="truncate text-muted-foreground">
                  {t(`nav.${current.key}`)}
                </span>
              </>
            )}
          </nav>

          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            aria-label={t("command.openHint")}
            className="flex h-9 shrink-0 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Search className="size-4" />
            <span className="hidden sm:inline">{t("command.trigger")}</span>
            <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-xs sm:inline">
              ⌘K
            </kbd>
          </button>
        </div>

        <main className="min-w-0 flex-1">{children}</main>
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

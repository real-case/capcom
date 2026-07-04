"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

import { SECTIONS, sectionHref } from "../model/sections";

/**
 * The shell's primary navigation (ADR 0065 widget internal). One link per analytics
 * section (the ADR 0083 surfaces), derived from the section registry so the sidebar,
 * breadcrumb, and ⌘K palette stay in lockstep. Active state is read from the locale-
 * stripped pathname (next-intl `usePathname`), so no selection state is mirrored
 * (ADR 0026) — overview matches exactly, every other section by prefix so a nested
 * route keeps its parent highlighted. Colors are semantic tokens only (ADR 0058).
 */
export function SidebarNav({ projectId }: { projectId: string }) {
  const t = useTranslations("AppShell");
  const pathname = usePathname();

  return (
    <nav aria-label={t("sidebar.primaryNav")} className="flex flex-col gap-1">
      {SECTIONS.map(({ key, segment, Icon }) => {
        const href = sectionHref(projectId, segment);
        const active =
          pathname === href ||
          (key !== "overview" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={key}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            {t(`nav.${key}`)}
          </Link>
        );
      })}
    </nav>
  );
}

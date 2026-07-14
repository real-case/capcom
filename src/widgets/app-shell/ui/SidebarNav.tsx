"use client";

import { useTranslations } from "next-intl";

import { Link, usePathname } from "@/i18n/navigation";
import { NavItem } from "@/components/ui/nav-item";

import { SECTIONS, sectionHref } from "../model/sections";

/**
 * The shell's primary navigation (ADR 0065 widget internal). One link per analytics section
 * (the ADR 0083 surfaces), derived from the section registry so the sidebar, breadcrumb, and
 * ⌘K palette stay in lockstep. Each row is the mission-control `NavItem` primitive (ADR
 * 0099/0081) rendered `asChild` over the i18n `Link`, so routing stays in the widget and the
 * active surface/aria-current live in the primitive. Active state is read from the locale-
 * stripped pathname (next-intl `usePathname`), so no selection state is mirrored (ADR 0026) —
 * overview matches exactly, every other section by prefix so a nested route keeps its parent
 * highlighted.
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
          <NavItem key={key} asChild active={active}>
            <Link href={href}>
              <Icon />
              {t(`nav.${key}`)}
            </Link>
          </NavItem>
        );
      })}
    </nav>
  );
}

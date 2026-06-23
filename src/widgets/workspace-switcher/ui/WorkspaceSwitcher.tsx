"use client";

import { useTranslations } from "next-intl";

import type { Organization } from "@/entities/organization";
import type { Project } from "@/entities/project";
import { usePathname, useRouter } from "@/i18n/navigation";

/**
 * Org/project switcher (ADR 0083 surface). A native, accessible `<select>`
 * grouped by organization — the rows it shows are already RLS-scoped by the
 * Server Component that fetched them, so the switcher only lists what the caller
 * may reach. Selecting a project navigates (locale-aware) to its route; the
 * current project is derived from the path, so no selection state is mirrored.
 */
export function WorkspaceSwitcher({
  organizations,
  projects,
}: {
  organizations: Organization[];
  projects: Project[];
}) {
  const t = useTranslations("Workspace");
  const router = useRouter();
  const pathname = usePathname();
  const currentProjectId = /^\/p\/([^/]+)/.exec(pathname)?.[1] ?? "";

  // Nothing to switch between — the workspace home covers the empty case.
  if (projects.length === 0) return null;

  // Only organizations that actually own a visible project get an optgroup.
  const orgsWithProjects = organizations.filter((org) =>
    projects.some((p) => p.organization_id === org.id),
  );

  return (
    <label className="flex items-center gap-2">
      <span className="sr-only">{t("switcher.label")}</span>
      <select
        value={currentProjectId}
        onChange={(event) => router.push(`/p/${event.target.value}`)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="" disabled>
          {t("switcher.placeholder")}
        </option>
        {orgsWithProjects.map((org) => (
          <optgroup key={org.id} label={org.name}>
            {projects
              .filter((p) => p.organization_id === org.id)
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}

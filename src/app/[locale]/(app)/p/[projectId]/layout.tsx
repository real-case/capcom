import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { fetchOrganization } from "@/entities/organization";
import { fetchProject, fetchProjects } from "@/entities/project";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { AppShell } from "@/widgets/app-shell";

/**
 * Project-scoped layout (ADR 0065/0083) — the composition root for the product shell.
 * The project is resolved as the signed-in user under RLS, so a project in another
 * tenant simply isn't returned and resolves to a 404 (no existence leaked), the same
 * guard every analysis route already applies. The org name and the caller's project
 * list (for ⌘K switching) are RLS-scoped reads too, so the shell renders only what the
 * membership join allows. The presentational `AppShell` widget receives them as props
 * and wraps every project route — overview, trends, funnels, retention, segments,
 * dashboards, and the AI query.
 */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await getServerClient();
  const user = await getCurrentUser();
  if (!user) notFound();

  const project = await fetchProject(supabase, projectId);
  // Hidden by RLS or genuinely absent — both surface identically, leaking nothing.
  if (!project) notFound();

  const [organization, projects] = await Promise.all([
    fetchOrganization(supabase, project.organization_id),
    fetchProjects(supabase),
  ]);

  return (
    <AppShell
      projectId={projectId}
      projectName={project.name}
      orgName={organization?.name ?? ""}
      projects={projects.map((p) => ({ id: p.id, name: p.name }))}
    >
      {children}
    </AppShell>
  );
}

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { fetchMyMemberships } from "@/entities/membership";
import { fetchOrganization } from "@/entities/organization";
import { fetchProject } from "@/entities/project";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { ProjectHub } from "@/widgets/app-shell";

/**
 * Project overview (ADR 0083) — the project's home inside the shell. The project is
 * fetched as the signed-in user under RLS, so a project in another tenant simply isn't
 * returned and resolves to a 404 (no existence leaked). It reads the org name and the
 * caller's role for the context header, then hands off to the `ProjectHub` widget for
 * the designed grid of analysis surfaces — replacing the PR-2 dashed-border placeholder.
 */
export default async function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("ProjectOverview");
  const tRoles = await getTranslations("Roles");

  const supabase = await getServerClient();
  const user = await getCurrentUser();
  if (!user) notFound();

  const project = await fetchProject(supabase, projectId);
  // Hidden by RLS or genuinely absent — both surface identically, leaking nothing.
  if (!project) notFound();

  const [organization, memberships] = await Promise.all([
    fetchOrganization(supabase, project.organization_id),
    fetchMyMemberships(supabase, user.id),
  ]);
  const role = memberships.find(
    (m) => m.organization_id === project.organization_id,
  )?.role;

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {project.name}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <span>{organization?.name ?? "—"}</span>
        {role ? (
          <>
            <span aria-hidden="true">·</span>
            <Badge variant="outline" aria-label={t("yourRole")}>
              {tRoles(role)}
            </Badge>
          </>
        ) : null}
      </div>

      <p className="mt-8 text-sm text-muted-foreground">{t("lead")}</p>
      <div className="mt-4">
        <ProjectHub projectId={projectId} />
      </div>
    </div>
  );
}

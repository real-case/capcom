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
import { OverviewDashboard } from "@/widgets/overview-dashboard";

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
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10">
      <div>
        <h1 className="text-text-primary text-2xl font-semibold tracking-tight">
          {project.name}
        </h1>
        <div className="text-text-secondary mt-2 flex flex-wrap items-center gap-2 text-sm">
          <span>{organization?.name ?? "—"}</span>
          {role ? (
            <>
              <span aria-hidden="true">·</span>
              {/* shadcn Badge themed THROUGH the mission-control surface at the call site
                  (never forked, ADR 0099) — the console chrome consumes --text/--border
                  tokens, never the shadcn value layer. */}
              <Badge
                variant="outline"
                aria-label={t("yourRole")}
                className="border-border-hairline text-text-secondary"
              >
                {tRoles(role)}
              </Badge>
            </>
          ) : null}
        </div>
      </div>

      {/* The curated Overview bento — the first-class console home (ADR 0099), distinct
          from the user-composed dashboards of ADR 0090. */}
      <OverviewDashboard projectId={projectId} />

      {/* The analysis-navigation hub is retained below as an "Explore" section. */}
      <div>
        <h2 className="text-text-primary text-lg font-semibold tracking-tight">
          {t("exploreHeading")}
        </h2>
        <p className="text-text-secondary mt-1 mb-4 text-sm">{t("lead")}</p>
        <ProjectHub projectId={projectId} />
      </div>
    </div>
  );
}

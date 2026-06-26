import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import { fetchMyMemberships } from "@/entities/membership";
import { fetchOrganization } from "@/entities/organization";
import { fetchProject } from "@/entities/project";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";

/**
 * Project overview (ADR 0083) — the end-to-end proof that a scoped read works:
 * the project is fetched as the signed-in user under RLS, so a project in another
 * tenant simply isn't returned and resolves to a 404 (no existence is leaked).
 * It also reads the org name and the caller's role for the same project — three
 * RLS-scoped reads on three tables. The product surfaces (trends, funnels, …)
 * compose into this route in later slices.
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
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {project.name}
      </h1>

      <dl className="mt-6 grid grid-cols-[max-content_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-muted-foreground">{t("organization")}</dt>
        <dd className="text-foreground">{organization?.name ?? "—"}</dd>
        <dt className="text-muted-foreground">{t("yourRole")}</dt>
        <dd>{role ? <Badge variant="outline">{tRoles(role)}</Badge> : "—"}</dd>
      </dl>

      <div className="mt-10 rounded-lg border border-dashed border-border p-6">
        <h2 className="font-medium text-foreground">{t("placeholderTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {t("placeholderBody")}
        </p>
        <Link
          href={`/p/${projectId}/trends`}
          className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {t("openTrends")}
        </Link>
      </div>
    </div>
  );
}

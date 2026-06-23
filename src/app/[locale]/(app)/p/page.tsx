import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { fetchMyMemberships } from "@/entities/membership";
import { fetchOrganizations } from "@/entities/organization";
import { fetchProjects } from "@/entities/project";
import { Link } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Workspace home (ADR 0083). Lists the organizations the signed-in member can
 * reach, each with their role and its projects — all RLS-scoped server-side, so
 * the page renders only what the membership join allows. A member of nothing sees
 * the empty state (e.g. a just-signed-up user).
 */
export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Workspace");
  const tRoles = await getTranslations("Roles");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [organizations, projects, memberships] = await Promise.all([
    fetchOrganizations(supabase),
    fetchProjects(supabase),
    user ? fetchMyMemberships(supabase, user.id) : Promise.resolve([]),
  ]);

  if (organizations.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2 px-6 py-24 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          {t("empty.title")}
        </h1>
        <p className="text-muted-foreground">{t("empty.body")}</p>
      </div>
    );
  }

  const roleByOrg = new Map(
    memberships.map((m) => [m.organization_id, m.role]),
  );

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("home.title")}
      </h1>
      <p className="mt-1 text-muted-foreground">{t("home.lead")}</p>

      <ul className="mt-8 flex flex-col gap-6">
        {organizations.map((org) => {
          const role = roleByOrg.get(org.id);
          const orgProjects = projects.filter(
            (p) => p.organization_id === org.id,
          );
          return (
            <li key={org.id} className="rounded-lg border border-border p-4">
              <div className="flex items-center gap-2">
                <h2 className="font-medium text-foreground">{org.name}</h2>
                {role ? <Badge variant="outline">{tRoles(role)}</Badge> : null}
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {orgProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/p/${p.id}`}
                      className="text-sm text-foreground underline-offset-4 hover:underline"
                    >
                      {p.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

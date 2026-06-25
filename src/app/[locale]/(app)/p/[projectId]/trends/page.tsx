import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { TrendsExplorer } from "@/widgets/trends-explorer";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { fetchProject } from "@/entities/project";

/**
 * Trends route (PR-4) — the first flagship aggregation surface. The project is
 * resolved as the signed-in user under RLS, so a project in another tenant simply
 * isn't returned and resolves to a 404 (no existence leaked), mirroring the overview
 * page. The interactive explorer (client) reads its state from the URL (nuqs) and
 * calls the in-database aggregations under the caller's RLS (ADR 0084).
 */
export default async function TrendsPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Trends");

  const supabase = await getServerClient();
  const user = await getCurrentUser();
  if (!user) notFound();

  const project = await fetchProject(supabase, projectId);
  // Hidden by RLS or genuinely absent — both surface identically, leaking nothing.
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <TrendsExplorer projectId={projectId} />
    </div>
  );
}

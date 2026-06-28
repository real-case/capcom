import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { DashboardManager } from "@/widgets/dashboard";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { fetchProject } from "@/entities/project";

/**
 * Route-level metadata (ADR 0031): the localized "Dashboards" title, wrapped by the
 * locale layout's title template for tabs, shares, and search previews.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Dashboards" });
  return { title: t("title") };
}

/**
 * Dashboards route (PR-8) — the saved-analysis surface: members create/rename/delete
 * reports and compose them onto dashboards (Server Actions + optimistic mutations,
 * ADR 0020/0025/0090). The project is resolved as the signed-in user under RLS, so a
 * project in another tenant isn't returned and resolves to a 404 (no existence leaked),
 * mirroring the trends/funnels/retention/segments pages. The interactive manager (client)
 * reads the project's saved analyses and runs the write actions under the caller's RLS —
 * a viewer's write is rejected server-side and rolled back (ADR 0083/0090).
 */
export default async function DashboardsPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Dashboards");

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
      <DashboardManager projectId={projectId} />
    </div>
  );
}

import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { RetentionGrid } from "@/widgets/retention-grid";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { fetchProject } from "@/entities/project";

/**
 * Route-level metadata (ADR 0031): the localized "Retention" title, which the locale
 * layout's title template wraps (e.g. "Retention · CAPCOM — Product Analytics") for
 * tabs, shares, and search previews — instead of inheriting the generic layout title.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Retention" });
  return { title: t("title") };
}

/**
 * Retention route (PR-6) — the third flagship aggregation surface, the signature cohort
 * heatmap. The project is resolved as the signed-in user under RLS, so a project in
 * another tenant simply isn't returned and resolves to a 404 (no existence leaked),
 * mirroring the trends and funnels pages. The interactive grid (client) reads its state
 * from the URL (nuqs) and calls the in-database `fn_retention` aggregation under the
 * caller's RLS (ADR 0084/0088).
 */
export default async function RetentionPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Retention");

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
      <RetentionGrid projectId={projectId} />
    </div>
  );
}

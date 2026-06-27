import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SegmentBuilder } from "@/widgets/segment-builder";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { fetchProject } from "@/entities/project";

/**
 * Route-level metadata (ADR 0031): the localized "Segments" title, which the locale
 * layout's title template wraps (e.g. "Segments · CAPCOM — Product Analytics") for tabs,
 * shares, and search previews — instead of inheriting the generic layout title.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "Segments" });
  return { title: t("title") };
}

/**
 * Segments route (PR-7) — the fourth flagship aggregation surface: a user-authored rule
 * (attribute + behavioural predicates) sized and broken down by the in-database segment
 * functions. The project is resolved as the signed-in user under RLS, so a project in
 * another tenant simply isn't returned and resolves to a 404 (no existence leaked),
 * mirroring the trends/funnels/retention pages. The interactive builder (client) reads its
 * state from the URL (nuqs) and calls the `SECURITY INVOKER` segment RPCs under the
 * caller's RLS (ADR 0084/0089).
 */
export default async function SegmentsPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("Segments");

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
      <SegmentBuilder projectId={projectId} />
    </div>
  );
}

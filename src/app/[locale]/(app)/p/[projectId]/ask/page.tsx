import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { AiQueryManager } from "@/features/ai-query";
import { routing } from "@/i18n/routing";
import { isAiConfigured } from "@/lib/ai";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { fetchProject } from "@/entities/project";

/**
 * Route-level metadata (ADR 0031): the localized "Ask with AI" title, wrapped by
 * the locale layout's title template.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};
  const t = await getTranslations({ locale, namespace: "AiQuery" });
  return { title: t("title") };
}

/**
 * AI natural-language query route (PR-9, ADR 0091) — a prompt is translated
 * server-side into a closed, Zod-validated query-spec that deep-links to one of the
 * existing analysis surfaces. The project is resolved as the signed-in user under
 * RLS, so a project in another tenant isn't returned and resolves to a 404 (no
 * existence leaked), mirroring the other product pages. Whether the live model is
 * configured is read server-side (`isAiConfigured`, behind the server-only fence,
 * ADR 0018) and passed to the client manager as the banner state; without a key the
 * feature falls back to its deterministic offline interpreter and never crashes.
 */
export default async function AskPage({
  params,
}: {
  params: Promise<{ locale: string; projectId: string }>;
}) {
  const { locale, projectId } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const t = await getTranslations("AiQuery");

  const supabase = await getServerClient();
  const user = await getCurrentUser();
  if (!user) notFound();

  const project = await fetchProject(supabase, projectId);
  // Hidden by RLS or genuinely absent — both surface identically, leaking nothing.
  if (!project) notFound();

  return (
    <div className="mx-auto w-full max-w-3xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold tracking-tight text-foreground">
        {t("title")}
      </h1>
      <AiQueryManager projectId={projectId} aiConfigured={isAiConfigured()} />
    </div>
  );
}

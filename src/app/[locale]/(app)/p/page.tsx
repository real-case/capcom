import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { fetchOverviewKpis, fetchOverviewSignal } from "@/entities/event";
import { fetchMyMemberships } from "@/entities/membership";
import { fetchOrganizations } from "@/entities/organization";
import { fetchProjects } from "@/entities/project";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import {
  lastActiveDaysAgo,
  WorkspaceLauncher,
  type LauncherCopy,
  type LauncherOrg,
  type LauncherProject,
} from "@/widgets/workspace-launcher";

const DAY_MS = 86_400_000;
const WINDOW_DAYS = 30;

/**
 * Workspace launcher (ADR 0083/0101 Phase 3). Lists the organizations the signed-in member can
 * reach as a grid of project launcher cards — each with a headline metric, sparkline, role, and
 * activity — all RLS-scoped server-side, so the page renders only what the membership join
 * allows (a member of nothing sees the empty state). This is the composition root: it fetches
 * and localizes, then hands already-reduced rows to the presentational `WorkspaceLauncher`.
 *
 * The per-project metrics come from the EXISTING `SECURITY INVOKER` aggregations
 * (`fn_overview_kpis` / `fn_overview_signal`, ADR 0084) over one trailing 30-day window — no
 * new SQL, no app-side aggregation. Each project's two RPCs are one `Promise.all` pair, and the
 * pairs are fanned out with `Promise.allSettled` so a single project's RPC failure degrades that
 * one card (`status: "error"`) instead of throwing the whole page into the app error boundary —
 * which matters because `/p` is the landing pad of every auth path, including the one-click demo.
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

  const supabase = await getServerClient();
  const user = await getCurrentUser();

  const [organizations, projects, memberships] = await Promise.all([
    fetchOrganizations(supabase),
    fetchProjects(supabase),
    user ? fetchMyMemberships(supabase, user.id) : Promise.resolve([]),
  ]);

  // One trailing 30-day window, `to` floored to the next UTC midnight so the span is stable
  // within a day. The equal-length previous window (for the delta) is computed in SQL by
  // fn_overview_kpis (its `_prev` columns) — this route only bounds the current `[from, to)`.
  const now = new Date();
  const toMidnight = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() + 1,
  );
  const from = new Date(toMidnight - WINDOW_DAYS * DAY_MS).toISOString();
  const to = new Date(toMidnight).toISOString();

  // One RPC PAIR per project, fanned out. Promise.all inside makes a pair reject if EITHER
  // RPC fails; Promise.allSettled outside keeps one project's failure from rejecting the page.
  const settled = await Promise.allSettled(
    projects.map((project) =>
      Promise.all([
        fetchOverviewKpis(supabase, {
          p_project_id: project.id,
          p_from: from,
          p_to: to,
        }),
        fetchOverviewSignal(supabase, {
          p_project_id: project.id,
          p_from: from,
          p_to: to,
          p_interval: "day",
        }),
      ]),
    ),
  );

  const activityLabel = (signal: Parameters<typeof lastActiveDaysAgo>[0]) => {
    const days = lastActiveDaysAgo(signal, now);
    return days === null ? t("noActivity") : t("activity", { days });
  };

  // A project is "ok" ONLY when both RPCs fulfilled — a resolved kpis row beside a rejected
  // signal must not render, or the card would assert "no activity" about unknown activity.
  const projectVM = new Map<string, LauncherProject>(
    projects.map((project, i) => {
      const result = settled[i]!;
      const vm: LauncherProject =
        result.status === "fulfilled"
          ? {
              id: project.id,
              name: project.name,
              status: "ok",
              kpis: result.value[0],
              signal: result.value[1],
              activityLabel: activityLabel(result.value[1]),
            }
          : { id: project.id, name: project.name, status: "error" };
      return [project.id, vm];
    }),
  );

  const roleByOrg = new Map(
    memberships.map((m) => [m.organization_id, m.role]),
  );

  const orgs: LauncherOrg[] = organizations.map((org) => {
    const role = roleByOrg.get(org.id);
    return {
      id: org.id,
      name: org.name,
      roleLabel: role ? tRoles(role) : null,
      projects: projects
        .filter((p) => p.organization_id === org.id)
        .map((p) => projectVM.get(p.id)!),
    };
  });

  const copy: LauncherCopy = {
    title: t("home.title"),
    lead: t("home.lead"),
    metricLabel: t("metric.label"),
    windowLabel: t("metric.window"),
    deltaCaption: t("metric.deltaCaption"),
    noProjects: t("noProjects"),
    cardError: t("cardError"),
    empty: { title: t("empty.title"), body: t("empty.body") },
  };

  return <WorkspaceLauncher orgs={orgs} copy={copy} locale={locale} />;
}

import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { fetchOrganizations } from "@/entities/organization";
import { fetchProjects } from "@/entities/project";
import { SignOutButton } from "@/features/auth-by-email";
import { ThemeToggle } from "@/features/theme";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser, getServerClient } from "@/lib/supabase/server";
import { WorkspaceSwitcher } from "@/widgets/workspace-switcher";

/**
 * Protected shell for the authenticated app (ADR 0016). The guard runs on the
 * server before any child renders: no user → redirect to sign-in. The header
 * composes the workspace switcher (a widget) and sign-out (a feature) — this is
 * the FSD composition root (`src/app` consumes widgets/features). The org/project
 * lists are fetched here as the signed-in user, so they are already RLS-scoped
 * (ADR 0083) before they reach the switcher.
 */
export default async function AppLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await getServerClient();
  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
    return null; // unreachable (redirect throws); narrows `user` for the rest.
  }

  const [organizations, projects] = await Promise.all([
    fetchOrganizations(supabase),
    fetchProjects(supabase),
  ]);
  const t = await getTranslations("AppShell");
  const tTheme = await getTranslations("Theme");

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-border px-6 py-3">
        <div className="flex items-center gap-4">
          <Link
            href="/p"
            className="text-sm font-semibold tracking-tight text-foreground"
          >
            {t("brand")}
          </Link>
          <WorkspaceSwitcher
            organizations={organizations}
            projects={projects}
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-muted-foreground sm:inline">
            {t("signedInAs", { email: user.email ?? "" })}
          </span>
          <ThemeToggle label={tTheme("toggle")} />
          <SignOutButton />
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

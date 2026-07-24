import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";

import { SignOutButton } from "@/features/auth-by-email";
import { ThemeToggle } from "@/features/theme";
import { Link, redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Protected shell for the authenticated app (ADR 0016). The guard runs on the server
 * before any child renders: no user → redirect to sign-in. This layer is now only the
 * app-wide top bar — brand, signed-in identity, theme, and sign-out — shared by the
 * workspace home (`/p`) and every project route. The project-scoped chrome (sidebar,
 * breadcrumb, ⌘K palette) lives one level down in the project layout's `AppShell`, where
 * the project context is known (ADR 0065). This is the FSD composition root: `src/app`
 * consumes the `theme` / `auth-by-email` features.
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

  const user = await getCurrentUser();
  if (!user) {
    redirect({ href: "/sign-in", locale });
    return null; // unreachable (redirect throws); narrows `user` for the rest.
  }

  const t = await getTranslations("AppShell");
  const tTheme = await getTranslations("Theme");

  return (
    <div className="flex min-h-full flex-col bg-surface-background text-text-primary">
      <header className="flex items-center justify-between gap-4 border-b border-border-hairline px-6 py-3">
        <Link
          href="/p"
          className="text-sm font-semibold tracking-tight text-text-primary"
        >
          {t("brand")}
        </Link>
        <div className="flex items-center gap-3">
          <span className="hidden text-sm text-text-secondary sm:inline">
            {t("signedInAs", { email: user.email ?? "" })}
          </span>
          <ThemeToggle label={tTheme("toggle")} />
          <SignOutButton />
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}

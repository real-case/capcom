import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { Panel } from "@/components/ui/panel";
import { SignUpForm } from "@/features/auth-by-email";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Public sign-up route (ADR 0016). Mirrors sign-in: reachable signed-out, and an
 * already-authenticated visitor is redirected to the workspace home. Mission-control
 * surface (ADR 0101) — the demo one-click path lives on sign-in; here it is account
 * creation only. Semantic tokens only (0058).
 */
export default async function SignUpPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect({ href: "/p", locale });

  const t = await getTranslations("Auth");

  return (
    <main className="flex flex-1 flex-col items-center justify-center bg-surface-background px-6 py-16">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-2">
          <span
            className="size-1.5 rounded-full bg-status-nominal-fg motion-safe:animate-pulse"
            aria-hidden="true"
          />
          <span className="font-mono text-xs tracking-[0.2em] text-text-secondary uppercase">
            {t("demo.badge")}
          </span>
        </div>

        <Panel surface="panel" className="flex flex-col gap-6 p-8">
          <div className="flex flex-col gap-1.5 text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
              {t("signUp.title")}
            </h1>
          </div>

          <SignUpForm />
        </Panel>
      </div>
    </main>
  );
}

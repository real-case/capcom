import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

import { SignUpForm } from "@/features/auth-by-email";
import { redirect } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { createClient } from "@/lib/supabase/server";

/**
 * Public sign-up route (ADR 0016). Mirrors sign-in: reachable signed-out, and an
 * already-authenticated visitor is redirected to the workspace home.
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
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">
        {t("signUp.title")}
      </h1>
      <SignUpForm />
    </main>
  );
}

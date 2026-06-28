import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale, NextIntlClientProvider } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import "../globals.css";

import { buildAlternates } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";

import { Providers } from "../providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

type LocaleParams = { locale: string };

// Pre-render every configured locale at build time (ADR 0030). One param
// today; adding a locale needs no change here.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: "Metadata" });
  const alternates = buildAlternates(locale, "/");

  return {
    // Absolute base for every relative URL below — validated at build time by
    // the ADR 0018 env module. Canonical/`hreflang` paths resolve against it.
    metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
    title: { default: t("title"), template: `%s · ${t("title")}` },
    description: t("description"),
    // Canonical + per-locale alternates derived from the locale config (0031).
    alternates,
    // Shared social-card defaults live in the root layout and are overridden
    // per route as pages add their own metadata (ADR 0031).
    openGraph: {
      type: "website",
      siteName: t("title"),
      title: t("title"),
      description: t("description"),
      locale,
      url: alternates.canonical ?? undefined,
      // Static OG card, resolved against metadataBase (ADR 0031). A committed asset
      // rather than a dynamic next/og route (that would be its own decision).
      images: [{ url: "/og.png", width: 1200, height: 630, alt: t("title") }],
    },
    twitter: {
      card: "summary_large_image",
      title: t("title"),
      description: t("description"),
      images: ["/og.png"],
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<LocaleParams>;
}>) {
  const { locale } = await params;
  // The `[locale]` segment also catches unknown paths, so guard explicitly.
  if (!hasLocale(routing.locales, locale)) notFound();
  // Opt this request into static rendering before any next-intl hook runs.
  setRequestLocale(locale);

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* v4 inherits locale + messages from the request config (0030).
            Providers adds the client state buckets — TanStack Query + nuqs
            (0025, 0027) — inside the intl provider. */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

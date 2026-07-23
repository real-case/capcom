import type { Metadata } from "next";
import { hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { DemoSignInManager } from "@/features/auth-by-email";
import { buildAlternates } from "@/i18n/metadata";
import { routing } from "@/i18n/routing";
import { env } from "@/lib/env";
import {
  buildLandingJsonLd,
  LandingPage,
  type LandingCopy,
  MotionPolicy,
} from "@/widgets/landing";

type LocaleParams = { locale: string };

/**
 * Home route metadata (ADR 0031): a landing-specific description overriding the layout
 * default, plus canonical/`hreflang` alternates derived from the locale config (ADR 0030).
 * The shared OG/Twitter card + `metadataBase` live in the root layout.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<LocaleParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const t = await getTranslations({ locale, namespace: "Landing" });
  return {
    description: t("metaDescription"),
    alternates: buildAlternates(locale, "/"),
  };
}

/**
 * Public landing route — a thin RSC container (ADR 0065): it reads the `Landing`
 * namespace (ADR 0030), assembles the typed copy object, emits JSON-LD structured data
 * (ADR 0031), and mounts the presentational `<LandingPage>` from the landing widget —
 * injecting the one-click `DemoSignInManager` as its `demoSlot` (ADR 0101), so the widget
 * stays free of the server-action chain. All markup/token discipline lives in the widget;
 * this file is coverage-excluded (route).
 */
export default async function Home({
  params,
}: {
  params: Promise<LocaleParams>;
}) {
  const { locale } = await params;
  // The [locale] layout already 404s unknown locales; narrow before enabling static
  // rendering so next-intl hooks read against a valid locale (ADR 0030).
  if (hasLocale(routing.locales, locale)) setRequestLocale(locale);

  const t = await getTranslations("Landing");

  const copy: LandingCopy = {
    hero: {
      eyebrow: t("hero.eyebrow"),
      title: t("hero.title"),
      tagline: t("hero.tagline"),
      lead: t("hero.lead"),
      primaryCta: t("hero.primaryCta"),
      secondaryCta: t("hero.secondaryCta"),
    },
    surfaces: {
      heading: t("surfaces.heading"),
      lead: t("surfaces.lead"),
      items: {
        trends: {
          title: t("surfaces.trends.title"),
          body: t("surfaces.trends.body"),
        },
        funnels: {
          title: t("surfaces.funnels.title"),
          body: t("surfaces.funnels.body"),
        },
        retention: {
          title: t("surfaces.retention.title"),
          body: t("surfaces.retention.body"),
        },
        segments: {
          title: t("surfaces.segments.title"),
          body: t("surfaces.segments.body"),
        },
        dashboards: {
          title: t("surfaces.dashboards.title"),
          body: t("surfaces.dashboards.body"),
        },
        ai: { title: t("surfaces.ai.title"), body: t("surfaces.ai.body") },
      },
    },
    demo: {
      heading: t("demo.heading"),
      lead: t("demo.lead"),
      note: t("demo.note"),
    },
    methodology: {
      heading: t("methodology.heading"),
      lead: t("methodology.lead"),
      items: {
        adr: {
          title: t("methodology.adr.title"),
          body: t("methodology.adr.body"),
        },
        rls: {
          title: t("methodology.rls.title"),
          body: t("methodology.rls.body"),
        },
        sql: {
          title: t("methodology.sql.title"),
          body: t("methodology.sql.body"),
        },
        tokens: {
          title: t("methodology.tokens.title"),
          body: t("methodology.tokens.body"),
        },
        tests: {
          title: t("methodology.tests.title"),
          body: t("methodology.tests.body"),
        },
      },
    },
    footer: {
      tagline: t("footer.tagline"),
      navLabel: t("footer.navLabel"),
      repo: t("footer.repo"),
      roadmap: t("footer.roadmap"),
      methodology: t("footer.methodology"),
      license: t("footer.license"),
      builtOn: t("footer.builtOn"),
    },
  };

  const jsonLd = buildLandingJsonLd(env.NEXT_PUBLIC_SITE_URL, copy);

  return (
    <>
      {/* JSON-LD structured data (ADR 0031) — our own static payload; the Metadata API
          does not model it, so it is rendered here. `<` is escaped so the serialized
          JSON can never close the script element early. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <MotionPolicy>
        <LandingPage copy={copy} demoSlot={<DemoSignInManager />} />
      </MotionPolicy>
    </>
  );
}

import type { LandingCopy } from "./content";

/**
 * JSON-LD structured data (schema.org) for the public landing (ADR 0031).
 *
 * Pure: takes the absolute site origin (from `env.NEXT_PUBLIC_SITE_URL`, resolved by the
 * route) plus the assembled copy, and returns the graph the route serializes into a
 * `<script type="application/ld+json">`. The Metadata API does not model JSON-LD, so it is
 * rendered in the page; keeping the builder pure makes it unit-testable in isolation.
 */
export type JsonLdGraph = {
  readonly "@context": "https://schema.org";
  readonly "@graph": readonly Record<string, unknown>[];
};

/** Strip any trailing slash so `${origin}/…` never doubles up. */
function toOrigin(siteUrl: string): string {
  return siteUrl.replace(/\/+$/, "");
}

export function buildLandingJsonLd(
  siteUrl: string,
  copy: LandingCopy,
): JsonLdGraph {
  const origin = toOrigin(siteUrl);
  const url = `${origin}/`;

  const website = {
    "@type": "WebSite",
    "@id": `${origin}/#website`,
    url,
    name: copy.hero.title,
    description: copy.hero.tagline,
  };

  const application = {
    "@type": "SoftwareApplication",
    "@id": `${origin}/#app`,
    name: copy.hero.title,
    description: copy.hero.tagline,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url,
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return { "@context": "https://schema.org", "@graph": [website, application] };
}

/**
 * Fixed (non-translatable) structure + data for the landing widget (ADR 0065).
 *
 * Copy itself comes from the `Landing` i18n namespace (ADR 0030/0055); this module
 * holds only what is *not* translatable: the surface-id list the showcase iterates,
 * the methodology-item keys, the seeded demo accounts a visitor can sign in with, and
 * the outbound repository URLs. Keeping these out of the copy keeps the catalog free of
 * structural noise and lets the presentational components stay pure (props in).
 */

/** The six analytics surfaces the demo showcases, in display order. */
export const SURFACE_IDS = [
  "trends",
  "funnels",
  "retention",
  "segments",
  "dashboards",
  "ai",
] as const;
export type SurfaceId = (typeof SURFACE_IDS)[number];

/** The "behind the scenes" methodology pillars, in display order. */
export const METHODOLOGY_KEYS = [
  "adr",
  "rls",
  "sql",
  "tokens",
  "tests",
] as const;
export type MethodologyKey = (typeof METHODOLOGY_KEYS)[number];

/** Outbound links to the source repository (the artifact this demo is about). */
export const REPO_URL = "https://github.com/real-case/capcom";
export const ROADMAP_URL = `${REPO_URL}/blob/main/docs/capcom/roadmap.md`;
export const METHODOLOGY_URL = `${REPO_URL}/blob/main/docs/03-methodology.md`;
export const LICENSE_URL = `${REPO_URL}/blob/main/LICENSE`;
export const STARTER_URL =
  "https://github.com/real-case/claude-code-nextjs-starter";

/** In-page anchor for the "behind the scenes" section (the hero secondary CTA target). */
export const METHODOLOGY_ANCHOR = "behind-the-scenes";

// ── Copy shape ──────────────────────────────────────────────────────────────
// Assembled by the route from the `Landing` (and `Roles`) namespace and passed to the
// pure presentational components. The unit test/story pass a fixture of this shape.

export type SurfaceCopy = { readonly title: string; readonly body: string };
export type MethodologyItemCopy = {
  readonly title: string;
  readonly body: string;
};

export type LandingCopy = {
  readonly hero: {
    readonly eyebrow: string;
    readonly title: string;
    readonly tagline: string;
    readonly lead: string;
    readonly primaryCta: string;
    readonly secondaryCta: string;
  };
  readonly surfaces: {
    readonly heading: string;
    readonly lead: string;
    readonly items: Readonly<Record<SurfaceId, SurfaceCopy>>;
  };
  readonly demo: {
    readonly heading: string;
    readonly lead: string;
    readonly note: string;
  };
  readonly methodology: {
    readonly heading: string;
    readonly lead: string;
    readonly items: Readonly<Record<MethodologyKey, MethodologyItemCopy>>;
  };
  readonly footer: {
    readonly tagline: string;
    readonly navLabel: string;
    readonly repo: string;
    readonly roadmap: string;
    readonly methodology: string;
    readonly license: string;
    readonly builtOn: string;
  };
};

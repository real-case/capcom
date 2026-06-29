import type { LandingCopy } from "../model/content";

import { DemoAccess } from "./DemoAccess";
import { Hero } from "./Hero";
import { MethodologyStrip } from "./MethodologyStrip";
import { SiteFooter } from "./SiteFooter";
import { SurfaceShowcase } from "./SurfaceShowcase";

/**
 * Public landing page (presentational, ADR 0065). Pure and props-in — no data fetching,
 * no async, no `"use client"` — so it renders zero client JS for fast first paint and
 * crawlability, unit-tests in jsdom, and snapshots deterministically in Storybook. The
 * route container (`src/app/[locale]/page.tsx`) reads the `Landing`/`Roles` namespaces,
 * assembles `copy`, and mounts this. All colors come from semantic tokens (ADR 0058).
 */
export function LandingPage({ copy }: { copy: LandingCopy }) {
  return (
    // Footer is a SIBLING of <main>, not nested inside it — a <footer> inside a
    // sectioning element is not a `contentinfo` landmark.
    <div className="flex flex-1 flex-col bg-background">
      <main className="flex-1">
        <Hero copy={copy.hero} />
        <SurfaceShowcase copy={copy.surfaces} />
        <DemoAccess copy={copy.demo} />
        <MethodologyStrip copy={copy.methodology} />
      </main>
      <SiteFooter copy={copy.footer} />
    </div>
  );
}

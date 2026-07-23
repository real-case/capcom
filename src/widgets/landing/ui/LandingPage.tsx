import type { ReactNode } from "react";

import type { LandingCopy } from "../model/content";

import { DemoAccess } from "./DemoAccess";
import { Hero } from "./Hero";
import { MethodologyStrip } from "./MethodologyStrip";
import { LandingMotion } from "./motion";
import { SiteFooter } from "./SiteFooter";
import { SurfaceShowcase } from "./SurfaceShowcase";

/**
 * Public landing page (presentational, ADR 0065). A Server Component that renders all its
 * copy into the SSR HTML for fast first paint and crawlability (ADR 0002); the premium
 * motion (ADR 0096) is layered as client "islands" via `LandingMotion` (a `LazyMotion`
 * context that renders no DOM element, so the `main` / `contentinfo` landmarks stay direct
 * siblings) and the per-section `Reveal` wrappers, which fall back to static, visible
 * content without JS or under reduced motion. The route container
 * (`src/app/[locale]/page.tsx`) reads the `Landing`/`Roles` namespaces, assembles `copy`,
 * wraps this in the `MotionPolicy`, and mounts it. All colours come from the mission-control
 * semantic tokens (ADR 0081/0058). The one-click demo sign-in is passed in as `demoSlot`
 * (the route injects the real `DemoSignInManager`; the story/test inject a local presentational
 * stub), keeping this widget free of the auth feature's server-action chain (ADR 0101).
 */
export function LandingPage({
  copy,
  demoSlot,
}: {
  copy: LandingCopy;
  demoSlot: ReactNode;
}) {
  return (
    // Footer is a SIBLING of <main>, not nested inside it — a <footer> inside a
    // sectioning element is not a `contentinfo` landmark.
    <div className="flex flex-1 flex-col bg-surface-background">
      <LandingMotion>
        <main className="flex-1">
          <Hero copy={copy.hero} />
          <SurfaceShowcase copy={copy.surfaces} />
          <DemoAccess copy={copy.demo}>{demoSlot}</DemoAccess>
          <MethodologyStrip copy={copy.methodology} />
        </main>
        <SiteFooter copy={copy.footer} />
      </LandingMotion>
    </div>
  );
}

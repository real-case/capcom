import type { ReactNode } from "react";

import type { LandingCopy } from "../model/content";

import { Reveal } from "./motion";

/**
 * "Try the live demo" block (presentational, Server Component). Frames the one-click demo
 * sign-in (ADR 0101): a visitor picks a seeded role and is signed straight in to watch RBAC
 * differ — the public password display is retired, so no credential is shown. The interactive
 * one-click cards arrive as `children` (the `demoSlot`), injected from outside so this widget
 * never imports the auth feature's server-action chain: the route passes the real
 * `DemoSignInManager`; the story/test pass a local presentational stub. Mission-control
 * semantic tokens only (ADR 0081/0058).
 */
export function DemoAccess({
  copy,
  children,
}: {
  copy: LandingCopy["demo"];
  children: ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-24">
      <Reveal className="relative">
        {/* Soft aurora glow framing the card (decorative, data-viz hues, token-only). */}
        <div
          aria-hidden="true"
          className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-viz-categorical-4/20 via-viz-categorical-2/10 to-transparent blur-md"
        />
        <div className="rounded-2xl border border-border-hairline bg-surface-panel p-8 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl">
            {copy.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-pretty text-text-secondary">
            {copy.lead}
          </p>

          {/* The one-click "Continue as …" cards (the injected demoSlot). */}
          <div className="mx-auto mt-8 w-full max-w-md text-left">
            {children}
          </div>

          <p className="mt-6 text-xs text-text-secondary">{copy.note}</p>
        </div>
      </Reveal>
    </section>
  );
}

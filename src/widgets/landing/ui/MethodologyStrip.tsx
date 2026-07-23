import {
  Database,
  GitBranch,
  Layers,
  type LucideIcon,
  ShieldCheck,
  TestTube,
} from "lucide-react";

import {
  METHODOLOGY_ANCHOR,
  METHODOLOGY_KEYS,
  type LandingCopy,
  type MethodologyKey,
} from "../model/content";

import { Reveal } from "./motion";

/** Decorative icon per methodology pillar — color inherits via currentColor. */
const METHODOLOGY_ICONS: Readonly<Record<MethodologyKey, LucideIcon>> = {
  adr: GitBranch,
  rls: ShieldCheck,
  sql: Database,
  tokens: Layers,
  tests: TestTube,
};

/**
 * "Behind the scenes" strip (presentational) — the engineering story that is the real
 * point of the demo: decisions-first ADRs, RLS isolation, in-database SQL, token/FSD
 * governance, the test pyramid. Carries the in-page anchor the hero secondary CTA jumps
 * to. Token-only colors (ADR 0058); icons are decorative.
 */
export function MethodologyStrip({
  copy,
}: {
  copy: LandingCopy["methodology"];
}) {
  return (
    <section
      id={METHODOLOGY_ANCHOR}
      aria-labelledby="methodology-heading"
      className="scroll-mt-8 border-t border-border-hairline"
    >
      <div className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2
            id="methodology-heading"
            className="text-3xl font-semibold tracking-tight text-text-primary sm:text-4xl"
          >
            {copy.heading}
          </h2>
          <p className="mt-3 text-base leading-7 text-pretty text-text-secondary">
            {copy.lead}
          </p>
        </Reveal>
        <ul className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {METHODOLOGY_KEYS.map((key, i) => {
            const Icon = METHODOLOGY_ICONS[key];
            const item = copy.items[key];
            return (
              <li key={key}>
                <Reveal delay={i * 0.05} className="flex gap-4">
                  <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-md bg-surface-elevated text-viz-categorical-4">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <h3 className="text-base font-medium text-text-primary">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm leading-6 text-pretty text-text-secondary">
                      {item.body}
                    </p>
                  </div>
                </Reveal>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

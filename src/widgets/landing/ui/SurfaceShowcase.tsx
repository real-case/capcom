import {
  Filter,
  Grid3x3,
  LayoutDashboard,
  type LucideIcon,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  SURFACE_IDS,
  type LandingCopy,
  type SurfaceId,
} from "../model/content";

import { Reveal } from "./motion";

/** Decorative icon per surface — color inherits from the text token via currentColor. */
const SURFACE_ICONS: Readonly<Record<SurfaceId, LucideIcon>> = {
  trends: TrendingUp,
  funnels: Filter,
  retention: Grid3x3,
  segments: Users,
  dashboards: LayoutDashboard,
  ai: Sparkles,
};

/**
 * The six analytics surfaces as descriptive cards (presentational). The surfaces are
 * RLS-gated behind auth, so the cards describe rather than deep-link — the single path
 * into the app is the hero / demo CTA. Token-only colors (ADR 0058); icons are
 * decorative (`aria-hidden`).
 */
export function SurfaceShowcase({ copy }: { copy: LandingCopy["surfaces"] }) {
  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-20 sm:py-24">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          {copy.heading}
        </h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground text-pretty">
          {copy.lead}
        </p>
      </Reveal>
      <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SURFACE_IDS.map((id, i) => {
          const Icon = SURFACE_ICONS[id];
          const item = copy.items[id];
          return (
            <li key={id}>
              <Reveal delay={i * 0.06} className="h-full">
                <div className="group h-full rounded-xl border border-border bg-card p-6 text-left transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-primary/15 to-accent/15 text-primary transition-colors group-hover:from-primary/25 group-hover:to-accent/25">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mt-4 text-lg font-medium text-card-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground text-pretty">
                    {item.body}
                  </p>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

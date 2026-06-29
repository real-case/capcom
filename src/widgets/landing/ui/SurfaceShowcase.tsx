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
    <section className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight text-foreground">
          {copy.heading}
        </h2>
        <p className="mt-3 text-base leading-7 text-muted-foreground text-pretty">
          {copy.lead}
        </p>
      </div>
      <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {SURFACE_IDS.map((id) => {
          const Icon = SURFACE_ICONS[id];
          const item = copy.items[id];
          return (
            <li
              key={id}
              className="rounded-lg border border-border bg-card p-6 text-left"
            >
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-muted text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <h3 className="mt-4 text-lg font-medium text-card-foreground">
                {item.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground text-pretty">
                {item.body}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

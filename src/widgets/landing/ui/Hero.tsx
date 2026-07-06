import { ArrowRight, Sparkles } from "lucide-react";

import { Link } from "@/i18n/navigation";

import { METHODOLOGY_ANCHOR, type LandingCopy } from "../model/content";

import { MeshBackdrop } from "./MeshBackdrop";
import { Floating, Reveal } from "./motion";

/**
 * Landing hero (presentational, Server Component). The premium surface of ADR 0096: an
 * aurora `MeshBackdrop` behind a staggered `Reveal` entrance and a floating product
 * preview. The brand stays the single `h1`; the two CTAs keep their exact accessible names
 * and hrefs (the primary a locale-aware `Link` into the app, ADR 0030; the secondary an
 * in-page jump). Motion is client-island enhancement over server-rendered copy (ADR 0002);
 * every colour is a semantic token (ADR 0058).
 */
export function Hero({ copy }: { copy: LandingCopy["hero"] }) {
  return (
    <section className="relative isolate overflow-hidden">
      <MeshBackdrop />
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pt-28 pb-20 text-center sm:pt-36">
        <Reveal>
          <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-4 py-1.5 text-xs font-medium tracking-widest text-muted-foreground uppercase backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {copy.eyebrow}
          </span>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="text-6xl font-semibold tracking-tight text-foreground sm:text-7xl">
            {copy.title}
          </h1>
        </Reveal>

        <Reveal delay={0.12} className="max-w-2xl">
          <p className="text-xl leading-8 font-medium text-foreground text-balance">
            {copy.tagline}
          </p>
        </Reveal>

        <Reveal delay={0.18} className="max-w-xl">
          <p className="text-base leading-7 text-muted-foreground text-pretty">
            {copy.lead}
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/20 transition-colors hover:bg-primary/90"
            >
              {copy.primaryCta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
            <a
              href={`#${METHODOLOGY_ANCHOR}`}
              className="inline-flex items-center rounded-md border border-border bg-card/50 px-5 py-2.5 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-muted"
            >
              {copy.secondaryCta}
            </a>
          </div>
        </Reveal>

        <Reveal delay={0.32} className="mt-12 w-full">
          <Floating className="mx-auto w-full max-w-3xl" y={10} duration={10}>
            <ProductPreview />
          </Floating>
        </Reveal>
      </div>
    </section>
  );
}

/** Fixed, decorative stat tiles for the product preview (non-translatable chrome). */
const PREVIEW_STATS = [
  { label: "Active users", value: "12,480", delta: "+8.2%" },
  { label: "Conversion", value: "24.6%", delta: "+3.1%" },
  { label: "Retention (W4)", value: "41%", delta: "+1.7%" },
] as const;

/** Fixed bar heights + hues for the decorative trends chart (Tailwind scale only). */
const PREVIEW_BARS = [
  "h-16",
  "h-24",
  "h-20",
  "h-32",
  "h-28",
  "h-40",
  "h-28",
  "h-36",
] as const;

/**
 * A stylized "product screenshot" — a faux trends dashboard built entirely from tokens and
 * the Tailwind spacing scale (no real data, no chart library, no raw literals). Decorative
 * illustration only; the real surfaces live behind auth.
 */
function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card text-left shadow-2xl">
      {/* Window chrome. */}
      <div className="flex items-center gap-1.5 border-b border-border bg-muted/50 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-viz-categorical-1" />
        <span className="h-2.5 w-2.5 rounded-full bg-viz-categorical-3" />
        <span className="h-2.5 w-2.5 rounded-full bg-viz-categorical-5" />
        <span className="ml-3 font-mono text-xs text-muted-foreground">
          capcom · trends
        </span>
      </div>

      {/* Stat tiles. */}
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {PREVIEW_STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border bg-background p-3"
          >
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-foreground">
                {stat.value}
              </span>
              <span className="rounded bg-status-nominal-bg px-1.5 py-0.5 text-xs font-medium text-status-nominal-fg">
                {stat.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Faux trends bar chart. */}
      <div className="flex h-44 items-end gap-2 px-5 pb-6">
        {PREVIEW_BARS.map((h, i) => (
          <div
            key={i}
            className={`w-full rounded-t bg-gradient-to-t from-primary/70 to-accent ${h}`}
          />
        ))}
      </div>
    </div>
  );
}

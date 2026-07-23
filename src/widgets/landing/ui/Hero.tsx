import { ArrowRight } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

import { METHODOLOGY_ANCHOR, type LandingCopy } from "../model/content";

import { MeshBackdrop } from "./MeshBackdrop";
import { Floating, Reveal } from "./motion";

/**
 * Landing hero (presentational, Server Component). The premium surface of ADR 0096/0101: an
 * aurora `MeshBackdrop` behind a staggered `Reveal` entrance and a floating product preview, on
 * the mission-control surface. The brand stays the single `h1`; a telemetry eyebrow (a pulsing
 * nominal-status dot + a geist-mono, tracked, uppercase label) echoes the console/auth chrome.
 * The two CTAs keep their exact accessible names and hrefs — the primary is the kit accent
 * button (`buttonVariants`, so the shadcn fill stays inside the kit), the secondary a
 * mission-control surface button jumping in-page. Motion is client-island enhancement over
 * server-rendered copy (ADR 0002); every colour is a semantic token (ADR 0081/0058).
 */
export function Hero({ copy }: { copy: LandingCopy["hero"] }) {
  return (
    <section className="relative isolate overflow-hidden">
      <MeshBackdrop />
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 px-6 pt-28 pb-20 text-center sm:pt-36">
        <Reveal>
          <span className="inline-flex items-center gap-2">
            <span
              className="size-1.5 rounded-full bg-status-nominal-fg motion-safe:animate-pulse"
              aria-hidden="true"
            />
            <span className="font-mono text-xs tracking-[0.2em] text-text-secondary uppercase">
              {copy.eyebrow}
            </span>
          </span>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="text-6xl font-semibold tracking-tight text-text-primary sm:text-7xl">
            {copy.title}
          </h1>
        </Reveal>

        <Reveal delay={0.12} className="max-w-2xl">
          <p className="text-xl leading-8 font-medium text-pretty text-text-primary">
            {copy.tagline}
          </p>
        </Reveal>

        <Reveal delay={0.18} className="max-w-xl">
          <p className="text-base leading-7 text-pretty text-text-secondary">
            {copy.lead}
          </p>
        </Reveal>

        <Reveal delay={0.24}>
          <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
            <Link href="/sign-in" className={buttonVariants({ size: "lg" })}>
              {copy.primaryCta}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <a
              href={`#${METHODOLOGY_ANCHOR}`}
              className="inline-flex h-10 items-center rounded-md border border-border-hairline bg-surface-elevated px-6 text-sm font-medium text-text-primary transition-colors hover:bg-surface-overlay"
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

/** Fixed bar heights for the decorative trends chart (Tailwind spacing scale only). */
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
 * A stylized "product screenshot" — a faux trends dashboard built entirely from mission-control
 * tokens and the Tailwind spacing scale (no real data, no chart library, no raw literals).
 * Decorative illustration only; the real surfaces live behind auth.
 */
function ProductPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border-hairline bg-surface-panel text-left shadow-2xl">
      {/* Window chrome. */}
      <div className="flex items-center gap-1.5 border-b border-border-hairline bg-surface-elevated px-4 py-3">
        <span className="size-2.5 rounded-full bg-viz-categorical-1" />
        <span className="size-2.5 rounded-full bg-viz-categorical-3" />
        <span className="size-2.5 rounded-full bg-viz-categorical-5" />
        <span className="ml-3 font-mono text-xs text-text-secondary">
          capcom · trends
        </span>
      </div>

      {/* Stat tiles. */}
      <div className="grid gap-3 p-5 sm:grid-cols-3">
        {PREVIEW_STATS.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border border-border-hairline bg-surface-background p-3"
          >
            <p className="text-xs text-text-secondary">{stat.label}</p>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="font-mono text-lg font-semibold text-text-primary">
                {stat.value}
              </span>
              <span className="rounded bg-status-nominal-bg px-1.5 py-0.5 text-xs font-medium text-status-nominal-fg">
                {stat.delta}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Faux trends bar chart (decorative data-viz hues). */}
      <div className="flex h-44 items-end gap-2 px-5 pb-6">
        {PREVIEW_BARS.map((h, i) => (
          <div
            key={i}
            className={`w-full rounded-t bg-gradient-to-t from-viz-categorical-4 to-viz-categorical-6 ${h}`}
          />
        ))}
      </div>
    </div>
  );
}

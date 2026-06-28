import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";

import { METHODOLOGY_ANCHOR, type LandingCopy } from "../model/content";

/**
 * Landing hero (presentational). Brand name as the single `h1`, the descriptive
 * tagline + lead beneath, and the two calls to action: a primary link into the app
 * (locale-aware `Link`, ADR 0030) and a secondary in-page jump to the methodology
 * section. Colors come from semantic tokens only (ADR 0058).
 */
export function Hero({ copy }: { copy: LandingCopy["hero"] }) {
  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-6 pt-24 pb-16 text-center">
      <p className="text-sm font-medium tracking-widest text-muted-foreground uppercase">
        {copy.eyebrow}
      </p>
      <h1 className="text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
        {copy.title}
      </h1>
      <p className="max-w-2xl text-xl leading-8 font-medium text-foreground text-balance">
        {copy.tagline}
      </p>
      <p className="max-w-xl text-base leading-7 text-muted-foreground text-pretty">
        {copy.lead}
      </p>
      <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row">
        <Link
          href="/sign-in"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {copy.primaryCta}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <a
          href={`#${METHODOLOGY_ANCHOR}`}
          className="inline-flex items-center rounded-md border border-border px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
        >
          {copy.secondaryCta}
        </a>
      </div>
    </section>
  );
}

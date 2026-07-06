import { ArrowRight } from "lucide-react";

import { Link } from "@/i18n/navigation";

import { DEMO_ACCOUNTS, type LandingCopy } from "../model/content";

import { Reveal } from "./motion";

/**
 * "Try the live demo" block (presentational). Surfaces the seeded accounts and their
 * shared password publicly so a visitor can sign in and watch RBAC differ by role; the
 * data is seeded and tenant-isolated by RLS (ADR 0083). The credential label is already
 * ICU-interpolated with the password by the route. Token-only colors (ADR 0058).
 */
export function DemoAccess({ copy }: { copy: LandingCopy["demo"] }) {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-20 sm:py-24">
      <Reveal className="relative">
        {/* Soft aurora glow framing the card (decorative, token-only). */}
        <div
          aria-hidden="true"
          className="absolute -inset-px -z-10 rounded-2xl bg-gradient-to-br from-primary/25 via-accent/15 to-transparent blur-md"
        />
        <div className="rounded-2xl border border-border bg-card p-8 text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {copy.heading}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-muted-foreground text-pretty">
            {copy.lead}
          </p>

          <p className="mt-8 text-sm font-medium text-foreground">
            {copy.credentialsLabel}
          </p>
          <ul className="mx-auto mt-4 flex max-w-md flex-col gap-2">
            {DEMO_ACCOUNTS.map((account) => (
              <li
                key={account.email}
                className="flex items-center justify-between gap-4 rounded-md border border-border bg-background px-4 py-2.5"
              >
                <code className="font-mono text-sm text-foreground">
                  {account.email}
                </code>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-foreground">
                  {copy.roleLabels[account.roleKey]}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-8 flex justify-center">
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {copy.cta}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">{copy.note}</p>
        </div>
      </Reveal>
    </section>
  );
}

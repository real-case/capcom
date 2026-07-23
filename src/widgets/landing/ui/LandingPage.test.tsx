import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/en.json";
import type { LandingCopy } from "../model/content";

import { LandingPage } from "./LandingPage";

/**
 * Renders the REAL composed LandingPage (so Hero / SurfaceShowcase / DemoAccess /
 * MethodologyStrip / SiteFooter all execute and stay in the coverage denominator). The
 * components take copy as props; the one-click island is injected as `demoSlot` — here a LOCAL
 * presentational stub, so the test never imports the auth feature's server-action chain
 * (→ next/headers), which cannot execute under jsdom. The provider supplies the locale the
 * next-intl `Link` needs to render `/en/sign-in`.
 */
function makeCopy(): LandingCopy {
  const card = (title: string) => ({ title, body: `${title} — body copy.` });
  return {
    hero: {
      eyebrow: "Product analytics, built in the open",
      title: "CAPCOM",
      tagline: "Tagline for the hero.",
      lead: "Lead paragraph for the hero.",
      primaryCta: "Try the live demo",
      secondaryCta: "Behind the scenes",
    },
    surfaces: {
      heading: "What the demo showcases",
      lead: "Surfaces lead.",
      items: {
        trends: card("Trends card"),
        funnels: card("Funnels card"),
        retention: card("Retention card"),
        segments: card("Segments card"),
        dashboards: card("Dashboards card"),
        ai: card("AI card"),
      },
    },
    demo: {
      heading: "Try it yourself",
      lead: "Demo lead.",
      note: "Data is seeded and isolated per tenant by RLS.",
    },
    methodology: {
      heading: "Behind the scenes",
      lead: "Methodology lead.",
      items: {
        adr: card("Decisions-first"),
        rls: card("Real RLS isolation"),
        sql: card("In-database aggregation"),
        tokens: card("Token & FSD governance"),
        tests: card("A real test pyramid"),
      },
    },
    footer: {
      tagline: "Footer tagline.",
      navLabel: "Project links",
      repo: "Source on GitHub",
      roadmap: "PR-by-PR roadmap",
      methodology: "The methodology",
      license: "MIT license",
      builtOn: "Built on claude-code-nextjs-starter",
    },
  };
}

/**
 * Local presentational stand-in for the injected one-click cards — mirrors the real
 * DemoSignIn markup without importing the auth feature (which would drag the server-action
 * chain into jsdom). The route injects the real `DemoSignInManager`; this proves the slot.
 */
function DemoSlotStub() {
  return (
    <div className="flex flex-col gap-2">
      {["Alice", "Dave", "Bob"].map((name) => (
        <button key={name} type="button">
          Continue as {name}
        </button>
      ))}
    </div>
  );
}

function renderLanding() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LandingPage copy={makeCopy()} demoSlot={<DemoSlotStub />} />
    </NextIntlClientProvider>,
  );
}

describe("LandingPage", () => {
  it("embeds the one-click demo sign-in cards via the injected slot", () => {
    renderLanding();

    // Exactly one h1 — the brand.
    expect(
      screen.getByRole("heading", { level: 1, name: "CAPCOM" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);

    // All six analytics-surface cards.
    for (const title of [
      "Trends card",
      "Funnels card",
      "Retention card",
      "Segments card",
      "Dashboards card",
      "AI card",
    ]) {
      expect(
        screen.getByRole("heading", { level: 3, name: title }),
      ).toBeInTheDocument();
    }

    // The injected one-click demo cards render in the DemoAccess block (not an email/password
    // list) — the demoSlot injection point works.
    expect(
      screen.getByRole("button", { name: "Continue as Alice" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue as Dave" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Continue as Bob" }),
    ).toBeInTheDocument();

    // Primary CTA links into the app, locale-prefixed by next-intl.
    expect(
      screen.getByRole("link", { name: "Try the live demo" }),
    ).toHaveAttribute("href", "/en/sign-in");
    // Secondary CTA jumps to the methodology section in-page.
    expect(
      screen.getByRole("link", { name: "Behind the scenes" }),
    ).toHaveAttribute("href", "#behind-the-scenes");
  });

  it("retires the public password and renders no credential label", () => {
    renderLanding();

    // The public demo password + seeded email list are gone (ADR 0101) — the front door no
    // longer echoes any credential.
    expect(screen.queryByText(/password123/)).not.toBeInTheDocument();
    expect(screen.queryByText("alice@capcom.dev")).not.toBeInTheDocument();
    expect(screen.queryByText("dave@capcom.dev")).not.toBeInTheDocument();
    expect(screen.queryByText("bob@capcom.dev")).not.toBeInTheDocument();
    expect(screen.queryByText(/Seeded accounts/)).not.toBeInTheDocument();
  });

  it("exposes main and footer landmarks and the outbound repo link", () => {
    renderLanding();

    expect(screen.getByRole("main")).toBeInTheDocument();
    expect(screen.getByRole("contentinfo")).toBeInTheDocument();

    const repo = screen.getByRole("link", { name: "Source on GitHub" });
    expect(repo).toHaveAttribute("href", "https://github.com/real-case/capcom");
    expect(repo).toHaveAttribute("rel", "noreferrer");
  });
});

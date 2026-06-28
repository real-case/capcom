import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import messages from "../../../../messages/en.json";
import type { LandingCopy } from "../model/content";

import { LandingPage } from "./LandingPage";

/**
 * Renders the REAL composed LandingPage (so Hero / SurfaceShowcase / DemoAccess /
 * MethodologyStrip / SiteFooter all execute and stay in the coverage denominator). The
 * components take copy as props; the provider only supplies the locale the next-intl
 * `Link` needs to render `/en/sign-in`.
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
      credentialsLabel: "Seeded accounts — password password123",
      roleLabels: { owner: "Owner", analyst: "Analyst", viewer: "Viewer" },
      cta: "Open the app",
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

function renderLanding() {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <LandingPage copy={makeCopy()} />
    </NextIntlClientProvider>,
  );
}

describe("LandingPage", () => {
  it("renders the hero, six surface cards, demo credentials, and the primary CTA", () => {
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

    // The seeded demo credentials are visible, with each role label.
    expect(screen.getByText("alice@capcom.dev")).toBeInTheDocument();
    expect(screen.getByText("dave@capcom.dev")).toBeInTheDocument();
    expect(screen.getByText("bob@capcom.dev")).toBeInTheDocument();
    expect(
      screen.getByText("Seeded accounts — password password123"),
    ).toBeInTheDocument();
    expect(screen.getByText("Owner")).toBeInTheDocument();
    expect(screen.getByText("Analyst")).toBeInTheDocument();
    expect(screen.getByText("Viewer")).toBeInTheDocument();

    // Primary CTA links into the app, locale-prefixed by next-intl.
    expect(
      screen.getByRole("link", { name: "Try the live demo" }),
    ).toHaveAttribute("href", "/en/sign-in");
    // Secondary CTA jumps to the methodology section in-page.
    expect(
      screen.getByRole("link", { name: "Behind the scenes" }),
    ).toHaveAttribute("href", "#behind-the-scenes");
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

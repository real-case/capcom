import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/en.json";
import type { LandingCopy } from "../model/content";

import { LandingPage } from "./LandingPage";

// ADR 0036/0039/0042: colocated CSF 3 story for the public landing. It is presentational
// (props in), so no play function is required (ADR 0038) — the value is the a11y axe gate
// (`a11y: { test: "error" }`, ADR 0039) over a full page composition, in light + dark
// (ADR 0042 theme axis). The copy is a deterministic fixture (no time/random) for
// Chromatic stability (ADR 0043); the next-intl provider only supplies the locale the
// `Link` needs (ADR 0030).

const copy: LandingCopy = {
  hero: {
    eyebrow: "Product analytics, built in the open",
    title: "CAPCOM",
    tagline:
      "A multitenant product-analytics platform — events, funnels, retention cohorts, and segmentation over real Postgres Row-Level Security.",
    lead: "A live demonstration of the claude-code-nextjs-starter methodology: every decision recorded as an ADR, a human acceptance gate, and deterministic checks on every change.",
    primaryCta: "Try the live demo",
    secondaryCta: "Behind the scenes",
  },
  surfaces: {
    heading: "What the demo showcases",
    lead: "Six analytics surfaces, each an end-to-end vertical slice: in-database SQL aggregation → typed RPC → shareable URL state → token-governed visx chart.",
    items: {
      trends: {
        title: "Trends",
        body: "Time-bucketed event counts with an optional property breakdown — zero-filled in SQL.",
      },
      funnels: {
        title: "Funnels",
        body: "Ordered-step conversion within a single window, counting distinct users from first touch.",
      },
      retention: {
        title: "Retention cohorts",
        body: "The signature dense heatmap — acquisition cohorts, calendar-aligned periods.",
      },
      segments: {
        title: "Segmentation",
        body: "User-authored attribute and behaviour rules, evaluated by a closed in-database interpreter.",
      },
      dashboards: {
        title: "Dashboards & saved reports",
        body: "Saved analyses composed onto boards through Server Actions with optimistic mutations.",
      },
      ai: {
        title: "Ask with AI",
        body: "A plain-language question translated server-side into a validated query spec.",
      },
    },
  },
  demo: {
    heading: "Try it yourself",
    lead: "Sign in with a seeded account and explore real multitenant data. Each account carries a different role.",
    credentialsLabel: "Seeded accounts — password password123",
    roleLabels: { owner: "Owner", analyst: "Analyst", viewer: "Viewer" },
    cta: "Open the app",
    note: "Data is seeded and isolated per tenant by Postgres Row-Level Security.",
  },
  methodology: {
    heading: "Behind the scenes",
    lead: "The point isn't only the product — it's how it's built.",
    items: {
      adr: {
        title: "Decisions-first",
        body: "Every non-trivial choice is an ADR, accepted by a human before any code depends on it.",
      },
      rls: {
        title: "Real RLS isolation",
        body: "Multitenancy and RBAC are enforced in Postgres Row-Level Security.",
      },
      sql: {
        title: "In-database aggregation",
        body: "Funnels, retention, and trends are SECURITY INVOKER SQL functions.",
      },
      tokens: {
        title: "Token & FSD governance",
        body: "Every color comes from a generated design-token allowlist.",
      },
      tests: {
        title: "A real test pyramid",
        body: "Unit, Storybook a11y, and Playwright e2e on the auth/RLS critical path.",
      },
    },
  },
  footer: {
    tagline:
      "Built as a portfolio demonstration of the claude-code-nextjs-starter methodology.",
    navLabel: "Project links",
    repo: "Source on GitHub",
    roadmap: "PR-by-PR roadmap",
    methodology: "The methodology",
    license: "MIT license",
    builtOn: "Built on claude-code-nextjs-starter",
  },
};

const meta = {
  component: LandingPage,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={messages}>
        <Story />
      </NextIntlClientProvider>
    ),
  ],
  args: { copy },
} satisfies Meta<typeof LandingPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Dark axis — forced in the automated run so a11y/contrast is checked dark too. */
export const Dark: Story = { globals: { theme: "dark" } };

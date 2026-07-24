import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import type { OverviewKpis, OverviewSignalBucket } from "@/entities/event";

import type { LauncherCopy, LauncherOrg } from "../model/launcher";

import { WorkspaceLauncher } from "./WorkspaceLauncher";

/**
 * ADR 0036/0039/0042/0101 colocated story for the workspace launcher on the mission-control
 * surface. It is presentational (props in), so no play function is required (ADR 0038) — the
 * value is the a11y axe gate (`a11y: { test: "error" }`, ADR 0039) over the full composition,
 * in light (Default) + Dark (ADR 0042/0092). That axe run is the load-bearing half-mix proof
 * for the re-skin (ADR 0101): `check:tokens` / `check:contrast` cannot see a half-mix, so the
 * widget must be measured on its own `bg-surface-background`. Fixtures are deterministic (fixed
 * dates, no live clock/random) for Chromatic stability (ADR 0043). The `NextIntlClientProvider`
 * supplies the locale the next-intl `Link` needs.
 */

const JUN_1 = Date.UTC(2026, 5, 1);

function kpis(active: number, prev: number): OverviewKpis {
  return {
    active_users: active,
    active_users_prev: prev,
    new_signups: 0,
    new_signups_prev: 0,
    purchasers: 0,
    purchasers_prev: 0,
    value_sum: 0,
    value_sum_prev: 0,
  };
}

function signal(actives: number[]): OverviewSignalBucket[] {
  return actives.map((active_users, i) => ({
    bucket: new Date(JUN_1 + i * 86_400_000).toISOString(),
    active_users,
    new_signups: 0,
    value_sum: 0,
    purchasers: 0,
  }));
}

const COPY: LauncherCopy = {
  title: "Your workspaces",
  lead: "Pick a project to open its mission control.",
  metricLabel: "Active users",
  windowLabel: "Last 30 days",
  deltaCaption: "vs the previous 30 days",
  noProjects: "No projects in this organization yet.",
  cardError: "Metrics unavailable right now.",
  empty: {
    title: "No workspaces yet",
    body: "You're not a member of any organization. Ask an admin to invite you.",
  },
};

const AURORA: LauncherOrg = {
  id: "org-aurora",
  name: "Aurora Labs",
  roleLabel: "Owner",
  projects: [
    {
      id: "proj-web",
      name: "Aurora Web",
      status: "ok",
      kpis: kpis(108, 56),
      signal: signal([5, 6, 7, 9, 8, 11, 13, 12, 15, 18]),
      activityLabel: "Active today",
    },
    {
      id: "proj-mobile",
      name: "Aurora Mobile",
      status: "ok",
      kpis: kpis(42, 60),
      signal: signal([9, 8, 7, 6, 5, 4, 3, 2, 1, 0]),
      activityLabel: "Active 2 days ago",
    },
  ],
};

const ORGS: LauncherOrg[] = [AURORA];

const meta = {
  component: WorkspaceLauncher,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <NextIntlClientProvider locale="en" messages={{}}>
        <div className="min-h-svh bg-surface-background">
          <Story />
        </div>
      </NextIntlClientProvider>
    ),
  ],
  args: { orgs: ORGS, copy: COPY, locale: "en-US" },
} satisfies Meta<typeof WorkspaceLauncher>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Dark axis — forced in the automated run so a11y/contrast is checked dark too. */
export const Dark: Story = { globals: { theme: "dark" } };

/** A member of no organization sees the empty state. */
export const Empty: Story = { args: { orgs: [] } };

/** A project quiet for the whole window: null delta (no chip) and a no-activity line. */
export const NoActivity: Story = {
  args: {
    orgs: [
      {
        ...AURORA,
        projects: [
          {
            id: "proj-quiet",
            name: "Aurora Quiet",
            status: "ok",
            kpis: kpis(0, 0),
            signal: signal([0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
            activityLabel: "No activity in the last 30 days",
          },
        ],
      },
    ],
  },
};

/** One project's metrics failed to load: that card degrades; its sibling still renders. */
export const CardError: Story = {
  args: {
    orgs: [
      {
        ...AURORA,
        projects: [
          { id: "proj-down", name: "Aurora Down", status: "error" },
          AURORA.projects[1]!,
        ],
      },
    ],
  },
};

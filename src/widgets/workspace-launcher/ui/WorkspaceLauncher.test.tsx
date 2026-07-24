import { render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { describe, expect, it } from "vitest";

import type { OverviewKpis, OverviewSignalBucket } from "@/entities/event";

import messages from "../../../../messages/en.json";
import type { LauncherCopy, LauncherOrg } from "../model/launcher";

import { WorkspaceLauncher } from "./WorkspaceLauncher";

/**
 * Renders the REAL composed launcher (so ProjectCard + LauncherSparkline + the kit primitives
 * all execute and stay in the coverage denominator). Everything is props — the widget owns no
 * fetching or translation — so this needs none of the TanStack/nuqs mocking the OverviewDashboard
 * test carries. The provider supplies the locale the next-intl `Link` needs to render `/en/p/…`.
 */
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
    body: "You're not a member of any organization.",
  },
};

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
    bucket: new Date(Date.UTC(2026, 5, 1) + i * 86_400_000).toISOString(),
    active_users,
    new_signups: 0,
    value_sum: 0,
    purchasers: 0,
  }));
}

function renderLauncher(orgs: LauncherOrg[]) {
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <WorkspaceLauncher orgs={orgs} copy={COPY} locale="en-US" />
    </NextIntlClientProvider>,
  );
}

describe("WorkspaceLauncher", () => {
  it("renders each project as a launcher card with metric, delta, role, activity, and one link", () => {
    renderLauncher([
      {
        id: "org-aurora",
        name: "Aurora Labs",
        roleLabel: "Owner",
        projects: [
          {
            id: "proj-web",
            name: "Aurora Web",
            status: "ok",
            kpis: kpis(108, 56),
            signal: signal([5, 8, 11, 15]),
            activityLabel: "Active today",
          },
          {
            id: "proj-mobile",
            name: "Aurora Mobile",
            status: "ok",
            kpis: kpis(42, 60),
            signal: signal([9, 6, 3, 1]),
            activityLabel: "Active 2 days ago",
          },
        ],
      },
    ]);

    // Metric values + period-over-period deltas (108/56 → +93%, 42/60 → -30%).
    expect(screen.getByText("108")).toBeInTheDocument();
    expect(screen.getByText("+93%")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("-30%")).toBeInTheDocument();

    // The member role renders on each card.
    expect(screen.getAllByText("Owner")).toHaveLength(2);

    // Each card's pre-localized activity line.
    expect(screen.getByText("Active today")).toBeInTheDocument();
    expect(screen.getByText("Active 2 days ago")).toBeInTheDocument();

    // Exactly one link per card, each NAMED by its project (the aria-labelledby scoping),
    // not by the run-on card body.
    expect(screen.getAllByRole("link")).toHaveLength(2);
    const webLink = screen.getByRole("link", { name: "Aurora Web" });
    expect(webLink).toHaveAttribute("href", "/en/p/proj-web");
    expect(
      screen.getByRole("link", { name: "Aurora Mobile" }),
    ).toBeInTheDocument();

    // …and DESCRIBED by the role + metric + activity (aria-describedby), so a screen-reader
    // user tabbing card to card still hears the data — a clean name must not hide the content.
    expect(webLink).toHaveAccessibleDescription(/Owner/);
    expect(webLink).toHaveAccessibleDescription(/108/);
    expect(webLink).toHaveAccessibleDescription(/Active today/);
  });

  it("shows the member-of-nothing empty state when there are no organizations", () => {
    renderLauncher([]);
    expect(screen.getByText(COPY.empty.title)).toBeInTheDocument();
    expect(screen.getByText(COPY.empty.body)).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("shows the no-projects line for an organization with no reachable projects", () => {
    renderLauncher([
      {
        id: "org-empty",
        name: "Globex Analytics",
        roleLabel: "Viewer",
        projects: [],
      },
    ]);
    expect(screen.getByText("Globex Analytics")).toBeInTheDocument();
    expect(screen.getByText(COPY.noProjects)).toBeInTheDocument();
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("renders a quiet project with the no-activity line and no delta chip", () => {
    renderLauncher([
      {
        id: "org-aurora",
        name: "Aurora Labs",
        roleLabel: "Owner",
        projects: [
          {
            id: "proj-quiet",
            name: "Aurora Quiet",
            status: "ok",
            kpis: kpis(50, 0), // zero previous window → null delta → no chip
            signal: signal([0, 0, 0, 0]),
            activityLabel: "No activity in the last 30 days",
          },
        ],
      },
    ]);
    expect(screen.getByText("50")).toBeInTheDocument();
    expect(
      screen.getByText("No activity in the last 30 days"),
    ).toBeInTheDocument();
    // A guarded null delta renders no chip at all — no percent anywhere on the card.
    expect(screen.queryByText(/%/)).toBeNull();
  });

  it("degrades a project whose rows are unavailable to a per-card error without asserting no-activity", () => {
    renderLauncher([
      {
        id: "org-aurora",
        name: "Aurora Labs",
        roleLabel: "Owner",
        projects: [
          { id: "proj-down", name: "Aurora Down", status: "error" },
          {
            id: "proj-mobile",
            name: "Aurora Mobile",
            status: "ok",
            kpis: kpis(42, 60),
            signal: signal([9, 6, 3, 1]),
            activityLabel: "Active 2 days ago",
          },
        ],
      },
    ]);

    // The failed card shows the error copy and stays a link, but makes NO activity claim.
    expect(screen.getByText(COPY.cardError)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Aurora Down" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("No activity in the last 30 days")).toBeNull();

    // Its sibling still renders its metric + activity — one failure never blanks the page.
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("Active 2 days ago")).toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(2);
    // The role is known from membership regardless of the RPC, so both cards show it.
    expect(screen.getAllByText("Owner")).toHaveLength(2);
  });
});

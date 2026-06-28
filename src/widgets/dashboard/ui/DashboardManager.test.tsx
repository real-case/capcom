import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { DashboardWithReports } from "@/entities/dashboard";
import type { Report, ReportKind } from "@/entities/report";

import messages from "../../../../messages/en.json";

// Mock only the data layer + the Server Actions — the REAL data hooks and optimistic
// mutation hooks run, so the test exercises the query/mutation wiring (ADR 0025), not a
// stub of it. `importOriginal` preserves the report-config helpers (defaultConfigForKind,
// reportConfigToSearchParams, reportKindRoute) the container and hooks depend on.
const { fetchReports, fetchDashboards } = vi.hoisted(() => ({
  fetchReports: vi.fn(),
  fetchDashboards: vi.fn(),
}));
const actions = vi.hoisted(() => ({
  createReport: vi.fn(),
  renameReport: vi.fn(),
  deleteReport: vi.fn(),
  createDashboard: vi.fn(),
  renameDashboard: vi.fn(),
  deleteDashboard: vi.fn(),
  addReportToDashboard: vi.fn(),
  removeReportFromDashboard: vi.fn(),
  reorderDashboardReports: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={String(href)}>{children}</a>
  ),
}));
vi.mock("@/entities/report", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/report")>()),
  fetchReports,
}));
vi.mock("@/entities/dashboard", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/dashboard")>()),
  fetchDashboards,
}));
vi.mock("@/features/report-actions", () => actions);

import { DashboardManager } from "./DashboardManager";

const report = (id: string, name: string, kind: ReportKind): Report => ({
  id,
  project_id: "p1",
  owner_id: null,
  name,
  kind,
  config: {},
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
});

const REPORTS = [
  report("r1", "Daily sign-ups", "trends"),
  report("r2", "Acquisition funnel", "funnel"),
  report("r3", "Weekly retention", "retention"),
];

const DASHBOARDS: DashboardWithReports[] = [
  {
    id: "d1",
    project_id: "p1",
    owner_id: null,
    name: "Growth overview",
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
    items: [
      { id: "i1", position: 0, report: REPORTS[0]! },
      { id: "i2", position: 1, report: REPORTS[1]! },
    ],
  },
];

function renderManager() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <DashboardManager projectId="p1" />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
}

describe("DashboardManager", () => {
  beforeEach(() => {
    fetchReports.mockReset().mockResolvedValue(REPORTS);
    fetchDashboards.mockReset().mockResolvedValue(DASHBOARDS);
    actions.createReport
      .mockReset()
      .mockResolvedValue({ ok: true, report: report("rx", "x", "trends") });
    actions.renameReport.mockReset().mockResolvedValue({ ok: true });
    actions.deleteReport.mockReset().mockResolvedValue({ ok: true });
    actions.createDashboard
      .mockReset()
      .mockResolvedValue({ ok: true, dashboard: DASHBOARDS[0] });
    actions.renameDashboard.mockReset().mockResolvedValue({ ok: true });
    actions.deleteDashboard.mockReset().mockResolvedValue({ ok: true });
    actions.addReportToDashboard
      .mockReset()
      .mockResolvedValue({ ok: true, itemId: "i9" });
    actions.removeReportFromDashboard
      .mockReset()
      .mockResolvedValue({ ok: true });
    actions.reorderDashboardReports.mockReset().mockResolvedValue({ ok: true });
  });

  it("renders the project's saved reports and dashboards", async () => {
    renderManager();
    // "Daily sign-ups" appears both as a saved report and as a dashboard item, so anchor
    // on the report row's unique delete control instead.
    expect(
      await screen.findByRole("button", {
        name: "Delete report Daily sign-ups",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Growth overview")).toBeInTheDocument();
  });

  it("creates a report with the kind's default config (ADR 0090)", async () => {
    const user = userEvent.setup();
    renderManager();
    await screen.findByRole("button", { name: "Delete report Daily sign-ups" });

    await user.type(screen.getByLabelText("Report name"), "New report");
    await user.click(screen.getByRole("button", { name: "Create report" }));

    await waitFor(() =>
      expect(actions.createReport).toHaveBeenCalledWith({
        projectId: "p1",
        name: "New report",
        kind: "trends",
        config: {
          event: "page_view",
          range: "30d",
          interval: "day",
          breakdown: "none",
        },
      }),
    );
  });

  it("deletes a report through the action", async () => {
    const user = userEvent.setup();
    renderManager();
    await screen.findByRole("button", { name: "Delete report Daily sign-ups" });

    await user.click(
      screen.getByRole("button", { name: "Delete report Daily sign-ups" }),
    );
    await waitFor(() =>
      expect(actions.deleteReport).toHaveBeenCalledWith({ id: "r1" }),
    );
  });

  it("composes an available report onto a dashboard at the next position", async () => {
    const user = userEvent.setup();
    renderManager();
    await screen.findByText("Growth overview");

    // r3 (Weekly retention) is the only report not already on the dashboard.
    await user.selectOptions(
      screen.getByLabelText("Add a report to this dashboard"),
      "r3",
    );
    await user.click(screen.getByRole("button", { name: "Add" }));

    await waitFor(() =>
      expect(actions.addReportToDashboard).toHaveBeenCalledWith({
        projectId: "p1",
        dashboardId: "d1",
        reportId: "r3",
        position: 2,
      }),
    );
  });

  it("reorders composed reports, passing the new id order", async () => {
    const user = userEvent.setup();
    renderManager();
    await screen.findByText("Growth overview");

    await user.click(
      screen.getByRole("button", { name: "Move Daily sign-ups down" }),
    );
    await waitFor(() =>
      expect(actions.reorderDashboardReports).toHaveBeenCalledWith({
        dashboardId: "d1",
        orderedItemIds: ["i2", "i1"],
      }),
    );
  });

  it("surfaces a rejected write as a generic message and rolls back (ADR 0090/0019)", async () => {
    actions.deleteReport.mockResolvedValue({ ok: false, error: "forbidden" });
    const user = userEvent.setup();
    renderManager();
    await screen.findByRole("button", { name: "Delete report Daily sign-ups" });

    await user.click(
      screen.getByRole("button", { name: "Delete report Daily sign-ups" }),
    );

    expect(
      await screen.findByText(/analyst access is required/i),
    ).toBeInTheDocument();
  });

  it("creates a dashboard through the action", async () => {
    const user = userEvent.setup();
    renderManager();
    await screen.findByText("Growth overview");

    await user.type(screen.getByLabelText("Dashboard name"), "New board");
    await user.click(screen.getByRole("button", { name: "Create dashboard" }));

    await waitFor(() =>
      expect(actions.createDashboard).toHaveBeenCalledWith({
        projectId: "p1",
        name: "New board",
      }),
    );
  });

  it("renames a report inline through the action", async () => {
    const user = userEvent.setup();
    renderManager();
    await screen.findByRole("button", { name: "Delete report Daily sign-ups" });

    await user.click(
      screen.getByRole("button", { name: "Rename report Daily sign-ups" }),
    );
    const input = screen.getByRole("textbox", {
      name: "Rename report Daily sign-ups",
    });
    await user.clear(input);
    await user.type(input, "Daily views");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() =>
      expect(actions.renameReport).toHaveBeenCalledWith({
        id: "r1",
        name: "Daily views",
      }),
    );
  });

  it("removes a composed report from a dashboard", async () => {
    const user = userEvent.setup();
    renderManager();
    await screen.findByText("Growth overview");

    await user.click(
      screen.getByRole("button", {
        name: "Remove Daily sign-ups from dashboard",
      }),
    );
    await waitFor(() =>
      expect(actions.removeReportFromDashboard).toHaveBeenCalledWith({
        itemId: "i1",
      }),
    );
  });

  it("rolls back a rejected dashboard create (onError path of a dashboard hook)", async () => {
    actions.createDashboard.mockResolvedValue({
      ok: false,
      error: "forbidden",
    });
    const user = userEvent.setup();
    renderManager();
    await screen.findByText("Growth overview");

    await user.type(screen.getByLabelText("Dashboard name"), "Denied board");
    await user.click(screen.getByRole("button", { name: "Create dashboard" }));

    expect(
      await screen.findByText(/analyst access is required/i),
    ).toBeInTheDocument();
    // The optimistic row was rolled back — only the seeded dashboard remains.
    await waitFor(() =>
      expect(screen.queryByText("Denied board")).not.toBeInTheDocument(),
    );
  });
});

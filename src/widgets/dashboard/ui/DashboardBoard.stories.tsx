import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";

import type { DashboardWithReports } from "@/entities/dashboard";
import type { Report, ReportKind } from "@/entities/report";

import messages from "../../../../messages/en.json";

import { DashboardBoard } from "./DashboardBoard";

/**
 * ADR 0036/0042: colocated CSF 3 stories for the dashboards board across its meaningful
 * states — loaded / empty / loading / error / action-error / overflow / dark. It is an
 * interactive (data-manager) archetype, so it carries `play` functions (ADR 0038) that
 * assert behaviour — a create submit and a delete click fire their callbacks, on the
 * keyboard path — not render. Fixtures are deterministic (ADR 0043); next-intl messages
 * come from the canonical catalog so the copy matches production (ADR 0030). Callbacks
 * are spies; the board owns no data fetching or Server Action wiring (ADR 0086 split).
 */

const TS = "2026-06-01T00:00:00.000Z";

function report(id: string, name: string, kind: ReportKind): Report {
  return {
    id,
    project_id: "p1",
    owner_id: null,
    name,
    kind,
    config: {},
    created_at: TS,
    updated_at: TS,
  };
}

const REPORTS: Report[] = [
  report("r1", "Daily sign-ups", "trends"),
  report("r2", "Acquisition funnel", "funnel"),
  report("r3", "Weekly retention", "retention"),
  report("r4", "Paying purchasers", "segment"),
];

const DASHBOARDS: DashboardWithReports[] = [
  {
    id: "d1",
    project_id: "p1",
    owner_id: null,
    name: "Growth overview",
    created_at: TS,
    updated_at: TS,
    items: [
      { id: "i1", position: 0, report: REPORTS[0]! },
      { id: "i2", position: 1, report: REPORTS[1]! },
    ],
  },
];

const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <div className="w-[760px] max-w-full">
      <Story />
    </div>
  </NextIntlClientProvider>
);

const meta = {
  component: DashboardBoard,
  parameters: { layout: "padded" },
  decorators: [withIntl],
  args: {
    reports: REPORTS,
    dashboards: DASHBOARDS,
    isLoading: false,
    isError: false,
    actionError: null,
    reportHref: () => "/p/p1/trends",
    onDismissError: fn(),
    onCreateReport: fn(),
    onRenameReport: fn(),
    onDeleteReport: fn(),
    onCreateDashboard: fn(),
    onRenameDashboard: fn(),
    onDeleteDashboard: fn(),
    onAddReport: fn(),
    onRemoveItem: fn(),
    onReorder: fn(),
  },
} satisfies Meta<typeof DashboardBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// empty: a project with no saved analyses yet — both panels show their empty copy.
export const Empty: Story = {
  args: { reports: [], dashboards: [] },
};

export const Loading: Story = {
  args: { isLoading: true, reports: [], dashboards: [] },
};

export const Error: Story = {
  args: { isError: true, reports: [], dashboards: [] },
};

// action-error: a write was rejected (e.g. a viewer's create → RLS 42501) — the
// dismissible alert banner is shown (ADR 0090 RBAC surfaced as generic copy, ADR 0019).
export const ActionError: Story = {
  args: {
    actionError:
      "You don’t have permission to do that — analyst access is required.",
  },
};

// data-edge: many saved reports and a dashboard composing several — exercises the list
// layout, the reorder controls, and the add-report picker shrinking as items are added.
export const Overflow: Story = {
  args: {
    reports: [
      ...REPORTS,
      report("r5", "Search usage", "trends"),
      report("r6", "Checkout funnel", "funnel"),
      report("r7", "Monthly retention", "retention"),
      report("r8", "Enterprise accounts", "segment"),
    ],
    dashboards: [
      {
        ...DASHBOARDS[0]!,
        items: [
          { id: "i1", position: 0, report: REPORTS[0]! },
          { id: "i2", position: 1, report: REPORTS[1]! },
          { id: "i3", position: 2, report: REPORTS[2]! },
          { id: "i4", position: 3, report: REPORTS[3]! },
        ],
      },
    ],
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

// interaction (play, ADR 0038): creating a report submits its name + kind through the
// callback; deleting one fires its callback. Behaviour, not render.
export const CreateAndDelete: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);

    const nameInput = canvas.getByLabelText("Report name");
    await userEvent.type(nameInput, "Conversion by plan");
    await userEvent.click(
      canvas.getByRole("button", { name: "Create report" }),
    );
    await expect(args.onCreateReport).toHaveBeenCalledWith({
      name: "Conversion by plan",
      kind: "trends",
    });

    await userEvent.click(
      canvas.getByRole("button", { name: "Delete report Daily sign-ups" }),
    );
    await expect(args.onDeleteReport).toHaveBeenCalledWith("r1");
  },
};

// interaction (play): reordering moves an item via the keyboard-reachable Down control,
// passing the new top-to-bottom order of link-row ids to the callback (ADR 0090).
export const Reorder: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Move Daily sign-ups down" }),
    );
    await expect(args.onReorder).toHaveBeenCalledWith("d1", ["i2", "i1"]);
  },
};

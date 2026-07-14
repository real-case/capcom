import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/en.json";

import { AppShell } from "./AppShell";

/**
 * ADR 0036/0042: colocated CSF 3 stories for the re-skinned app shell (ADR 0099) — the full
 * console chrome (sidebar NavItems, breadcrumb, ⌘K trigger, telemetry footer) on the
 * mission-control surface, in BOTH compositions. The toolbar drives `.dark` + `[data-theme]`
 * (preview.tsx), so light/dark flip as one unit; the axe gate (ADR 0039) checks the chrome's
 * surface/text pairing in each. Routing is mocked via the nextjs app-router param so the i18n
 * navigation hooks resolve; next-intl copy comes from the canonical catalog (ADR 0030). The
 * command palette lives closed in the tree, so the persistent chrome is what is snapshotted.
 */
const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <div className="min-h-svh">
      <Story />
    </div>
  </NextIntlClientProvider>
);

const meta = {
  component: AppShell,
  parameters: {
    layout: "fullscreen",
    nextjs: { appDirectory: true, navigation: { pathname: "/en/p/p1/events" } },
  },
  decorators: [withIntl],
  args: {
    projectId: "p1",
    projectName: "Web App",
    orgName: "Aurora",
    projects: [
      { id: "p1", name: "Web App" },
      { id: "p2", name: "Globex" },
    ],
    children: (
      <div className="p-6">
        <p className="text-text-secondary text-sm">
          Analysis surface content renders here.
        </p>
      </div>
    ),
  },
} satisfies Meta<typeof AppShell>;

export default meta;
type Story = StoryObj<typeof meta>;

// The console chrome in the dark-first hero composition and the light composition (ADR 0092).
export const Default: Story = {};

export const Dark: Story = { globals: { theme: "dark" } };

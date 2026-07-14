import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";

import type { Report } from "@/entities/report";

import messages from "../../../../messages/en.json";

import { ViewTabs } from "./ViewTabs";

/**
 * ADR 0036/0042 axe coverage for the re-skinned saved-view tabs (ADR 0099): the active/
 * inactive tab token pairs on the mission-control surface, in both compositions.
 */
const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <Story />
  </NextIntlClientProvider>
);

const view = (id: string, name: string): Report => ({
  id,
  name,
  kind: "events",
  config: {},
  project_id: "p1",
  owner_id: "u1",
  created_at: "2026-07-01T00:00:00.000Z",
  updated_at: "2026-07-01T00:00:00.000Z",
});

const VIEWS = [view("v1", "Signups"), view("v2", "Purchases")];

const meta = {
  component: ViewTabs,
  parameters: { layout: "padded" },
  decorators: [withIntl],
  args: { views: VIEWS, activeId: null, onOpen: fn() },
} satisfies Meta<typeof ViewTabs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** "All events" active — the default. */
export const Default: Story = {};

/** A saved view active — the active-tab surface. */
export const ViewActive: Story = { args: { activeId: "v1" } };

export const Dark: Story = { globals: { theme: "dark" } };

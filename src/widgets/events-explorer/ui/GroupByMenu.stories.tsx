import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";

import messages from "../../../../messages/en.json";

import { GroupByMenu } from "./GroupByMenu";

/**
 * ADR 0036/0042 axe coverage for the re-skinned group-by control (ADR 0099). The dropdown
 * content portals to `body`, so the closed trigger (active vs none) is the covered surface;
 * the open menu items are the documented best-effort residual (the Phase-B portal precedent).
 */
const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <Story />
  </NextIntlClientProvider>
);

const meta = {
  component: GroupByMenu,
  parameters: { layout: "padded" },
  decorators: [withIntl],
  args: { value: "none", onChange: fn() },
} satisfies Meta<typeof GroupByMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No grouping — the row grid is active. */
export const Default: Story = {};

/** Grouped by a dimension — the trigger reflects the active dimension. */
export const Grouped: Story = { args: { value: "plan" } };

// NOTE: no open-menu play — opening a Radix dropdown in an isolated story trips axe's
// aria-hidden-focus rule (a Storybook-isolation artifact, not an app defect). The menu
// content is themed through --surface-overlay and is the documented best-effort residual
// (Phase-B portal precedent).

export const Dark: Story = { globals: { theme: "dark" } };

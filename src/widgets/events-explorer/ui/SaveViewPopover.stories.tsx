import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";

import messages from "../../../../messages/en.json";

import { SaveViewPopover } from "./SaveViewPopover";

/**
 * ADR 0036/0042 axe coverage for the re-skinned save-view control (ADR 0099). The
 * popover content portals to `body` (outside the story canvas), so the closed trigger is
 * the covered surface; the open input/error tokens are the documented best-effort residual
 * (the Phase-B portal precedent).
 */
const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <Story />
  </NextIntlClientProvider>
);

const meta = {
  component: SaveViewPopover,
  parameters: { layout: "padded" },
  decorators: [withIntl],
  args: { onSave: fn(), isPending: false },
} satisfies Meta<typeof SaveViewPopover>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The closed trigger. */
export const Default: Story = {};

/** The save in flight — the trigger stays enabled; the submit disables in the popover. */
export const Pending: Story = { args: { isPending: true } };

// NOTE: no open-popover play. Opening a Radix portal in an isolated story makes Radix
// aria-hidden the story canvas while leaving the trigger focusable, which trips axe's
// aria-hidden-focus rule (a Storybook-isolation artifact, not an app defect). The popover
// content is themed through --surface-overlay and is the documented best-effort residual,
// verified by computation + the human Chromatic re-baseline (the Phase-B CommandPalette
// precedent). The closed trigger is the axe-covered surface here.

export const Dark: Story = { globals: { theme: "dark" } };

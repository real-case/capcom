import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";

import messages from "../../../../messages/en.json";

import { ColumnsMenu } from "./ColumnsMenu";

/**
 * ADR 0036/0042 axe coverage for the re-skinned column-visibility control (ADR 0099). The
 * dropdown content portals to `body`, so the closed trigger is the covered surface; the
 * open menu labels are the documented best-effort residual (the Phase-B portal precedent).
 */
const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <Story />
  </NextIntlClientProvider>
);

const meta = {
  component: ColumnsMenu,
  parameters: { layout: "padded" },
  decorators: [withIntl],
  args: { hidden: [], onToggle: fn() },
} satisfies Meta<typeof ColumnsMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The closed trigger, all columns shown. */
export const Default: Story = {};

/** Some columns hidden — the trigger reflects the count. */
export const SomeHidden: Story = { args: { hidden: ["plan", "properties"] } };

// NOTE: no open-menu play — opening a Radix dropdown in an isolated story trips axe's
// aria-hidden-focus rule (Radix aria-hidden's the still-focusable trigger's canvas; a
// Storybook-isolation artifact, not an app defect). The menu content is themed through
// --surface-overlay and is the documented best-effort residual (Phase-B portal precedent).

export const Dark: Story = { globals: { theme: "dark" } };

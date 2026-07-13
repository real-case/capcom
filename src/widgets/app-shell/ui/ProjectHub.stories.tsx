import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";

import messages from "../../../../messages/en.json";

import { ProjectHub } from "./ProjectHub";

/**
 * ADR 0036/0042: colocated CSF 3 stories for the project hub — the designed grid of
 * analysis surfaces that replaces the PR-2 placeholder — re-skinned onto the mission-control
 * surface (ADR 0099): the shadcn `Card` is now the `Panel` primitive on the `--surface-*`
 * tokens. Presentational (whole-Panel links, no data fetching or interaction beyond
 * navigation), so no `play` is required (ADR 0038); the axe gate (ADR 0039) covers the panel
 * semantics and focus order in both compositions (the toolbar drives `[data-theme]`,
 * preview.tsx). next-intl messages come from the canonical catalog so the copy matches
 * production (ADR 0030). The grid sits on `--surface-background` as it does in the shell.
 */
const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <div className="bg-surface-background mx-auto max-w-5xl p-6">
      <Story />
    </div>
  </NextIntlClientProvider>
);

const meta = {
  component: ProjectHub,
  parameters: { layout: "fullscreen" },
  decorators: [withIntl],
  args: { projectId: "p1" },
} satisfies Meta<typeof ProjectHub>;

export default meta;
type Story = StoryObj<typeof meta>;

// The six analysis surfaces, each a whole-card link.
export const Default: Story = {};

// The same grid on the dark composition (ADR 0092), forced so the a11y run checks it too.
export const Dark: Story = { globals: { theme: "dark" } };

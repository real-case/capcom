import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Panel } from "./panel";

// ADR 0036/0042: colocated CSF 3 stories. `container` is presentational — no play
// required (ADR 0038). Panel is the mission-control surface container (ADR 0099/0081);
// the three `surface` values are the ordered elevation scale.
const meta = {
  component: Panel,
  parameters: { layout: "centered" },
  args: { children: "Panel", className: "w-64" },
} satisfies Meta<typeof Panel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Elevated: Story = {
  args: { surface: "elevated", children: "Elevated" },
};

export const Overlay: Story = {
  args: { surface: "overlay", children: "Overlay" },
};

// Elevation overview — the three surface levels on the page background.
export const AllSurfaces: Story = {
  render: (args) => (
    <div className="bg-surface-background flex flex-col gap-4 p-6">
      <Panel {...args} surface="panel">
        panel
      </Panel>
      <Panel {...args} surface="elevated">
        elevated
      </Panel>
      <Panel {...args} surface="overlay">
        overlay
      </Panel>
    </div>
  ),
};

// contentBounds:max-content + line-wrap — long content grows and wraps within the panel.
export const LongContent: Story = {
  args: {
    children:
      "A long stretch of console copy that grows the panel to its content and wraps onto multiple lines within the fixed width.",
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

// The light composition (ADR 0092) — now that the toolbar drives `[data-theme]` (preview.tsx),
// Panel flips to the light surface ramp; axe checks it too (ADR 0039).
export const Light: Story = {
  globals: { theme: "light" },
};

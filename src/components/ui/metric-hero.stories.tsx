import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";

import { MetricHero } from "./metric-hero";

// MetricHero renders bare mission-control text, so it must sit ON a mission-control
// surface to pair for AA — the ADR 0099 palette seam: `--text-*` pairs only with
// `--surface-*`, never the shadcn wrapper. This decorator provides surface-background and
// swaps the composition via `[data-theme="light"]` (ADR 0092) from the `mcTheme` param, so
// both the dark and light compositions clear the axe contrast gate (ADR 0039).
const onSurface: Decorator = (Story, ctx) => (
  <div
    data-theme={ctx.parameters.mcTheme as string | undefined}
    className="bg-surface-background p-8"
  >
    <Story />
  </div>
);

const meta = {
  component: MetricHero,
  parameters: { layout: "fullscreen" },
  args: { label: "Active users", children: "12,480" },
  decorators: [onSurface],
} satisfies Meta<typeof MetricHero>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const NoLabel: Story = {
  args: { label: undefined, children: "98.6%" },
};

// contentBounds:max-content — a long formatted value grows the hero on one line.
export const LongValue: Story = {
  args: { label: "Revenue · 30d", children: "$1,204,880.42" },
};

// Overview — a row of KPI heroes as the Overview home will compose them (Phase D).
export const KpiRow: Story = {
  render: (args) => (
    <div className="flex flex-wrap gap-10">
      <MetricHero {...args} label="Active users">
        12,480
      </MetricHero>
      <MetricHero {...args} label="New sign-ups">
        1,204
      </MetricHero>
      <MetricHero {...args} label="Conversion">
        98.6%
      </MetricHero>
    </div>
  ),
};

// The light composition (ADR 0092) — same surface, `[data-theme="light"]` swaps the ramp.
export const Light: Story = {
  parameters: { mcTheme: "light" },
};

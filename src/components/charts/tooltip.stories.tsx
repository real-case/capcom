import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import {
  ChartLiveRegion,
  ChartTooltip,
  ChartTooltipRow,
  ChartTooltipTitle,
} from "./tooltip";

// ADR 0036/0042: CSF 3 stories for the tooltip surface, pinned to a fixed OPEN state so
// Chromatic (ADR 0043) is deterministic — the determinism is the fixture's, not assumed.
// The floating box is decorative (`aria-hidden`); the accessible copy travels through the
// chart's focusable points + the live region (ADR 0039/0052), demoed in WithLiveRegion.

const VIZ = [
  "var(--color-viz-categorical-1)",
  "var(--color-viz-categorical-2)",
  "var(--color-viz-categorical-3)",
] as const;

const meta = {
  component: ChartTooltip,
  parameters: { layout: "centered" },
  // A relative, sized stage so the absolutely-positioned tooltip has room to sit.
  decorators: [
    (Story) => (
      <div className="relative h-40 w-[360px] rounded-md border border-border">
        <Story />
      </div>
    ),
  ],
  args: {
    open: true,
    left: 180,
    top: 140,
    children: (
      <>
        <ChartTooltipTitle>May 12, 2026</ChartTooltipTitle>
        <ChartTooltipRow color={VIZ[0]} name="mobile" value="1,204" />
        <ChartTooltipRow color={VIZ[1]} name="desktop" value="932" />
        <ChartTooltipRow color={VIZ[2]} name="tablet" value="118" />
      </>
    ),
  },
} satisfies Meta<typeof ChartTooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Open: Story = {};

export const SingleSeries: Story = {
  args: {
    children: (
      <>
        <ChartTooltipTitle>May 12, 2026</ChartTooltipTitle>
        <ChartTooltipRow color={VIZ[0]} name="page_view" value="2,254" />
      </>
    ),
  },
};

// The accessible sibling: a polite live region carrying the same content as text.
export const WithLiveRegion: Story = {
  render: (args) => (
    <>
      <ChartTooltip {...args} />
      <ChartLiveRegion message="May 12, 2026 — mobile 1,204, desktop 932, tablet 118" />
    </>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

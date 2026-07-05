import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Crosshair } from "./crosshair";

// ADR 0036/0042: CSF 3 stories for the focus line. It is SVG that lives inside a chart's
// plotting group, so the stories wrap it in a labelled <svg>. Presentational — no play
// (ADR 0038); deterministic coordinates keep Chromatic stable (ADR 0043).

const W = 320;
const H = 160;

const meta = {
  component: Crosshair,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label="Crosshair demo"
        className="rounded-md border border-border"
      >
        <Story />
      </svg>
    ),
  ],
  args: {
    x: 160,
    top: 12,
    bottom: H - 12,
    dots: [
      { key: "a", y: 48, color: "var(--color-viz-categorical-1)" },
      { key: "b", y: 96, color: "var(--color-viz-categorical-2)" },
    ],
  },
} satisfies Meta<typeof Crosshair>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// No dots — the bare focus line (e.g. a single-series chart before series resolve).
export const LineOnly: Story = {
  args: { dots: [] },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

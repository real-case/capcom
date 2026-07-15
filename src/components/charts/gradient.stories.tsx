import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { AreaGradient } from "./gradient";

// ADR 0036/0042: CSF 3 stories for the area-fill gradient. It is a <defs> entry, so the
// stories render it inside a labelled <svg> and paint a rect with `fill="url(#id)"` to
// make the fade visible. Presentational — no play (ADR 0038). Both stops derive from one
// `var(--color-viz-*)` token (ADR 0058/0081); the fade is opacity, so it reads in either
// theme (ADR 0092).

const W = 320;
const H = 120;

const meta = {
  component: AreaGradient,
  parameters: { layout: "centered" },
  decorators: [
    (Story) => (
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width={W}
        height={H}
        role="img"
        aria-label="Area gradient demo"
        className="rounded-md border border-border-hairline bg-surface-panel"
      >
        <Story />
        <rect x={0} y={0} width={W} height={H} fill="url(#demo-gradient)" />
      </svg>
    ),
  ],
  args: { id: "demo-gradient", color: "var(--color-viz-categorical-1)" },
} satisfies Meta<typeof AreaGradient>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const AltSeriesColor: Story = {
  args: { color: "var(--color-viz-categorical-4)" },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

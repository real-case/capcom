import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PacingCard } from "./PacingCard";

/**
 * ADR 0036/0042 axe coverage for the Overview goal cell (ADR 0099, the reference's b-goal):
 * the Panel, the radial gauge (a decorative aria-hidden SVG ring), the MetricHero centre
 * percent, and the four target-free kv rows, across states and in BOTH compositions. The ring
 * fill reads nominal/caution from the pacing sign; the copy is honest ("vs the previous
 * period", never a target). Presentational — no play.
 */
const ROWS = [
  { label: "Revenue", value: "$41.2k" },
  { label: "Pace", value: "112%" },
  { label: "Purchasers", value: "1,204" },
  { label: "ARPU", value: "$23" },
];

const meta = {
  component: PacingCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[280px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "Goal pacing",
    caption: "vs the previous period",
    pacingRatio: 1.12,
    rows: ROWS,
  },
} satisfies Meta<typeof PacingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ahead of the previous span's pace — nominal ring. */
export const AheadOfPace: Story = {};

/** Behind the previous span's pace — caution ring. */
export const BehindPace: Story = {
  args: {
    pacingRatio: 0.78,
    rows: [
      { label: "Revenue", value: "$28.4k" },
      { label: "Pace", value: "78%" },
      { label: "Purchasers", value: "890" },
      { label: "ARPU", value: "$19" },
    ],
  },
};

export const Loading: Story = { args: { isLoading: true } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

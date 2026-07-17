import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { SegmentScatterPoint } from "@/entities/segment";

import { SegmentScatter } from "./SegmentScatter";

/**
 * ADR 0036/0042 axe coverage for the Overview segment-scatter cell (ADR 0086/0099): the Panel,
 * the eyebrow, and the visx scatter, across states and in BOTH compositions. Deterministic
 * pseudonymous fixtures (ADR 0083 — no real identity). Presentational — no play.
 */
const PLANS = ["enterprise", "free", "pro"];
const DATA: SegmentScatterPoint[] = Array.from({ length: 60 }, (_, i) => ({
  distinct_id: `u${i}`,
  frequency: 2 + ((i * 7) % 40),
  ltv: (i % 5 === 0 ? 0 : 20 + ((i * 13) % 180)) as number,
  plan: PLANS[i % PLANS.length]!,
}));

const meta = {
  component: SegmentScatter,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[600px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    data: DATA,
    label: "Segments · freq × LTV",
    chartLabel: "Segment scatter of frequency against lifetime value",
    xLabel: "Frequency",
    yLabel: "LTV",
  },
} satisfies Meta<typeof SegmentScatter>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { data: [] } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

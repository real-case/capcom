import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { EventTrendBucket } from "@/entities/event";

import { StackedBars } from "./StackedBars";

/**
 * ADR 0036/0042 axe coverage for the Overview stacked-bars cell (ADR 0086/0099): the Panel,
 * the eyebrow, and the visx BarStack, across states and in BOTH compositions. Deterministic
 * fixtures for a stable snapshot. Presentational — no play (a single role="img" summary).
 */
const WEEK = Date.UTC(2026, 3, 1);
const PLANS = ["enterprise", "free", "pro"];
const DATA: EventTrendBucket[] = PLANS.flatMap((series, s) =>
  Array.from({ length: 8 }, (_, i) => ({
    bucket: new Date(WEEK + i * 7 * 86_400_000).toISOString(),
    series,
    count: 10 + ((i * 5 + s * 7) % 22),
  })),
);

const meta = {
  component: StackedBars,
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
    label: "Sign-ups by plan",
    chartLabel: "Sign-ups by plan, stacked over time",
  },
} satisfies Meta<typeof StackedBars>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { data: [] } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

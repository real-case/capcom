import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { EventTrendBucket } from "@/entities/event";

import { HeroChart } from "./HeroChart";

/**
 * ADR 0036/0042 axe coverage for the Overview hero cell (ADR 0086/0099): the Panel, the
 * MetricHero headline + delta chip, the legend, and the multi-series area chart, across states
 * and in BOTH compositions. Deterministic fixtures for a stable snapshot. Presentational — no
 * play; the chart is a single role="img" summary.
 */
const DAY = Date.UTC(2026, 5, 1);
const PLANS = ["enterprise", "free", "pro"];
const DATA: EventTrendBucket[] = PLANS.flatMap((series, s) =>
  Array.from({ length: 12 }, (_, i) => ({
    bucket: new Date(DAY + i * 86_400_000).toISOString(),
    series,
    count: 40 + i * (s + 2) + ((i * 7 + s * 5) % 30),
  })),
);

const meta = {
  component: HeroChart,
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
    label: "Active users",
    value: "48,210",
    delta: "+8%",
    deltaUp: true,
    chartLabel: "Active users by plan over time",
  },
} satisfies Meta<typeof HeroChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { data: [] } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

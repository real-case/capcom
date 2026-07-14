import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { OverviewSignalBucket } from "@/entities/event";

import { SignalChart } from "./SignalChart";

/**
 * ADR 0036/0042 axe coverage for the Overview signal sparkline (ADR 0086/0099): a token-only
 * visx area/line and its loading / empty / error state boxes, in BOTH compositions. Data is
 * fixed and deterministic so the Chromatic snapshot is stable (ADR 0043). Presentational —
 * no play; the chart is a single role="img" with a summary label (no per-datum a11y).
 */

// A fixed rising series over 10 daily buckets — deterministic, no live clock.
const DATA: OverviewSignalBucket[] = Array.from({ length: 10 }, (_, i) => ({
  bucket: new Date(Date.UTC(2026, 5, 1 + i)).toISOString(),
  active_users: 40 + i * 6 + (i % 3) * 4,
  new_signups: 8 + i * 2,
  value_sum: 120 + i * 45,
}));

const meta = {
  component: SignalChart,
  parameters: { layout: "padded" },
  args: {
    data: DATA,
    measure: "active_users",
    label: "Active users",
    color: "var(--color-viz-categorical-1)",
  },
} satisfies Meta<typeof SignalChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

/** An all-zero series reads as empty (nothing to plot). */
export const Empty: Story = {
  args: { data: DATA.map((d) => ({ ...d, active_users: 0 })) },
};

export const Loading: Story = { args: { isLoading: true } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

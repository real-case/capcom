import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { OverviewSignalBucket } from "@/entities/event";

import { SignalChart } from "./SignalChart";

/**
 * ADR 0036/0042 axe coverage for the Overview mini sparkline (ADR 0086/0099): a token-only
 * visx area/line and its loading / empty / error state boxes, in BOTH compositions, rendered
 * on a `bg-surface-panel` decorator (the Phase-E rule — the state-box text must be measured
 * against the mission-control surface, not the shadcn `--background`). The chart itself is
 * `aria-hidden` (decorative — the mini's metric announces the value); the state boxes carry
 * their own role. Deterministic fixtures for a stable snapshot. Presentational — no play.
 */

// A fixed rising series over 10 daily buckets — deterministic, no live clock.
const DATA: OverviewSignalBucket[] = Array.from({ length: 10 }, (_, i) => ({
  bucket: new Date(Date.UTC(2026, 5, 1 + i)).toISOString(),
  active_users: 40 + i * 6 + (i % 3) * 4,
  new_signups: 8 + i * 2,
  value_sum: 120 + i * 45,
  purchasers: 3 + (i % 4),
}));

const meta = {
  component: SignalChart,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[260px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: { data: DATA, measure: "new_signups" },
} satisfies Meta<typeof SignalChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

/** The derived conversion measure — purchasers / active_users per bucket. */
export const Conversion: Story = { args: { measure: "conversion" } };

/** The derived ARPU measure — value_sum / active_users per bucket. */
export const Arpu: Story = { args: { measure: "arpu" } };

/** An all-zero series reads as empty (nothing to plot). */
export const Empty: Story = {
  args: { data: DATA.map((d) => ({ ...d, new_signups: 0 })) },
};

export const Loading: Story = { args: { isLoading: true } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

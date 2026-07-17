import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { OverviewSignalBucket } from "@/entities/event";

import { KpiCard } from "./KpiCard";

/**
 * ADR 0036/0042 axe coverage for the Overview `.panel.mini` (ADR 0099): the Panel surface, the
 * MonoData metric, the delta StatusIndicator, and the decorative sparkline, across states and
 * in BOTH compositions (light default + a Dark story). The card renders its own
 * `--surface-panel`, so the mission-control text pairs for AA (the ADR 0099 palette seam);
 * the extra decorator keeps parity with the sibling cell stories. Presentational — no play.
 */
const SIGNAL: OverviewSignalBucket[] = Array.from({ length: 10 }, (_, i) => ({
  bucket: new Date(Date.UTC(2026, 5, 1 + i)).toISOString(),
  active_users: 40 + i * 6 + (i % 3) * 4,
  new_signups: 8 + i * 2,
  value_sum: 120 + i * 45,
  purchasers: 3 + (i % 4),
}));

const meta = {
  component: KpiCard,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[280px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    label: "New sign-ups",
    value: "3,940",
    deltaRatio: 0.124,
    deltaCaption: "vs the previous period",
    signalMeasure: "new_signups",
    signalData: SIGNAL,
    signalColor: "var(--color-viz-categorical-1)",
  },
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A favorable (↑) change — nominal delta chip. */
export const PositiveDelta: Story = {};

/** An unfavorable (↓) change — caution delta chip. */
export const NegativeDelta: Story = {
  args: {
    label: "Conversion",
    value: "14%",
    deltaRatio: -0.081,
    signalMeasure: "conversion",
    signalColor: "var(--color-viz-categorical-2)",
  },
};

/** No delta (null) — the value renders alone, no chip. */
export const NoDelta: Story = { args: { deltaRatio: null } };

export const Loading: Story = { args: { isLoading: true } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

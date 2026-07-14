import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { PacingCard } from "./PacingCard";

/**
 * ADR 0036/0042 axe coverage for the goal-pacing gauge (ADR 0099): the Panel surface, the
 * MetricHero pace percent, and the token'd progress bar (nominal ahead / caution behind), in
 * BOTH compositions. Presentational — no play.
 */
const meta = {
  component: PacingCard,
  parameters: { layout: "padded" },
  args: {
    label: "Goal pacing",
    pacingRatio: 1.06,
    caption: "revenue vs the previous period",
  },
} satisfies Meta<typeof PacingCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Ahead of the previous span's pace — a full, nominal bar. */
export const AheadOfPace: Story = {};

/** Behind the previous span's pace — a partial, caution bar. */
export const BehindPace: Story = { args: { pacingRatio: 0.78 } };

/** No previous revenue to pace against — an em dash, empty bar. */
export const Empty: Story = { args: { pacingRatio: null } };

export const Loading: Story = { args: { isLoading: true } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

export const BehindPaceDark: Story = {
  args: { pacingRatio: 0.78 },
  globals: { theme: "dark" },
};

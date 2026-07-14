import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { KpiCard } from "./KpiCard";

/**
 * ADR 0036/0042 axe coverage for the Overview KPI card (ADR 0099): the Panel surface, the
 * MetricHero value, and the delta StatusIndicator, across states and in BOTH compositions
 * (light default + a Dark story). Presentational — no play. The card renders on its own
 * `--surface-panel`, so the mission-control text pairs for AA (the ADR 0099 palette seam).
 */
const meta = {
  component: KpiCard,
  parameters: { layout: "padded" },
  args: {
    label: "Active users",
    value: "1,204",
    deltaRatio: 0.124,
    deltaCaption: "vs the previous period",
  },
} satisfies Meta<typeof KpiCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A favorable (↑) change — nominal delta chip. */
export const PositiveDelta: Story = {};

/** An unfavorable (↓) change — caution delta chip. */
export const NegativeDelta: Story = {
  args: { label: "Conversion", value: "14%", deltaRatio: -0.081 },
};

/** No comparable previous period — the value stands alone, no chip. */
export const NoDelta: Story = {
  args: { label: "ARPU", value: "$16", deltaRatio: null },
};

/** Empty data — a guarded null renders as an em dash, no chip. */
export const Empty: Story = {
  args: { label: "New sign-ups", value: "—", deltaRatio: null },
};

export const Loading: Story = {
  args: { isLoading: true, loadingLabel: "Loading…" },
};

export const Error: Story = {
  args: { isError: true, errorLabel: "Couldn’t load this metric." },
};

/** The dark composition (ADR 0092) — the toolbar theme drives `.dark` + `[data-theme]`. */
export const Dark: Story = { globals: { theme: "dark" } };

/** The error state's status-critical-fg on the surface, verified in dark too. */
export const ErrorDark: Story = {
  args: { isError: true, errorLabel: "Couldn’t load this metric." },
  globals: { theme: "dark" },
};

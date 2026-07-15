import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";

import { ChartLegend } from "./legend";

// ADR 0036/0042: CSF 3 stories for the legend. Two modes: a static list (no onToggle) and
// the interactive series-visibility toggle — the interactive archetype, so it ships a
// `play` (ADR 0038) asserting the toggle behavior (not the render) and the keyboard path
// (ADR 0039/0052). Swatch colors are viz tokens (ADR 0058/0081).

const SERIES = [
  { name: "mobile", color: "var(--color-viz-categorical-1)" },
  { name: "desktop", color: "var(--color-viz-categorical-2)" },
  { name: "tablet", color: "var(--color-viz-categorical-3)" },
];

const meta = {
  component: ChartLegend,
  parameters: { layout: "centered" },
  // Render on the mission-control surface so the axe run measures the legend's
  // text-text-secondary against --surface-panel, its real production surface (ADR 0099).
  decorators: [
    (Story) => (
      <div className="max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: { series: SERIES },
} satisfies Meta<typeof ChartLegend>;

export default meta;
type Story = StoryObj<typeof meta>;

// Static: no onToggle — a plain, non-interactive key (the degraded form).
export const Static: Story = {};

/** Interactive wrapper owning the hidden-set as local view-state (ADR 0026/0093). */
function Interactive() {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(new Set());
  const toggle = (name: string) =>
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  return <ChartLegend series={SERIES} hidden={hidden} onToggle={toggle} />;
}

export const InteractiveToggle: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mobile = canvas.getByRole("button", { name: /mobile/i });
    // Starts visible (pressed), toggles to hidden, and back.
    await expect(mobile).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(mobile);
    await expect(mobile).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(mobile);
    await expect(mobile).toHaveAttribute("aria-pressed", "true");
  },
};

// keyboard path (ADR 0039/0052): Tab reaches the first toggle, Enter flips it.
export const Keyboard: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mobile = canvas.getByRole("button", { name: /mobile/i });
    await userEvent.tab();
    await expect(mobile).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(mobile).toHaveAttribute("aria-pressed", "false");
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

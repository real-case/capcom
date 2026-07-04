import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor } from "storybook/test";

import { Calendar } from "./calendar";

// ADR 0036/0042: colocated CSF 3 stories over the picker's states in both themes.
// `selection-control` mandates the interaction axis, so a `play` drives day selection
// (ADR 0038). Dates are pinned for Chromatic determinism (ADR 0043) — no `new Date()`.
const meta = {
  component: Calendar,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Calendar>;

export default meta;
type Story = StoryObj<typeof meta>;

const MONTH = new Date(2026, 6, 1); // July 2026
const TODAY = new Date(2026, 6, 10);
const SELECTED = new Date(2026, 6, 10);
const RANGE = { from: new Date(2026, 6, 8), to: new Date(2026, 6, 14) };

// interaction:default + validation:pristine + unchecked — an unselected month grid.
export const Default: Story = {
  render: () => <Calendar mode="single" defaultMonth={MONTH} today={TODAY} />,
};

// validation:valid + checked — a single selected day.
export const Selected: Story = {
  render: () => (
    <Calendar
      mode="single"
      selected={SELECTED}
      defaultMonth={MONTH}
      today={TODAY}
    />
  ),
};

// indeterminate — the in-range middle days of a selected range.
export const RangeMode: Story = {
  render: () => (
    <Calendar
      mode="range"
      selected={RANGE}
      defaultMonth={MONTH}
      today={TODAY}
      numberOfMonths={1}
    />
  ),
};

// interaction:disabled — weekends disabled and skipped.
export const Disabled: Story = {
  render: () => (
    <Calendar
      mode="single"
      defaultMonth={MONTH}
      today={TODAY}
      disabled={{ dayOfWeek: [0, 6] }}
    />
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Calendar
      mode="single"
      selected={SELECTED}
      defaultMonth={MONTH}
      today={TODAY}
    />
  ),
};

// interaction (play, ADR 0038): clicking a day selects it (single mode).
export const Interact: Story = {
  render: () => <Calendar mode="single" defaultMonth={MONTH} today={TODAY} />,
  play: async ({ canvasElement }) => {
    let days: HTMLButtonElement[] = [];
    await waitFor(() => {
      days = Array.from(
        canvasElement.querySelectorAll<HTMLButtonElement>(
          "button[data-day]:not([disabled])",
        ),
      );
      expect(days.length).toBeGreaterThan(20);
    });
    const target = days[15]!;
    await userEvent.click(target);
    await waitFor(() =>
      expect(
        canvasElement.querySelector('[data-selected-single="true"]'),
      ).not.toBeNull(),
    );
  },
};

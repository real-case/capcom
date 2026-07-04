import * as React from "react";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import type { DateRange } from "react-day-picker";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { DateRangePicker } from "./date-range-picker";

// ADR 0036/0042: colocated CSF 3 stories over the picker's states in both themes.
// `selection-control` mandates the interaction axis, so a `play` drives open + range
// selection (ADR 0038). Dates are pinned for Chromatic determinism (ADR 0043): every
// value-bearing story fixes from/to, and the no-value stories (Default/Disabled) keep the
// popover CLOSED so no month grid renders. NOTE: a future "open with an empty range" story
// would fall back to `new Date()` (date-range-picker.tsx defaultMonth={value?.from}) — pin
// the month there.
const meta = {
  component: DateRangePicker,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DateRangePicker>;

export default meta;
type Story = StoryObj<typeof meta>;

const FROM = new Date(2026, 6, 8);
const TO = new Date(2026, 6, 14);
const COMPLETE: DateRange = { from: FROM, to: TO };
const PARTIAL: DateRange = { from: FROM };

// interaction:default + validation:pristine + unchecked — closed, showing the placeholder.
export const Default: Story = {
  render: () => (
    <div className="w-72">
      <DateRangePicker placeholder="Pick a date range" />
    </div>
  ),
};

// validation:valid + checked — a complete range on the closed trigger.
export const Selected: Story = {
  render: () => (
    <div className="w-72">
      <DateRangePicker value={COMPLETE} onValueChange={() => {}} />
    </div>
  ),
};

// indeterminate — a partial (from-only) range in progress.
export const PartialRange: Story = {
  render: () => (
    <div className="w-72">
      <DateRangePicker value={PARTIAL} onValueChange={() => {}} />
    </div>
  ),
};

// interaction:disabled.
export const Disabled: Story = {
  render: () => (
    <div className="w-72">
      <DateRangePicker disabled placeholder="Pick a date range" />
    </div>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <div className="w-72">
      <DateRangePicker value={COMPLETE} onValueChange={() => {}} />
    </div>
  ),
};

function Interactive() {
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(2026, 6, 10),
  });
  return (
    <div className="w-72">
      <DateRangePicker
        value={range}
        onValueChange={setRange}
        numberOfMonths={1}
      />
    </div>
  );
}

// interaction (play, ADR 0038): open the calendar, pick an end date, the trigger reflects
// the completed range.
export const Pick: Story = {
  render: () => <Interactive />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = await canvas.findByRole("button");
    await userEvent.click(trigger);
    // The range-mode Calendar is portalled to the body; complete the range on the 20th.
    const endDay = await screen.findByText("20");
    await userEvent.click(endDay);
    await waitFor(() => expect(trigger).toHaveTextContent("–"));
  },
};

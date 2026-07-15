import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { TopEvent } from "@/entities/event";

import { TopEventsBar } from "./TopEventsBar";

// ADR 0036/0042: colocated CSF 3 stories covering default / empty / loading / error /
// overflow, plus the ADR 0093 interaction: a pinned-open tooltip (deterministic for
// Chromatic, ADR 0043) and a focus play (ADR 0038/0039/0052). Deterministic fixtures;
// bar fill from a viz token (ADR 0081).

const DEFAULT: TopEvent[] = [
  { event_name: "page_view", count: 2757 },
  { event_name: "feature_used", count: 2419 },
  { event_name: "search", count: 1176 },
  { event_name: "sign_up", count: 245 },
  { event_name: "purchase", count: 189 },
];

const meta = {
  component: TopEventsBar,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[680px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: { data: DEFAULT, label: "Top events in range" },
} satisfies Meta<typeof TopEventsBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { data: [] },
};

export const Loading: Story = {
  args: { data: [], isLoading: true },
};

export const Error: Story = {
  args: { data: [], isError: true },
};

// data-edge: many events with a long label — exercises the overflow / label width.
export const Overflow: Story = {
  args: {
    data: Array.from({ length: 12 }, (_, i) => ({
      event_name: `event_name_number_${i + 1}`,
      count: (12 - i) * 137,
    })),
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

// Interaction (ADR 0093): a bar's tooltip pinned open for a deterministic snapshot.
export const FocusedReadout: Story = {
  args: { initialFocusIndex: 1 },
};

// interaction/keyboard (play, ADR 0038/0039/0052): each bar is focusable and its
// aria-label carries its value (the sole keyboard announcement — no live region).
export const FocusBar: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bar = await canvas.findByRole("img", { name: /page_view: 2,757/i });
    bar.focus();
    await expect(bar).toHaveFocus();
    await userEvent.tab();
    await expect(bar).not.toHaveFocus();
  },
};

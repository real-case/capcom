import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { TopEvent } from "@/entities/event";

import { TopEventsBar } from "./TopEventsBar";

// ADR 0036/0042: colocated CSF 3 stories covering default / empty / loading / error /
// overflow. Presentational — no play (ADR 0038). Deterministic fixtures (ADR 0043);
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
      <div className="w-[680px] max-w-full">
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

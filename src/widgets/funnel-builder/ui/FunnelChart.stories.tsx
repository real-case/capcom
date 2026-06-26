import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FunnelStep } from "@/entities/event";

import { FunnelChart } from "./FunnelChart";

// ADR 0036/0042: colocated CSF 3 stories covering default / empty / loading / error /
// overflow. Presentational — no play (ADR 0038). Deterministic fixtures (ADR 0043); bar
// fill from a viz token (ADR 0081). Counts are non-increasing down the steps, matching
// the funnel invariant (ADR 0087).

const DEFAULT: FunnelStep[] = [
  { step_index: 1, step_event: "page_view", users: 160 },
  { step_index: 2, step_event: "sign_up", users: 114 },
  { step_index: 3, step_event: "feature_used", users: 111 },
  { step_index: 4, step_event: "purchase", users: 35 },
];

const meta = {
  component: FunnelChart,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[680px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: { data: DEFAULT, label: "Funnel conversion by step" },
} satisfies Meta<typeof FunnelChart>;

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

// data-edge: the max step count with long event names — exercises label width and the
// tall layout (ADR 0087 caps the UI at 6 steps).
export const Overflow: Story = {
  args: {
    data: Array.from({ length: 6 }, (_, i) => ({
      step_index: i + 1,
      step_event: `some_long_event_name_step_${i + 1}`,
      users: Math.round(1000 * Math.pow(0.6, i)),
    })),
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

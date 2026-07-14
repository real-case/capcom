import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import type { FunnelStep } from "@/entities/event";

import { FunnelChart } from "./FunnelChart";

// ADR 0036/0042: colocated CSF 3 stories covering default / empty / loading / error /
// overflow, plus the ADR 0093 interaction: a pinned-open step tooltip (deterministic for
// Chromatic, ADR 0043) and a focus play (ADR 0038/0039/0052). Deterministic fixtures; bar
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
      <div className="w-[680px] max-w-full rounded-lg bg-surface-panel p-4">
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

// Interaction (ADR 0093): a step's conversion tooltip pinned open for a deterministic snapshot.
export const FocusedStep: Story = {
  args: { initialFocusIndex: 1 },
};

// interaction/keyboard (play, ADR 0038/0039/0052): each step is focusable and its
// aria-label states its conversion (the sole keyboard announcement — no live region).
export const FocusStep: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const step = await canvas.findByRole("img", { name: /2\. sign_up/i });
    step.focus();
    await expect(step).toHaveFocus();
  },
};

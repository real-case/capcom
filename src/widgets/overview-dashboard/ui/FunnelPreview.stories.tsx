import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { FunnelStep } from "@/entities/event";

import { FunnelPreview } from "./FunnelPreview";

/**
 * ADR 0036/0042 axe coverage for the Overview activation-funnel cell (ADR 0086/0099): the
 * Panel, the overall %, and the three proportional gradient steps, across states and in BOTH
 * compositions. Deterministic fixtures. Presentational — no play.
 */
const DATA: FunnelStep[] = [
  { step_index: 0, step_event: "page_view", users: 128_400 },
  { step_index: 1, step_event: "sign_up", users: 41_980 },
  { step_index: 2, step_event: "feature_used", users: 18_240 },
];

const STEP_LABELS = {
  page_view: "Visited",
  sign_up: "Signed up",
  feature_used: "Activated",
};

const meta = {
  component: FunnelPreview,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: {
    data: DATA,
    label: "Activation funnel",
    stepLabels: STEP_LABELS,
    overallLabel: "overall",
    fromPrevLabel: "from previous step",
  },
} satisfies Meta<typeof FunnelPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithData: Story = {};

export const Loading: Story = { args: { isLoading: true } };

export const Empty: Story = { args: { data: [] } };

export const Error: Story = { args: { isError: true } };

export const Dark: Story = { globals: { theme: "dark" } };

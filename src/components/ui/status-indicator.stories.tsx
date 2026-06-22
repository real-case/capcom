import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { StatusIndicator } from "./status-indicator";

// ADR 0036/0042: colocated CSF 3 stories. categorical-indicator is presentational —
// no play required. The four levels are the ordered risk axis (ADR 0081 status palette).
const meta = {
  component: StatusIndicator,
  parameters: { layout: "centered" },
  args: { children: "Nominal" },
} satisfies Meta<typeof StatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Nominal: Story = {};

export const Caution: Story = {
  args: { level: "caution", children: "Caution" },
};
export const Warning: Story = {
  args: { level: "warning", children: "Warning" },
};
export const Critical: Story = {
  args: { level: "critical", children: "Critical" },
};

// Ordered-severity overview.
export const AllLevels: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <StatusIndicator {...args} level="nominal">
        Nominal
      </StatusIndicator>
      <StatusIndicator {...args} level="caution">
        Caution
      </StatusIndicator>
      <StatusIndicator {...args} level="warning">
        Warning
      </StatusIndicator>
      <StatusIndicator {...args} level="critical">
        Critical
      </StatusIndicator>
    </div>
  ),
};

// contentBounds:max-content — a long status phrase grows to fit on one line.
export const LongLabel: Story = {
  args: { level: "warning", children: "Degraded — elevated p99 latency" },
};

// contentBounds:cjk — non-Latin script on a single line.
export const CJK: Story = { args: { level: "critical", children: "重大障害" } };

export const Dark: Story = {
  globals: { theme: "dark" },
};

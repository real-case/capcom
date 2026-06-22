import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Badge } from "./badge";

// ADR 0036/0042: colocated CSF 3 stories. categorical-indicator is presentational —
// no play required (its interaction axis is conditional, ADR 0038).
const meta = {
  component: Badge,
  parameters: { layout: "centered" },
  args: { children: "Stable" },
} satisfies Meta<typeof Badge>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Beta" },
};
export const Destructive: Story = {
  args: { variant: "destructive", children: "Down" },
};
export const Outline: Story = {
  args: { variant: "outline", children: "Draft" },
};

// Variant overview.
export const Overview: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Badge {...args} variant="default">
        Stable
      </Badge>
      <Badge {...args} variant="secondary">
        Beta
      </Badge>
      <Badge {...args} variant="destructive">
        Down
      </Badge>
      <Badge {...args} variant="outline">
        Draft
      </Badge>
    </div>
  ),
};

// contentBounds:max-content — a long token grows the badge to fit (no wrap).
export const LongLabel: Story = {
  args: { children: "deliberately-long-unbroken-status-token" },
};

// contentBounds:cjk — non-Latin script on a single line.
export const CJK: Story = { args: { children: "稼働中" } };

export const Dark: Story = {
  globals: { theme: "dark" },
};

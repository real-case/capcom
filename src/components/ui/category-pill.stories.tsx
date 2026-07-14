import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { CategoryPill } from "./category-pill";

// ADR 0036/0042: colocated CSF 3 stories. categorical-indicator is presentational —
// no play required (ADR 0038). The `hue` is a data-viz categorical token (ADR 0081);
// the dot is decorative (aria-hidden), so the pill announces its label only.
const meta = {
  component: CategoryPill,
  parameters: { layout: "centered" },
  args: { children: "pro", hue: "var(--color-viz-categorical-3)" },
} satisfies Meta<typeof CategoryPill>;

export default meta;
type Story = StoryObj<typeof meta>;

// contentBounds:min-content — a short value with its leading hue dot.
export const Default: Story = {};

// No hue — the pill renders as a plain themed chip with no dot.
export const NoHue: Story = {
  args: { hue: undefined, children: "unknown" },
};

// contentBounds:max-content — a long value grows the pill to fit (no wrap).
export const LongLabel: Story = {
  args: { children: "deliberately-long-unbroken-category-value" },
};

// contentBounds:cjk — non-Latin script on a single line.
export const CJK: Story = { args: { children: "企業版" } };

// The categorical hue scale across a few pills — the standing overview row.
export const Overview: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <CategoryPill {...args} hue="var(--color-viz-categorical-1)">
        free
      </CategoryPill>
      <CategoryPill {...args} hue="var(--color-viz-categorical-3)">
        pro
      </CategoryPill>
      <CategoryPill {...args} hue="var(--color-viz-categorical-5)">
        enterprise
      </CategoryPill>
    </div>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";

import { Hairline } from "./hairline";

// Hairline is a token-colored rule (no text ⇒ no contrast gate), but it must be visible on
// a mission-control surface. The decorator provides surface-background and swaps the
// composition via `[data-theme="light"]` (ADR 0092) from the `mcTheme` param.
const onSurface: Decorator = (Story, ctx) => (
  <div
    data-theme={ctx.parameters.mcTheme as string | undefined}
    className="bg-surface-background p-8"
  >
    <Story />
  </div>
);

const meta = {
  component: Hairline,
  parameters: { layout: "fullscreen" },
  decorators: [onSurface],
} satisfies Meta<typeof Hairline>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {
  render: (args) => (
    <div className="w-72">
      <Hairline {...args} />
    </div>
  ),
};

export const Divider: Story = {
  render: (args) => (
    <div className="w-72">
      <Hairline {...args} tone="divider" />
    </div>
  ),
};

export const Vertical: Story = {
  render: (args) => (
    <div className="h-16">
      <Hairline {...args} orientation="vertical" />
    </div>
  ),
};

// Semantic separator — `role="separator"` passes through for the a11y case.
export const SemanticSeparator: Story = {
  render: (args) => (
    <div className="w-72">
      <Hairline {...args} role="separator" aria-orientation="horizontal" />
    </div>
  ),
};

// The light composition (ADR 0092) — same surface, `[data-theme="light"]` swaps the ramp.
export const Light: Story = {
  parameters: { mcTheme: "light" },
  render: (args) => (
    <div className="w-72">
      <Hairline {...args} />
    </div>
  ),
};

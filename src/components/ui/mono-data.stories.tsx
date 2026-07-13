import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";

import { MonoData } from "./mono-data";

// MonoData renders bare mission-control text, so it sits ON a mission-control surface to
// pair for AA (the ADR 0099 seam). The decorator provides surface-background and swaps the
// composition via `[data-theme="light"]` (ADR 0092) from the `mcTheme` param — both
// compositions clear the axe contrast gate (ADR 0039).
const onSurface: Decorator = (Story, ctx) => (
  <div
    data-theme={ctx.parameters.mcTheme as string | undefined}
    className="bg-surface-background p-8"
  >
    <Story />
  </div>
);

const meta = {
  component: MonoData,
  parameters: { layout: "fullscreen" },
  args: { children: "0x7f3a91c2" },
  decorators: [onSurface],
} satisfies Meta<typeof MonoData>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {};

export const Secondary: Story = {
  args: { tone: "secondary", children: "2026-07-13T09:41:22Z" },
};

// contentBounds:max-content — a long technical value stays on one line (whitespace-nowrap).
export const LongValue: Story = {
  args: { children: "evt_0x7f3a91c2e4b6d8a05f1c3e9b27d4a6f8" },
};

// Tabular alignment — a stacked column of values lines up on the mono digits.
export const TabularColumn: Story = {
  render: (args) => (
    <div className="flex flex-col items-end gap-1">
      <MonoData {...args}>1,204,880</MonoData>
      <MonoData {...args}>98,640</MonoData>
      <MonoData {...args}>512</MonoData>
    </div>
  ),
};

// The light composition (ADR 0092) — same surface, `[data-theme="light"]` swaps the ramp.
export const Light: Story = {
  parameters: { mcTheme: "light" },
};

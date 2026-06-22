import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";

import { Button } from "./button";

// ADR 0036/0042: colocated CSF 3 stories covering the component's meaningful states.
// An interactive archetype (action-trigger) requires a `play` (ADR 0038) — see
// Clickable / Keyboard below.
const meta = {
  component: Button,
  parameters: { layout: "centered" },
  args: { children: "Button", onClick: fn() },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  args: { variant: "secondary", children: "Secondary" },
};
export const Outline: Story = {
  args: { variant: "outline", children: "Outline" },
};
export const Ghost: Story = { args: { variant: "ghost", children: "Ghost" } };
export const Destructive: Story = {
  args: { variant: "destructive", children: "Delete" },
};

// Size axis overview.
export const Sizes: Story = {
  render: (args) => (
    <div className="flex items-center gap-3">
      <Button {...args} size="sm">
        Small
      </Button>
      <Button {...args} size="default">
        Default
      </Button>
      <Button {...args} size="lg">
        Large
      </Button>
    </div>
  ),
};

// interaction:disabled — non-interactive, statically demonstrable.
export const Disabled: Story = { args: { disabled: true } };

// contentBounds:max-content — a long label grows the control to fit.
export const LongLabel: Story = {
  args: { children: "Acknowledge and dispatch recovery procedure" },
};

// contentBounds:cjk — non-Latin script renders on the same single line.
export const CJK: Story = { args: { children: "確認して送信" } };

export const Dark: Story = {
  globals: { theme: "dark" },
};

// interaction (play, ADR 0038): a click fires the handler. Assert behavior, not render.
export const Clickable: Story = {
  args: { children: "Save" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Save" });
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

// keyboard path (ADR 0039/0052): Tab reaches it, Enter activates it.
export const Keyboard: Story = {
  args: { children: "Save" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: "Save" });
    await userEvent.tab();
    await expect(button).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    await expect(args.onClick).toHaveBeenCalledTimes(1);
  },
};

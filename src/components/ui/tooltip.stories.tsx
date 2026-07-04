import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, within } from "storybook/test";

import { Button } from "./button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./tooltip";

// ADR 0036/0042: colocated CSF 3 stories over the disclosure's meaningful states in
// both themes. `disclosure` mandates the interaction axis, so a `play` drives the
// hover/focus reveal (ADR 0038). Every story is wrapped in a TooltipProvider.
const meta = {
  component: Tooltip,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

// interaction:default / collapsed / min-content — the resting trigger.
export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Refresh the report</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

// expanded — the revealed tooltip (statically rendered via defaultOpen).
export const Open: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Refresh the report</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

// contentBounds:max-content / line-wrap — a long label wraps within max-w.
export const RichContent: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="outline">Conversion window</Button>
        </TooltipTrigger>
        <TooltipContent>
          The maximum time a profile has to complete every step of the funnel
          before the conversion no longer counts.
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <TooltipProvider>
      <Tooltip defaultOpen>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Refresh the report</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};

// interaction (play, ADR 0038/0039): focusing the trigger via the keyboard reveals the
// tooltip (WCAG 2.2 §1.4.13 — focus-reachable, not hover-only).
export const Reveal: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Refresh</Button>
        </TooltipTrigger>
        <TooltipContent>Refresh the report</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Refresh" });
    await userEvent.tab();
    await expect(trigger).toHaveFocus();
    // Radix renders the label into a portal; assert presence (visibility races
    // the fade, frozen only for Chromatic, ADR 0043).
    const tip = await screen.findAllByText("Refresh the report");
    await expect(tip.length).toBeGreaterThan(0);
  },
};

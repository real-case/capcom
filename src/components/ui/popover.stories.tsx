import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./button";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "./popover";

// ADR 0036/0042: colocated CSF 3 stories over the disclosure's meaningful states
// (collapsed/expanded, min/max content) in both themes. The interaction axis is
// mandatory for `disclosure`, so a `play` drives open/close (ADR 0038).
const meta = {
  component: Popover,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Popover>;

export default meta;
type Story = StoryObj<typeof meta>;

// interaction:default / collapsed / min-content — the resting, closed trigger.
export const Default: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Popover title</PopoverTitle>
          <PopoverDescription>
            A floating surface anchored to its trigger.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

// expanded — the open surface (statically rendered via defaultOpen).
export const Open: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline">Open settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Popover title</PopoverTitle>
          <PopoverDescription>
            A floating surface anchored to its trigger.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

// contentBounds:max-content / line-wrap — long, wrapping content grows the surface.
export const RichContent: Story = {
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline">Notification preferences</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Notification preferences</PopoverTitle>
          <PopoverDescription>
            Choose how and when CAPCOM notifies you about changes to the events,
            funnels, and cohorts you follow across every project you can access.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Popover defaultOpen>
      <PopoverTrigger asChild>
        <Button variant="outline">Open settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Popover title</PopoverTitle>
          <PopoverDescription>
            A floating surface anchored to its trigger.
          </PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
};

// interaction (play, ADR 0038): the trigger opens the surface, Escape closes it and
// returns focus. Content is portalled to the body, so it is queried via `screen`.
export const Toggle: Story = {
  render: () => (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">Open settings</Button>
      </PopoverTrigger>
      <PopoverContent>
        <PopoverHeader>
          <PopoverTitle>Popover title</PopoverTitle>
          <PopoverDescription>Anchored floating surface.</PopoverDescription>
        </PopoverHeader>
      </PopoverContent>
    </Popover>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Open settings" });
    await userEvent.click(trigger);
    // Presence in the DOM proves the open behavior; visibility races the enter
    // animation (frozen only for Chromatic, ADR 0043).
    await expect(await screen.findByText("Popover title")).toBeInTheDocument();
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByText("Popover title")).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
  },
};

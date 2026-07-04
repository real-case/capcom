import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "./dropdown-menu";

// ADR 0036/0042: colocated CSF 3 stories over the menu's states in both themes.
// `collection` mandates the interaction axis, so a `play` drives open + activate
// (ADR 0038).
const meta = {
  component: DropdownMenu,
  parameters: { layout: "centered" },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function Menu() {
  return (
    <>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">Report actions</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem>
          New report
          <DropdownMenuShortcut>⌘N</DropdownMenuShortcut>
        </DropdownMenuItem>
        <DropdownMenuItem>Duplicate</DropdownMenuItem>
        <DropdownMenuItem>Share</DropdownMenuItem>
        <DropdownMenuItem disabled>Archive</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive">Delete</DropdownMenuItem>
      </DropdownMenuContent>
    </>
  );
}

// interaction:default + disabled — an open menu with a disabled and a destructive item.
export const Default: Story = {
  render: () => (
    <DropdownMenu defaultOpen modal={false}>
      <Menu />
    </DropdownMenu>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <DropdownMenu defaultOpen modal={false}>
      <Menu />
    </DropdownMenu>
  ),
};

// interaction (play, ADR 0038): the trigger opens the menu and an item is reachable.
export const Open: Story = {
  render: () => (
    <DropdownMenu modal={false}>
      <Menu />
    </DropdownMenu>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Report actions" });
    await userEvent.click(trigger);
    // The menu is portalled to the body.
    const share = await screen.findByRole("menuitem", { name: "Share" });
    await expect(share).toBeInTheDocument();
    await expect(
      screen.getByRole("menuitem", { name: "Archive" }),
    ).toHaveAttribute("aria-disabled", "true");
    // Keyboard: Escape closes the menu and returns focus to the trigger (ADR 0039).
    await userEvent.keyboard("{Escape}");
    await waitFor(() =>
      expect(
        screen.queryByRole("menuitem", { name: "Share" }),
      ).not.toBeInTheDocument(),
    );
    await expect(trigger).toHaveFocus();
  },
};

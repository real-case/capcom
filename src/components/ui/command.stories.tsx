import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./command";

// ADR 0036/0042: colocated CSF 3 stories over the collection's data + interaction states
// in both themes. `collection` mandates the interaction axis, so a `play` drives the
// type-to-filter behavior (ADR 0038).
const meta = {
  component: Command,
  parameters: {
    layout: "centered",
    // Narrow, documented a11y rule exclusion (ADR 0039): cmdk renders its options inside
    // a role-less `[cmdk-list-sizer]` wrapper between the `role="listbox"` and its
    // `role="option"` rows, which trips axe's strict `aria-required-children` even though
    // the options ARE exposed to assistive tech (an upstream cmdk structural quirk). Only
    // this one rule is disabled — the full axe pass still runs on every other rule.
    a11y: {
      options: {
        rules: { "aria-required-children": { enabled: false } },
      },
    },
  },
} satisfies Meta<typeof Command>;

export default meta;
type Story = StoryObj<typeof meta>;

// data:many / overflow + interaction:default + disabled — a populated, scrolling menu.
export const Default: Story = {
  render: () => (
    <Command
      aria-label="Command menu"
      className="w-80 rounded-lg border border-border"
    >
      <CommandInput
        aria-label="Search commands"
        placeholder="Type a command…"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Analysis">
          <CommandItem>Trends</CommandItem>
          <CommandItem>Funnels</CommandItem>
          <CommandItem>Retention</CommandItem>
          <CommandItem>Segments</CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem>
            New report
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem>
            Share
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
          <CommandItem disabled>Export (coming soon)</CommandItem>
          <CommandItem>Open settings</CommandItem>
          <CommandItem>Invite teammate</CommandItem>
          <CommandItem>Switch project</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

// data:empty — a non-matching search surfaces the empty state.
export const Empty: Story = {
  render: () => (
    <Command
      aria-label="Command menu"
      className="w-80 rounded-lg border border-border"
    >
      <CommandInput
        aria-label="Search commands"
        placeholder="Type a command…"
        value="no such command"
        onValueChange={() => {}}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Analysis">
          <CommandItem>Trends</CommandItem>
          <CommandItem>Funnels</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Command
      aria-label="Command menu"
      className="w-80 rounded-lg border border-border"
    >
      <CommandInput
        aria-label="Search commands"
        placeholder="Type a command…"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Analysis">
          <CommandItem>Trends</CommandItem>
          <CommandItem>Funnels</CommandItem>
          <CommandItem>Retention</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
};

// interaction (play, ADR 0038): typing filters the list; a non-match shows the empty state.
export const Filter: Story = {
  render: () => (
    <Command
      aria-label="Command menu"
      className="w-80 rounded-lg border border-border"
    >
      <CommandInput
        aria-label="Search commands"
        placeholder="Type a command…"
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Analysis">
          <CommandItem>Trends</CommandItem>
          <CommandItem>Funnels</CommandItem>
          <CommandItem>Retention</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByLabelText("Search commands");
    await userEvent.type(input, "fun");
    await expect(canvas.getByText("Funnels")).toBeInTheDocument();
    await expect(canvas.queryByText("Trends")).not.toBeInTheDocument();
    await userEvent.clear(input);
    await userEvent.type(input, "zzzzz");
    await expect(canvas.getByText("No results found.")).toBeInTheDocument();
  },
};

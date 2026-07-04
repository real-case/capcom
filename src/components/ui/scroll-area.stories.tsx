import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { ScrollArea, ScrollBar } from "./scroll-area";

// ADR 0036/0042: colocated CSF 3 stories over the container's contentBounds states in
// both themes. Overflow (max-content) is the component's raison d'être. No interaction
// axis ⇒ no play required.
const meta = {
  component: ScrollArea,
  parameters: { layout: "centered" },
} satisfies Meta<typeof ScrollArea>;

export default meta;
type Story = StoryObj<typeof meta>;

const events = Array.from({ length: 40 }, (_, i) => `event_${i + 1}`);

// contentBounds:max-content — content overflows the fixed height, the scrollbar shows.
export const Default: Story = {
  render: () => (
    <ScrollArea
      aria-label="Tracked events"
      className="h-64 w-64 rounded-lg border border-border"
    >
      <ul className="p-3">
        {events.map((name) => (
          <li key={name} className="border-b border-border py-2 text-sm">
            {name}
          </li>
        ))}
      </ul>
    </ScrollArea>
  ),
};

// contentBounds:min-content — content fits, no scrollbar needed.
export const Fits: Story = {
  render: () => (
    <ScrollArea
      aria-label="Tracked events"
      className="h-64 w-64 rounded-lg border border-border"
    >
      <ul className="p-3">
        {events.slice(0, 4).map((name) => (
          <li key={name} className="border-b border-border py-2 text-sm">
            {name}
          </li>
        ))}
      </ul>
    </ScrollArea>
  ),
};

// horizontal overflow — the horizontal scrollbar affordance.
export const Horizontal: Story = {
  render: () => (
    <ScrollArea
      aria-label="Timeline"
      className="w-80 rounded-lg border border-border whitespace-nowrap"
    >
      <div className="flex gap-3 p-3">
        {events.slice(0, 20).map((name) => (
          <span
            key={name}
            className="rounded-md bg-muted px-3 py-2 text-sm text-foreground"
          >
            {name}
          </span>
        ))}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <ScrollArea
      aria-label="Tracked events"
      className="h-64 w-64 rounded-lg border border-border"
    >
      <ul className="p-3">
        {events.map((name) => (
          <li key={name} className="border-b border-border py-2 text-sm">
            {name}
          </li>
        ))}
      </ul>
    </ScrollArea>
  ),
};

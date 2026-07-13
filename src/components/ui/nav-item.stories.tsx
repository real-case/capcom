import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Table2 } from "lucide-react";

import { NavItem } from "./nav-item";

// NavItem is a mission-control primitive, so it sits ON a surface to pair for AA (the ADR 0099
// seam). The global theme toolbar drives both `.dark` and `[data-theme]` (preview.tsx), so the
// dark and light compositions flip with `globals: { theme }` — both clear the axe contrast gate
// (ADR 0039). An interactive archetype (action-trigger) requires a `play` (ADR 0038) — see
// Keyboard.
const onSurface: Decorator = (Story) => (
  <div className="bg-surface-background w-60 p-4">
    <Story />
  </div>
);

const meta = {
  component: NavItem,
  parameters: { layout: "centered" },
  args: { href: "#events", children: "Events" },
  decorators: [onSurface],
} satisfies Meta<typeof NavItem>;

export default meta;
type Story = StoryObj<typeof meta>;

// interaction:default + contentBounds:min-content.
export const Default: Story = {};

// The `active` prop — the current section (aria-current + active surface).
export const Current: Story = {
  args: {
    active: true,
    children: (
      <>
        <Table2 />
        Events
      </>
    ),
  },
};

// contentBounds:max-content — a long label grows the row within the sidebar width.
export const LongLabel: Story = {
  args: { children: "Acquisition retention cohorts" },
};

// contentBounds:cjk — non-Latin script renders on the same single row.
export const CJK: Story = { args: { children: "確認して送信" } };

// The dark composition (ADR 0092), forced so the a11y run checks it too.
export const Dark: Story = { globals: { theme: "dark" } };

// interaction (play, ADR 0038/0039): Tab reaches the link and focuses it.
export const Keyboard: Story = {
  args: { children: "Events" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const link = canvas.getByRole("link", { name: "Events" });
    await userEvent.tab();
    await expect(link).toHaveFocus();
  },
};

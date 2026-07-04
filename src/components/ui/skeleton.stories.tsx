import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { Skeleton } from "./skeleton";

// ADR 0036/0042: colocated CSF 3 stories in both themes. A presentational leaf
// (archetype: null) — no interaction, so no play required (ADR 0038).
const meta = {
  component: Skeleton,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

// The composing parent sizes each shape via className.
export const Default: Story = {
  render: () => (
    <div className="flex w-72 items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  ),
};

// A card-shaped loading placeholder.
export const CardPlaceholder: Story = {
  render: () => (
    <div className="flex w-72 flex-col gap-3 rounded-xl border border-border p-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <Skeleton className="h-5 w-1/2" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
    </div>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <div className="flex w-72 items-center gap-4">
      <Skeleton className="size-12 rounded-full" />
      <div className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  ),
};

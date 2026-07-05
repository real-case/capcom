import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";

import type { SegmentDistributionRow } from "@/entities/segment";

import { SegmentDistribution } from "./SegmentDistribution";

// ADR 0036/0042: colocated CSF 3 stories covering default / empty / loading / error /
// overflow, plus the ADR 0093 interaction: a pinned-open bucket tooltip (deterministic
// for Chromatic, ADR 0043) and a focus play (ADR 0038/0039/0052). Deterministic fixtures;
// bar fill from the categorical viz scale (ADR 0081). Rows are descending by users and sum
// to the segment size, matching the distribution invariants (ADR 0089).

const sum = (rows: SegmentDistributionRow[]) =>
  rows.reduce((n, r) => n + Number(r.users), 0);

const DEFAULT: SegmentDistributionRow[] = [
  { bucket: "US", users: 38 },
  { bucket: "GB", users: 21 },
  { bucket: "DE", users: 17 },
  { bucket: "FR", users: 12 },
  { bucket: "CA", users: 9 },
  { bucket: "(unknown)", users: 3 },
];

const meta = {
  component: SegmentDistribution,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[640px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: {
    data: DEFAULT,
    size: sum(DEFAULT),
    label: "Segment distribution by country",
    usersLabel: "matching users",
  },
} satisfies Meta<typeof SegmentDistribution>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// empty: a valid rule that matches nobody — size 0, no buckets (ADR 0089).
export const Empty: Story = {
  args: { data: [], size: 0 },
};

export const Loading: Story = {
  args: { data: [], isLoading: true },
};

export const Error: Story = {
  args: { data: [], isError: true },
};

// data-edge: every country bucket present — exercises the categorical palette cycling and
// the long-list layout. Deterministic (no live clock / random), stable for Chromatic.
export const Overflow: Story = {
  args: {
    data: (() => {
      const rows = [
        { bucket: "US", users: 64 },
        { bucket: "GB", users: 41 },
        { bucket: "DE", users: 33 },
        { bucket: "FR", users: 28 },
        { bucket: "CA", users: 22 },
        { bucket: "IN", users: 19 },
        { bucket: "BR", users: 15 },
        { bucket: "JP", users: 11 },
        { bucket: "AU", users: 8 },
        { bucket: "(unknown)", users: 4 },
      ];
      return rows;
    })(),
    size: 245,
    label: "Segment distribution by country (all buckets)",
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

// Interaction (ADR 0093): a bucket's tooltip pinned open for a deterministic snapshot.
export const FocusedBucket: Story = {
  args: { initialFocusIndex: 0 },
};

// interaction/keyboard (play, ADR 0038/0039/0052): each bucket is focusable and its
// aria-label states its share (the sole keyboard announcement — no live region).
export const FocusBucket: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const bucket = await canvas.findByRole("img", { name: /^US:/i });
    bucket.focus();
    await expect(bucket).toHaveFocus();
  },
};

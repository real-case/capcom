import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { RetentionCell } from "@/entities/event";

import { CohortGrid } from "./CohortGrid";

// ADR 0036/0042: colocated CSF 3 stories covering default / empty / loading / error /
// overflow. Presentational — no play (ADR 0038). Deterministic fixtures (ADR 0043); cell
// fill from the sequential viz scale (ADR 0081). Offset 0 is 100% and retained_users
// never exceeds cohort_size, matching the retention invariants (ADR 0088).

const WEEK_MS = 7 * 86_400_000;
const WEEK0 = Date.UTC(2026, 2, 23); // Mon 2026-03-23

/** Build a triangular cohort's cells from a list of per-offset retention rates. */
function cohort(
  period: string,
  size: number,
  rates: number[],
): RetentionCell[] {
  return rates.map((rate, offset) => ({
    cohort_period: period,
    cohort_size: size,
    period_offset: offset,
    retained_users: Math.round(size * rate),
  }));
}

const weekIso = (i: number) => new Date(WEEK0 + i * WEEK_MS).toISOString();

const DEFAULT: RetentionCell[] = [
  ...cohort(weekIso(0), 140, [1, 0.41, 0.33, 0.29, 0.24, 0.22]),
  ...cohort(weekIso(1), 156, [1, 0.45, 0.34, 0.3, 0.25]),
  ...cohort(weekIso(2), 132, [1, 0.5, 0.38, 0.31]),
  ...cohort(weekIso(3), 168, [1, 0.47, 0.36]),
  ...cohort(weekIso(4), 151, [1, 0.52]),
];

const meta = {
  component: CohortGrid,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[760px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: { data: DEFAULT, period: "week", label: "Retention cohort grid" },
} satisfies Meta<typeof CohortGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  args: { data: [] },
};

export const Loading: Story = {
  args: { data: [], isLoading: true },
};

export const Error: Story = {
  args: { data: [], isError: true },
};

// Monthly cohorts — exercises the alternate date label + header unit (ADR 0088).
export const Monthly: Story = {
  args: {
    period: "month",
    data: [
      ...cohort("2026-03-01T00:00:00+00:00", 412, [1, 0.38, 0.3, 0.27]),
      ...cohort("2026-04-01T00:00:00+00:00", 488, [1, 0.42, 0.33]),
      ...cohort("2026-05-01T00:00:00+00:00", 521, [1, 0.45]),
      ...cohort("2026-06-01T00:00:00+00:00", 376, [1]),
    ],
  },
};

// data-edge: the full dense triangle — 13 weekly cohorts up to 13 offsets, the signature
// infographic. Deterministic decay (no live clock / random), stable for Chromatic.
export const Overflow: Story = {
  args: {
    data: Array.from({ length: 13 }, (_, i) => {
      const maxOffset = 12 - i;
      const size = 90 + i * 7;
      const rates = Array.from({ length: maxOffset + 1 }, (_, o) =>
        o === 0 ? 1 : Math.max(0.05, 0.6 * Math.pow(0.88, o) + (i % 3) * 0.03),
      );
      return cohort(weekIso(i), size, rates);
    }).flat(),
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

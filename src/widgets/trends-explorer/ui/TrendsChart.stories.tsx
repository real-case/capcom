import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import type { EventTrendBucket } from "@/entities/event";

import { TrendsChart } from "./TrendsChart";

// ADR 0036/0042: colocated CSF 3 stories covering the meaningful states (default,
// multi-series, empty, loading, error, overflow). TrendsChart is presentational — no
// play required (ADR 0038). All fixtures are deterministic (no time/random) for
// Chromatic stability (ADR 0043). Series colors come from viz tokens (ADR 0081).

const DAY = 86_400_000;
const START = Date.UTC(2026, 4, 1); // fixed anchor — deterministic

/** N daily buckets of one series, counts from a fixed pattern (no randomness). */
function singleSeries(n: number, series = "page_view"): EventTrendBucket[] {
  return Array.from({ length: n }, (_, i) => ({
    bucket: new Date(START + i * DAY).toISOString(),
    series,
    count: (i * 7 + 3) % 50,
  }));
}

/** N daily buckets across several series — the breakdown shape. */
function multiSeries(n: number, names: string[]): EventTrendBucket[] {
  return names.flatMap((series, s) =>
    Array.from({ length: n }, (_, i) => ({
      bucket: new Date(START + i * DAY).toISOString(),
      series,
      count: (i * (s + 2) + s * 5) % 40,
    })),
  );
}

/** N daily buckets all at count 0 — a populated-but-empty window (zero-fill). */
function zeroFilled(n: number, series = "page_view"): EventTrendBucket[] {
  return Array.from({ length: n }, (_, i) => ({
    bucket: new Date(START + i * DAY).toISOString(),
    series,
    count: 0,
  }));
}

const meta = {
  component: TrendsChart,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[680px] max-w-full">
        <Story />
      </div>
    ),
  ],
  args: { data: singleSeries(14), label: "page_view over time" },
} satisfies Meta<typeof TrendsChart>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const MultiSeries: Story = {
  args: {
    data: multiSeries(14, ["mobile", "desktop", "tablet", "Other"]),
    label: "page_view by device",
  },
};

export const Empty: Story = {
  args: { data: [] },
};

export const Loading: Story = {
  args: { data: [], isLoading: true },
};

export const Error: Story = {
  args: { data: [], isError: true },
};

// data-edge: a long, dense window with many series (the overflow case).
export const Overflow: Story = {
  args: {
    data: multiSeries(90, [
      "mobile",
      "desktop",
      "tablet",
      "tv",
      "watch",
      "console",
      "kiosk",
      "other-1",
      "Other",
    ]),
    label: "page_view by device (dense)",
  },
};

// data-edge: a single bucket — the time domain is padded so the lone point still
// renders (a zero-width domain would otherwise collapse the line to x=0).
export const SingleBucket: Story = {
  args: { data: singleSeries(1), label: "page_view over time (one bucket)" },
};

// data-edge: a populated window where every bucket is 0 (the cross-tenant / no-signal
// shape) — distinct from Empty (no rows at all); the axis + flat line should render.
export const AllZero: Story = {
  args: { data: zeroFilled(14), label: "page_view over time (no signal)" },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

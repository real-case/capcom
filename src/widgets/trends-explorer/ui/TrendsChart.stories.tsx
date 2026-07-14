import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";

import type { EventTrendBucket } from "@/entities/event";

import { TrendsChart } from "./TrendsChart";

// ADR 0036/0042: colocated CSF 3 stories covering the meaningful states (default,
// multi-series, empty, loading, error, overflow) plus the ADR 0093 interaction layer:
// a pinned-open focused readout (deterministic for Chromatic, ADR 0043), an interactive
// legend toggle, and the keyboard inspection path (ADR 0038/0039/0052). All fixtures are
// deterministic (no time/random). Series colors come from viz tokens (ADR 0081).

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
      <div className="w-[680px] max-w-full rounded-lg bg-surface-panel p-4">
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

// Interaction (ADR 0093): the tooltip + crosshair pinned open at a fixed bucket, so the
// hover readout is captured deterministically by Chromatic (ADR 0043) rather than relying
// on a simulated pointer.
export const FocusedReadout: Story = {
  args: {
    data: multiSeries(14, ["mobile", "desktop", "tablet", "Other"]),
    label: "page_view by device",
    initialFocusIndex: 7,
  },
};

// interaction (play, ADR 0038): toggling a legend entry hides that series; assert the
// aria-pressed state flips (behavior, not render).
export const LegendToggle: Story = {
  args: {
    data: multiSeries(14, ["mobile", "desktop", "tablet"]),
    label: "page_view by device",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const mobile = await canvas.findByRole("button", { name: /mobile/i });
    await expect(mobile).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(mobile);
    await expect(mobile).toHaveAttribute("aria-pressed", "false");
  },
};

// keyboard path (ADR 0039/0052): the plot is focusable and Arrow keys move the focused
// bucket, which the live region announces.
export const KeyboardInspect: Story = {
  args: {
    data: multiSeries(14, ["mobile", "desktop"]),
    label: "page_view by device",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const plot = await canvas.findByRole("group", { name: /arrow keys/i });
    plot.focus();
    await expect(plot).toHaveFocus();
    await userEvent.keyboard("{ArrowRight}");
    await expect(canvas.getByRole("status")).toHaveTextContent(
      /mobile|desktop/,
    );
  },
};

import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect } from "storybook/test";

import type {
  EventTrendBucket,
  FunnelStep,
  OverviewSignalBucket,
} from "@/entities/event";
import type { SegmentScatterPoint } from "@/entities/segment";

import { BentoGrid } from "./BentoGrid";
import { FunnelPreview } from "./FunnelPreview";
import { HeroChart } from "./HeroChart";
import { KpiCard } from "./KpiCard";
import { PacingCard } from "./PacingCard";
import { SegmentScatter } from "./SegmentScatter";
import { StackedBars } from "./StackedBars";

/**
 * The bento GEOMETRY PROOF (ADR 0099) — the one oracle that can see the Phase-D defect (a
 * uniform grid with a hole), which jsdom cannot because it performs no CSS layout. These
 * stories run in the Storybook BROWSER project (real chromium, real Tailwind CSS) and their
 * `play` asserts the resolved grid via `getComputedStyle`.
 *
 * The collapse is a CONTAINER query (see BentoGrid), so a fixed-width decorator deterministically
 * drives both states: the Desktop story (≥1080px) must resolve THREE columns in the reference
 * 1.55 : 0.95 : 1.1 ratio with every one of the six slots placed and NO empty cell; the Mobile
 * story (<1080px) must collapse to a single column.
 */

const DAY = Date.UTC(2026, 5, 1);
const PLANS = ["enterprise", "free", "pro"];
const trend = (base: number): EventTrendBucket[] =>
  PLANS.flatMap((series, s) =>
    Array.from({ length: 10 }, (_, i) => ({
      bucket: new Date(DAY + i * 86_400_000).toISOString(),
      series,
      count: base + i * (s + 2) + ((i * 7 + s * 5) % 24),
    })),
  );
const SIGNAL: OverviewSignalBucket[] = Array.from({ length: 10 }, (_, i) => ({
  bucket: new Date(DAY + i * 86_400_000).toISOString(),
  active_users: 40 + i * 6,
  new_signups: 8 + i * 2,
  value_sum: 120 + i * 45,
  purchasers: 3 + (i % 4),
}));
const FUNNEL: FunnelStep[] = [
  { step_index: 0, step_event: "page_view", users: 128_400 },
  { step_index: 1, step_event: "sign_up", users: 41_980 },
  { step_index: 2, step_event: "feature_used", users: 18_240 },
];
const SCATTER: SegmentScatterPoint[] = Array.from({ length: 48 }, (_, i) => ({
  distinct_id: `u${i}`,
  frequency: 2 + ((i * 7) % 36),
  ltv: i % 5 === 0 ? 0 : 20 + ((i * 13) % 170),
  plan: PLANS[i % PLANS.length]!,
}));

/** The six reference cells, assembled with deterministic fixtures. */
const CELLS = {
  hero: (
    <HeroChart
      data={trend(60)}
      label="Active users"
      value="48,210"
      delta="+8%"
      chartLabel="Active users by plan over time"
    />
  ),
  stack: (
    <div className="flex h-full flex-col gap-4">
      <KpiCard
        label="New sign-ups"
        value="3,940"
        deltaRatio={0.124}
        signalMeasure="new_signups"
        signalData={SIGNAL}
        signalColor="var(--color-viz-categorical-1)"
      />
      <KpiCard
        label="Conversion"
        value="24.6%"
        deltaRatio={0.031}
        signalMeasure="conversion"
        signalData={SIGNAL}
        signalColor="var(--color-viz-categorical-2)"
      />
      <KpiCard
        label="ARPU"
        value="$4.20"
        deltaRatio={-0.056}
        signalMeasure="arpu"
        signalData={SIGNAL}
        signalColor="var(--color-viz-categorical-3)"
      />
    </div>
  ),
  goal: (
    <PacingCard
      label="Goal pacing"
      caption="vs the previous period"
      pacingRatio={1.12}
      rows={[
        { label: "Revenue", value: "$41.2k" },
        { label: "Pace", value: "112%" },
        { label: "Purchasers", value: "1,204" },
        { label: "ARPU", value: "$23" },
      ]}
    />
  ),
  bars: (
    <StackedBars
      data={trend(10)}
      label="Sign-ups by plan"
      chartLabel="Sign-ups by plan, stacked over time"
    />
  ),
  funnel: (
    <FunnelPreview
      data={FUNNEL}
      label="Activation funnel"
      stepLabels={{
        page_view: "Visited",
        sign_up: "Signed up",
        feature_used: "Activated",
      }}
    />
  ),
  seg: (
    <SegmentScatter
      data={SCATTER}
      label="Segments · freq × LTV"
      chartLabel="Segment scatter of frequency against lifetime value"
    />
  ),
};

const meta = {
  component: BentoGrid,
  parameters: { layout: "padded" },
  args: CELLS,
} satisfies Meta<typeof BentoGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

const gridOf = (root: HTMLElement) =>
  root.querySelector<HTMLElement>('[data-slot="bento"] > div')!;
const slot = (root: HTMLElement, name: string) =>
  root.querySelector<HTMLElement>(`[data-slot="bento-${name}"]`)!;

/** ≥1080px wrapper → the three-column reference bento, every slot placed, no empty cell. */
export const Desktop: Story = {
  decorators: [
    (Story) => (
      <div className="w-[1200px] max-w-none">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const grid = gridOf(canvasElement);
    const cols = getComputedStyle(grid)
      .gridTemplateColumns.split(" ")
      .map(parseFloat)
      .filter((n) => !Number.isNaN(n));

    // Three real, non-zero tracks — the hole is gone.
    expect(cols).toHaveLength(3);
    cols.forEach((c) => expect(c).toBeGreaterThan(0));

    // The reference ratio 1.55 : 0.95 : 1.1 (assert the proportion, since the computed values
    // are pixels), within a small tolerance.
    const total = cols[0]! + cols[1]! + cols[2]!;
    const want = [1.55, 0.95, 1.1].map((r) => r / 3.6);
    cols
      .map((c) => c / total)
      .forEach((r, i) => expect(Math.abs(r - want[i]!)).toBeLessThan(0.03));

    // Every one of the six slots is placed (col 1-3); the top three span rows 1-2, the bottom
    // three sit on row 3 — six items tiling the 3×3 span area with no empty cell.
    for (const [name, col, rowStart] of [
      ["hero", "1", "1"],
      ["stack", "2", "1"],
      ["goal", "3", "1"],
      ["bars", "1", "3"],
      ["funnel", "2", "3"],
      ["seg", "3", "3"],
    ] as const) {
      const cs = getComputedStyle(slot(canvasElement, name));
      expect(cs.gridColumnStart).toBe(col);
      expect(cs.gridRowStart).toBe(rowStart);
    }
    // The three top cells span two rows.
    for (const name of ["hero", "stack", "goal"]) {
      expect(getComputedStyle(slot(canvasElement, name)).gridRowEnd).toContain(
        "span 2",
      );
    }
  },
};

/** <1080px wrapper → the container query fires and the grid collapses to one column. */
export const Mobile: Story = {
  decorators: [
    (Story) => (
      <div className="w-[420px] max-w-none">
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const cols = getComputedStyle(gridOf(canvasElement))
      .gridTemplateColumns.split(" ")
      .map(parseFloat)
      .filter((n) => !Number.isNaN(n));
    expect(cols).toHaveLength(1);
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  decorators: [
    (Story) => (
      <div className="w-[1200px] max-w-none">
        <Story />
      </div>
    ),
  ],
};

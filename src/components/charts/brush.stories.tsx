import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ChartBrush, type BrushRange } from "./brush";

// ADR 0036/0042: CSF 3 stories for the time brush. It is a drag control, but a `play`
// that simulates a visx drag across a scaled viewBox is non-deterministic (ADR 0038's
// "assert behavior, not render" is better served without a flaky render-only play), so
// the drag → nuqs window round-trip is exercised at the FEATURE level (TrendsExplorer)
// and e2e (DEV-001), not here. These render the control and its emitted window; the
// selection rect/handles are tokens (ADR 0058/0081) and read in either theme (ADR 0092).

const DOMAIN: BrushRange = {
  from: "2026-05-01T00:00:00.000Z",
  to: "2026-05-31T00:00:00.000Z",
};

const meta = {
  component: ChartBrush,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[560px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: { domain: DOMAIN, onChange: () => {} },
} satisfies Meta<typeof ChartBrush>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

// A pre-seeded selection (as if hydrated from a nuqs window param).
export const WithSelection: Story = {
  args: {
    value: {
      from: "2026-05-08T00:00:00.000Z",
      to: "2026-05-20T00:00:00.000Z",
    },
  },
};

/** Live wrapper: shows the ISO window the brush emits on brush-end. */
function Live() {
  const [range, setRange] = useState<BrushRange | null>(null);
  return (
    <div className="flex flex-col gap-2">
      <ChartBrush domain={DOMAIN} value={range} onChange={setRange} />
      <p className="text-caption text-text-secondary">
        {range ? `${range.from} → ${range.to}` : "Whole window"}
      </p>
    </div>
  );
}

export const Interactive: Story = {
  render: () => <Live />,
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

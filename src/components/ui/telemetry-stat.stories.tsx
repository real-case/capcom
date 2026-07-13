import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";

import { TelemetryStat } from "./telemetry-stat";

// TelemetryStat is a mission-control composite, so it sits ON a surface to pair for AA (the ADR
// 0099 seam). The global theme toolbar drives `[data-theme]` (preview.tsx), so dark/light flip
// with `globals: { theme }` — both clear the axe contrast gate (ADR 0039). Presentational
// (data-display), so no play is required (ADR 0038).
const onSurface: Decorator = (Story) => (
  <div className="bg-surface-background p-6">
    <Story />
  </div>
);

const meta = {
  component: TelemetryStat,
  parameters: { layout: "centered" },
  args: { label: "Ingestion", children: "active" },
  decorators: [onSurface],
} satisfies Meta<typeof TelemetryStat>;

export default meta;
type Story = StoryObj<typeof meta>;

// contentBounds:min-content.
export const Default: Story = {};

// The closed `level` axis — the four ordered severities on the status palette (ADR 0081).
export const WithStatus: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <TelemetryStat label="Ingestion" level="nominal">
        active
      </TelemetryStat>
      <TelemetryStat label="Queue" level="caution">
        rising
      </TelemetryStat>
      <TelemetryStat label="Latency" level="warning">
        840ms
      </TelemetryStat>
      <TelemetryStat label="Errors" level="critical">
        12/min
      </TelemetryStat>
    </div>
  ),
};

// contentBounds:max-content — a long technical value stays on one line.
export const LongValue: Story = {
  args: { label: "Freshness", children: "2026-07-13T09:41:22.482Z" },
};

// The dark composition (ADR 0092), forced so the a11y run checks it too.
export const Dark: Story = { globals: { theme: "dark" } };

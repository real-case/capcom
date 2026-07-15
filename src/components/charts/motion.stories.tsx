import type { Meta, StoryObj } from "@storybook/nextjs-vite";

import { MotionIn } from "./motion";

// ADR 0036/0042: CSF 3 stories for the entrance wrapper. Presentational — no play
// (ADR 0038). The motion is `motion-safe:` only, so under `prefers-reduced-motion:
// reduce` (Chromatic's snapshot env, ADR 0043) these render straight to their final
// static state; timing/easing come from `--motion-*` tokens (ADR 0081).

const Card = ({ label }: { label: string }) => (
  <div className="rounded-lg border border-border-hairline bg-surface-elevated p-4 text-sm text-text-primary">
    {label}
  </div>
);

const meta = {
  component: MotionIn,
  parameters: { layout: "padded" },
  decorators: [
    (Story) => (
      <div className="w-[360px] max-w-full rounded-lg bg-surface-panel p-4">
        <Story />
      </div>
    ),
  ],
  args: { children: <Card label="Eased-in content" /> },
} satisfies Meta<typeof MotionIn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Rise: Story = {};

export const Fade: Story = {
  args: { variant: "fade", children: <Card label="Fades in only" /> },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

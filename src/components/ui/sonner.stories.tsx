import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { toast } from "sonner";
import { expect, screen, userEvent, within } from "storybook/test";

import { Button } from "./button";
import { Toaster } from "./sonner";

// ADR 0036/0042: colocated CSF 3 stories in both themes. An infrastructural mount
// (archetype: null) — no interaction is mandated, but a `play` fires a toast so the
// rendered feedback surface is covered by the axe pass (ADR 0038/0039).
const meta = {
  component: Toaster,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Toaster>;

export default meta;
type Story = StoryObj<typeof meta>;

// The Toaster mounts once; a control elsewhere raises toasts through `toast()`.
export const Default: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast("Report saved")}>Save report</Button>
    </div>
  ),
};

// play: raising a toast surfaces the message (and the axe pass covers the toast DOM).
export const WithToast: Story = {
  render: () => (
    <div>
      <Toaster />
      <Button
        onClick={() =>
          // duration: Infinity pins the toast so the browser test asserts it and
          // Chromatic can't race sonner's auto-dismiss timer (ADR 0043).
          toast.success("Report shared with your team", { duration: Infinity })
        }
      >
        Share report
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Share report" }));
    await expect(
      await screen.findByText("Report shared with your team"),
    ).toBeInTheDocument();
  },
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <div>
      <Toaster />
      <Button onClick={() => toast("Report saved", { duration: Infinity })}>
        Save report
      </Button>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Save report" }));
    await expect(await screen.findByText("Report saved")).toBeInTheDocument();
  },
};

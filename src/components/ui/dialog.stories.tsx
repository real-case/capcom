import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, screen, userEvent, waitFor, within } from "storybook/test";

import { Button } from "./button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./dialog";

// ADR 0036/0042: colocated CSF 3 stories over the container's contentBounds states in
// both themes. `container` mandates no interaction axis, so a play is optional — one is
// added to prove the open/close + focus behavior (ADR 0038).
const meta = {
  component: Dialog,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Dialog>;

export default meta;
type Story = StoryObj<typeof meta>;

// contentBounds:min-content — a compact confirmation dialog (statically open).
export const Default: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete report?</DialogTitle>
          <DialogDescription>
            This removes the saved report for everyone in the project.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// contentBounds:max-content / line-wrap — a long body wraps and the surface scrolls.
export const LongContent: Story = {
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Retention methodology</DialogTitle>
          <DialogDescription>
            Cohorts are grouped by the period a profile was first seen. A
            profile is counted as retained in period N when it fires any
            qualifying event during that period, measured against the
            cohort&rsquo;s original size — not against the previous period, so
            the curve never rebounds.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Close</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

export const Dark: Story = {
  globals: { theme: "dark" },
  render: () => (
    <Dialog defaultOpen>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete report?</DialogTitle>
          <DialogDescription>
            This removes the saved report for everyone in the project.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button>Delete</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// Behavior (play, ADR 0038): the trigger opens the modal, Escape closes it and returns
// focus to the trigger. The content is portalled, so it is queried via `screen`.
export const WithTrigger: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Open dialog</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete report?</DialogTitle>
          <DialogDescription>
            This removes the saved report for everyone in the project.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const trigger = canvas.getByRole("button", { name: "Open dialog" });
    await userEvent.click(trigger);
    // The trigger opens a labelled, described modal with an accessible close.
    const dialog = await screen.findByRole("dialog");
    await expect(dialog).toBeInTheDocument();
    await expect(
      screen.getByRole("heading", { name: "Delete report?" }),
    ).toBeInTheDocument();
    await expect(
      screen.getByRole("button", { name: "Close" }),
    ).toBeInTheDocument();
    // Keyboard: Escape closes the modal and returns focus to the trigger (ADR 0039).
    await userEvent.keyboard("{Escape}");
    await waitFor(
      () => expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
    await expect(trigger).toHaveFocus();
  },
};

import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";

import messages from "../../../../messages/en.json";

import { DemoSignIn } from "./DemoSignIn";

/**
 * ADR 0036/0042/0101: colocated stories for the one-click demo sign-in across its meaningful
 * states — default / pending / error — rendered on the real mission-control auth surface so the
 * axe gate (ADR 0039) measures the true foreground/surface pairing (a half-mix is invisible to
 * check:tokens / check:contrast, the ADR 0099 seam). Dark AND light stories cover both
 * compositions (ADR 0092). Presentational: `onPick` is a spy; the container owns the Server
 * Action (the ADR 0091 Manager/Panel split), so no server-only chain is imported here.
 */
const withAuthSurface: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <div className="flex justify-center bg-surface-background p-8">
      <div className="w-full max-w-md rounded-lg border border-border-hairline bg-surface-panel p-8">
        <Story />
      </div>
    </div>
  </NextIntlClientProvider>
);

const meta = {
  component: DemoSignIn,
  parameters: { layout: "fullscreen" },
  decorators: [withAuthSurface],
  args: { onPick: fn(), pendingKey: null, error: null },
} satisfies Meta<typeof DemoSignIn>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// one card mid-sign-in: its spinner shows and every card is disabled (one-click, ADR 0101).
export const Pending: Story = {
  args: { pendingKey: "dave" },
};

// the generic post-failure message (ADR 0019) — never the raw provider error.
export const ErrorState: Story = {
  args: { error: "Couldn't sign you in. Please try again." },
};

export const Dark: Story = {
  globals: { theme: "dark" },
};

export const Light: Story = {
  globals: { theme: "light" },
};

// interaction (play, ADR 0038): clicking a role card fires onPick with that account's KEY —
// behaviour on the click path, the closed-enum value the Server Action will validate.
export const PickInteraction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Continue as Alice/ }),
    );
    await expect(args.onPick).toHaveBeenCalledWith("alice");
  },
};

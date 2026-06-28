import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";

import messages from "../../../../messages/en.json";
import type { TranslateActionResult } from "../api/actions";

import { AiQueryPanel } from "./AiQueryPanel";

/**
 * ADR 0036/0042: colocated CSF 3 stories for the AI-query panel across its
 * meaningful states — default / offline-mode / pending / success (trends + segment)
 * / unrecognized / dark. It is an interactive archetype, so it carries a `play`
 * function (ADR 0038) asserting behaviour — submitting a prompt fires the callback —
 * not render. Fixtures are deterministic (ADR 0043); next-intl messages come from
 * the canonical catalog (ADR 0030). The panel owns no fetching or Server Action
 * wiring — `onSubmit` is a spy (ADR 0086/0091 split).
 */

const trendsResult: TranslateActionResult = {
  ok: true,
  engine: "model",
  spec: {
    kind: "trends",
    config: {
      event: "sign_up",
      range: "30d",
      interval: "day",
      breakdown: "referrer",
    },
  },
};

const segmentResult: TranslateActionResult = {
  ok: true,
  engine: "offline",
  spec: {
    kind: "segment",
    config: {
      rule: {
        match: "all",
        attributes: [{ key: "plan", op: "eq", value: "pro" }],
        behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
      },
      dimension: "country",
      range: "90d",
    },
  },
};

const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <div className="w-[640px] max-w-full">
      <Story />
    </div>
  </NextIntlClientProvider>
);

const meta = {
  component: AiQueryPanel,
  parameters: { layout: "padded" },
  decorators: [withIntl],
  args: {
    projectId: "p1",
    aiConfigured: true,
    isPending: false,
    result: null,
    onSubmit: fn(),
  },
} satisfies Meta<typeof AiQueryPanel>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

// offline: no AI key — the caution notice explains the deterministic fallback (ADR 0091).
export const OfflineMode: Story = {
  args: { aiConfigured: false },
};

export const Pending: Story = {
  args: { isPending: true },
};

// success: a trends spec interpreted by the live model — summary + deep-link.
export const TrendsResult: Story = {
  args: { result: trendsResult },
};

// success: a segment spec interpreted offline (live AI configured) — shows the
// offline-interpretation note and the readable rule.
export const SegmentResult: Story = {
  args: { result: segmentResult },
};

// failure: an off-topic prompt the interpreter couldn't map — the example chips remain.
export const Unrecognized: Story = {
  args: { result: { ok: false, engine: "offline", reason: "unrecognized" } },
};

export const Dark: Story = {
  args: { result: trendsResult },
  globals: { theme: "dark" },
};

// interaction (play, ADR 0038): typing a prompt and pressing Ask fires onSubmit with
// the trimmed text — behaviour, on the keyboard path.
export const AskInteraction: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.type(
      canvas.getByLabelText("Your question"),
      "show sign-ups",
    );
    await userEvent.click(canvas.getByRole("button", { name: "Ask" }));
    await expect(args.onSubmit).toHaveBeenCalledWith("show sign-ups");
  },
};

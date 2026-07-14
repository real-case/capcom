import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";

import messages from "../../../../messages/en.json";

import { DEFAULT_FILTER } from "../model/filter";

import { FacetFilter } from "./FacetFilter";

/**
 * ADR 0036/0042 axe coverage for the re-skinned facet trigger (ADR 0099): the outline
 * trigger and the selection-count Badge on the mission-control surface, in both
 * compositions. The facet query is gated to the OPEN state (`enabled: open`), so the
 * closed trigger fires no fetch; the QueryClientProvider only satisfies the hook context.
 * The open popover/command content portals to `body` — the documented best-effort residual.
 */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const withProviders: Decorator = (Story) => (
  <QueryClientProvider client={queryClient}>
    <NextIntlClientProvider locale="en" messages={messages}>
      <Story />
    </NextIntlClientProvider>
  </QueryClientProvider>
);

const meta = {
  component: FacetFilter,
  parameters: { layout: "padded" },
  decorators: [withProviders],
  args: {
    projectId: "p1",
    dimension: "plan",
    filter: DEFAULT_FILTER,
    onToggle: fn(),
    onClear: fn(),
  },
} satisfies Meta<typeof FacetFilter>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The closed trigger, no selection. */
export const Default: Story = {};

/** A trigger with active selections — the count Badge themed through the surface. */
export const WithSelection: Story = {
  args: { filter: { ...DEFAULT_FILTER, plans: ["pro", "free"] } },
};

export const Dark: Story = { globals: { theme: "dark" } };

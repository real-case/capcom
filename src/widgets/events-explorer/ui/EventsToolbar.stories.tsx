import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";

import messages from "../../../../messages/en.json";

import { DEFAULT_FILTER } from "../model/filter";

import { EventsToolbar } from "./EventsToolbar";

/**
 * ADR 0036/0042 axe coverage for the re-skinned query toolbar (ADR 0099): the search
 * input, the facet triggers, and the active-filter chips on the mission-control surface,
 * in both compositions. The facet queries are gated to the OPEN state, so the toolbar
 * fires no fetch; the QueryClientProvider only satisfies the FacetFilter hook context.
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
  component: EventsToolbar,
  parameters: { layout: "padded" },
  decorators: [withProviders],
  args: {
    projectId: "p1",
    filter: DEFAULT_FILTER,
    onSearchChange: fn(),
    onToggleFacet: fn(),
    onClearFacet: fn(),
    onClearAll: fn(),
  },
} satisfies Meta<typeof EventsToolbar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** No filter — the search box and the four facet triggers. */
export const Default: Story = {};

/** Active filters — the clear-all button and the removable filter chips appear. */
export const WithActiveFilters: Story = {
  args: {
    filter: {
      ...DEFAULT_FILTER,
      search: "checkout",
      plans: ["pro"],
      countries: ["US"],
    },
  },
};

export const Dark: Story = { globals: { theme: "dark" } };

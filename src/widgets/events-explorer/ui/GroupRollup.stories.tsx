import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { fn } from "storybook/test";

import type { EventsFacet } from "@/entities/event";
import { queryKeys } from "@/lib/query/keys";

import messages from "../../../../messages/en.json";

import { DEFAULT_FILTER } from "../model/filter";
import { toFacetsArgs } from "../model/url-state";

import { GroupRollup } from "./GroupRollup";

/**
 * ADR 0036/0042 axe coverage for the re-skinned group-by roll-up (ADR 0099): the Panel
 * surface, the CategoryPill labels, and the MonoData counts, in both compositions.
 * GroupRollup fetches `fn_events_facets` on mount, so the QueryClient is PRE-SEEDED with
 * fixture rows (staleTime Infinity, no refetch) — the story never touches Supabase.
 */
const ROWS: EventsFacet[] = [
  { value: "pro", count: 1240 },
  { value: "free", count: 820 },
  { value: "enterprise", count: 210 },
];

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
});
queryClient.setQueryData(
  queryKeys.events.facets(toFacetsArgs("p1", DEFAULT_FILTER, "plan")),
  ROWS,
);
queryClient.setQueryData(
  queryKeys.events.facets(toFacetsArgs("p1", DEFAULT_FILTER, "country")),
  [] satisfies EventsFacet[],
);

const withProviders: Decorator = (Story) => (
  <QueryClientProvider client={queryClient}>
    <NextIntlClientProvider locale="en" messages={messages}>
      <Story />
    </NextIntlClientProvider>
  </QueryClientProvider>
);

const meta = {
  component: GroupRollup,
  parameters: { layout: "padded" },
  decorators: [withProviders],
  args: {
    projectId: "p1",
    dimension: "plan",
    filter: DEFAULT_FILTER,
    onPick: fn(),
  },
} satisfies Meta<typeof GroupRollup>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated roll-up — bars, CategoryPill labels, and MonoData counts. */
export const Default: Story = {};

/** No values for the dimension — the empty state. */
export const Empty: Story = { args: { dimension: "country" } };

export const Dark: Story = { globals: { theme: "dark" } };

import type { Decorator, Meta, StoryObj } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import { expect, fn, userEvent, within } from "storybook/test";

import type { AnalyticsEvent, EventsSummary } from "@/entities/event";
import type { Profile } from "@/entities/profile";

import messages from "../../../../messages/en.json";

import { DEFAULT_SORT } from "../model/filter";

import { EventsTable } from "./EventsTable";

/**
 * ADR 0036/0042: colocated CSF 3 stories for the events table across its meaningful
 * states — default / dense / expanded / empty / loading / error / dark. It is an
 * interactive archetype, so it carries a `play` (ADR 0038) asserting behaviour (clicking
 * a row's toggle fires `onToggleExpand` with the event id), not render. Fixtures are
 * deterministic — a fixed `nowMs` and fixed timestamps so the relative-time cells and
 * Chromatic snapshot never drift (ADR 0043). The table owns no fetching: rows, summary,
 * and the expanded-row detail arrive as props (ADR 0097).
 */

// A fixed "now" so "12s ago" / "5m ago" are stable across runs (ADR 0043).
const NOW = Date.parse("2026-07-07T14:32:10.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function evt(
  id: string,
  event_name: string,
  distinct_id: string,
  properties: Record<string, unknown>,
  agoMs: number,
): AnalyticsEvent {
  return {
    id,
    project_id: "p1",
    event_name,
    distinct_id,
    properties: properties as AnalyticsEvent["properties"],
    ts: ago(agoMs),
    created_at: ago(agoMs),
  };
}

const ROWS: AnalyticsEvent[] = [
  evt(
    "e1",
    "purchase",
    "aurora-web_u0130",
    {
      plan: "pro",
      country: "US",
      device: "desktop",
      amount: 149,
      currency: "USD",
      coupon: "SPRING",
    },
    12_000,
  ),
  evt(
    "e2",
    "sign_up",
    "aurora-web_u0077",
    {
      plan: "enterprise",
      country: "DE",
      device: "mobile",
      source: "ads",
    },
    34_000,
  ),
  evt(
    "e3",
    "page_view",
    "aurora-web_u0103",
    {
      plan: "free",
      country: "FR",
      device: "mobile",
      path: "/pricing",
    },
    120_000,
  ),
  evt(
    "e4",
    "feature_used",
    "aurora-web_u0024",
    {
      plan: "pro",
      country: "US",
      device: "desktop",
      feature: "export",
    },
    300_000,
  ),
  evt(
    "e5",
    "search",
    "aurora-web_u0088",
    {
      plan: "free",
      country: "ES",
      device: "mobile",
      query: "pricing",
    },
    420_000,
  ),
];

const SUMMARY: EventsSummary = {
  total_events: 3942,
  distinct_users: 1842,
  value_sum: 41980,
};

const PROFILE: Profile = {
  id: "pr1",
  project_id: "p1",
  distinct_id: "aurora-web_u0130",
  traits: {
    plan: "pro",
    country: "US",
    device: "desktop",
    referrer: "google",
  } as Profile["traits"],
  first_seen_at: "2026-04-02T00:00:00.000Z",
  last_seen_at: ago(12_000),
  created_at: "2026-04-02T00:00:00.000Z",
  updated_at: ago(12_000),
};

const withIntl: Decorator = (Story) => (
  <NextIntlClientProvider locale="en" messages={messages}>
    <Story />
  </NextIntlClientProvider>
);

const meta = {
  component: EventsTable,
  parameters: { layout: "padded" },
  decorators: [withIntl],
  args: {
    rows: ROWS,
    summary: SUMMARY,
    total: SUMMARY.total_events,
    page: 1,
    pageSize: 10,
    density: "comfortable",
    sort: DEFAULT_SORT,
    filterActive: false,
    isLoading: false,
    isError: false,
    streamPaused: false,
    expandedId: null,
    detail: { profile: undefined, activity: undefined, isLoading: false },
    nowMs: NOW,
    onToggleExpand: fn(),
    onToggleSort: fn(),
    onPage: fn(),
    onPageSize: fn(),
    onDensity: fn(),
    onToggleStream: fn(),
  },
} satisfies Meta<typeof EventsTable>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Populated, comfortable density — the standing overview row. */
export const Default: Story = {};

/** Interactive: clicking a row's toggle fires `onToggleExpand` with the event id. */
export const TogglesExpansion: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const toggles = canvas.getAllByRole("button", {
      name: "Toggle event detail",
    });
    await userEvent.click(toggles[0]!);
    await expect(args.onToggleExpand).toHaveBeenCalledWith("e1");
  },
};

/** The expanded-row detail (properties / user / context / timeline). */
export const Expanded: Story = {
  args: {
    expandedId: "e1",
    detail: {
      profile: PROFILE,
      activity: [ROWS[0]!, ROWS[2]!, ROWS[4]!],
      isLoading: false,
    },
  },
};

/** Dense rows — the row-padding density axis. */
export const Dense: Story = {
  args: { density: "dense" },
};

/** Multi-column sort — Event ascending, then Time descending; headers show rank badges. */
export const MultiSorted: Story = {
  args: {
    sort: [
      { id: "event", desc: false },
      { id: "time", desc: true },
    ],
  },
};

/** Interactive: activating a sortable column header fires `onToggleSort` for that column. */
export const SortsColumn: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: "Sort by Event" }),
    );
    await expect(args.onToggleSort).toHaveBeenCalledWith("event", false);
  },
};

/** No events yet — the empty state. */
export const Empty: Story = {
  args: {
    rows: [],
    total: 0,
    summary: { total_events: 0, distinct_users: 0, value_sum: 0 },
  },
};

/** A filter matched nothing — the distinct filtered-empty message. */
export const FilteredEmpty: Story = {
  args: {
    rows: [],
    total: 0,
    filterActive: true,
    summary: { total_events: 0, distinct_users: 0, value_sum: 0 },
  },
};

/** First load, no rows yet — the loading state. */
export const Loading: Story = {
  args: { rows: [], isLoading: true },
};

/** The read failed — the error state. */
export const ErrorState: Story = {
  args: { rows: [], isError: true },
};

/** Paused live stream — the toggle in its resumed-affordance state. */
export const StreamPaused: Story = {
  args: { streamPaused: true },
};

/** Dark theme (ADR 0033 semantic-token override) — the a11y run checks this axis too. */
export const Dark: Story = {
  globals: { theme: "dark" },
};

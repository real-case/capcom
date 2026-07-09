import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

import {
  DEFAULT_FILTER,
  type EventsFilter,
  type FacetDimension,
} from "../model/filter";

// Mock only the facet RPC — the real FacetFilter/useEventsFacets wiring runs, so the test
// exercises the query (gated by the open popover) and the toggle callbacks, not a stub.
const { fetchEventsFacets } = vi.hoisted(() => ({
  fetchEventsFacets: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/event")>()),
  fetchEventsFacets,
}));

import { EventsToolbar } from "./EventsToolbar";

function renderToolbar(
  filter: EventsFilter,
  handlers: Partial<{
    onSearchChange: (s: string) => void;
    onToggleFacet: (d: FacetDimension, v: string) => void;
    onClearFacet: (d: FacetDimension) => void;
    onClearAll: () => void;
  }> = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const props = {
    onSearchChange: vi.fn(),
    onToggleFacet: vi.fn(),
    onClearFacet: vi.fn(),
    onClearAll: vi.fn(),
    ...handlers,
  };
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <EventsToolbar projectId="p1" filter={filter} {...props} />
      </QueryClientProvider>
    </NextIntlClientProvider>,
  );
  return props;
}

describe("EventsToolbar", () => {
  beforeEach(() => {
    fetchEventsFacets.mockReset().mockResolvedValue([
      { value: "pro", count: 5 },
      { value: "free", count: 3 },
    ]);
  });

  it("renders active-filter chips and removes one by toggling its value off", async () => {
    const onToggleFacet = vi.fn();
    renderToolbar({ ...DEFAULT_FILTER, plans: ["pro"] }, { onToggleFacet });

    // The active plan selection surfaces as a removable chip.
    const remove = screen.getByRole("button", { name: "Remove Plan: pro" });
    await userEvent.click(remove);
    expect(onToggleFacet).toHaveBeenCalledWith("plan", "pro");
  });

  it("debounces the search input and commits the trimmed text", async () => {
    const onSearchChange = vi.fn();
    renderToolbar(DEFAULT_FILTER, { onSearchChange });

    await userEvent.type(
      screen.getByRole("textbox", { name: "Search events by name" }),
      "buy",
    );
    // Debounced — commits once the input settles (ADR 0028).
    await waitFor(() => expect(onSearchChange).toHaveBeenCalledWith("buy"));
  });

  it("opens a facet popover, shows DB counts, and toggles a value", async () => {
    const onToggleFacet = vi.fn();
    renderToolbar(DEFAULT_FILTER, { onToggleFacet });

    await userEvent.click(
      screen.getByRole("button", { name: "Filter by Plan" }),
    );

    // The DB-computed count renders beside a value (never a client-side tally, ADR 0084).
    await waitFor(() => expect(fetchEventsFacets).toHaveBeenCalled());
    const free = await screen.findByRole("option", { name: /free/ });
    await userEvent.click(free);
    expect(onToggleFacet).toHaveBeenCalledWith("plan", "free");
  });

  it("shows clear-all only when a filter is active", () => {
    const { rerender } = renderRerender(DEFAULT_FILTER);
    expect(
      screen.queryByRole("button", { name: "Clear all" }),
    ).not.toBeInTheDocument();
    rerender({ ...DEFAULT_FILTER, devices: ["mobile"] });
    expect(
      screen.getByRole("button", { name: "Clear all" }),
    ).toBeInTheDocument();
  });
});

// Small helper to re-render the same tree with a new filter (clear-all visibility).
function renderRerender(filter: EventsFilter) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const tree = (f: EventsFilter) => (
    <NextIntlClientProvider locale="en" messages={messages}>
      <QueryClientProvider client={queryClient}>
        <EventsToolbar
          projectId="p1"
          filter={f}
          onSearchChange={vi.fn()}
          onToggleFacet={vi.fn()}
          onClearFacet={vi.fn()}
          onClearAll={vi.fn()}
        />
      </QueryClientProvider>
    </NextIntlClientProvider>
  );
  const utils = render(tree(filter));
  return { rerender: (f: EventsFilter) => utils.rerender(tree(f)) };
}

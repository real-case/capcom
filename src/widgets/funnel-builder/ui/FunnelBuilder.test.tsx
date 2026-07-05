import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

// Mock the data layer only — the REAL useFunnel hook runs, so the test exercises the
// query wiring (queryKey + fetcher call), not a stub of it.
const { fetchFunnel } = vi.hoisted(() => ({ fetchFunnel: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", () => ({ fetchFunnel }));

import { FunnelBuilder } from "./FunnelBuilder";

/**
 * Drive a Combobox (PR-15): open the labelled trigger, then click an option by its
 * visible label. Options exist in the DOM only while the popover is open.
 */
async function selectCombo(name: string, optionName: string | RegExp) {
  await userEvent.click(screen.getByRole("combobox", { name }));
  await userEvent.click(
    await screen.findByRole("option", { name: optionName }),
  );
}

function renderBuilder(onUrlUpdate: (e: UrlUpdateEvent) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <FunnelBuilder projectId="p1" />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </NuqsTestingAdapter>,
  );
}

describe("FunnelBuilder", () => {
  beforeEach(() => {
    fetchFunnel.mockReset().mockResolvedValue([
      { step_index: 1, step_event: "page_view", users: 100 },
      { step_index: 2, step_event: "sign_up", users: 60 },
      { step_index: 3, step_event: "feature_used", users: 55 },
      { step_index: 4, step_event: "purchase", users: 20 },
    ]);
  });

  it("queries with the default URL state and renders the funnel", async () => {
    renderBuilder(vi.fn());

    await waitFor(() => expect(fetchFunnel).toHaveBeenCalled());
    // Default state (ADR 0087 defaults): the acquisition funnel, 30-day window.
    const [, args] = fetchFunnel.mock.calls[0]!;
    expect(args).toMatchObject({
      p_project_id: "p1",
      p_steps: ["page_view", "sign_up", "feature_used", "purchase"],
      p_window: "30 days",
    });

    // The funnel section renders (heading present).
    expect(
      await screen.findByRole("heading", { name: "Conversion by step" }),
    ).toBeInTheDocument();
  });

  it("writes a changed step to the URL and re-drives the query (shareable link)", async () => {
    const onUrlUpdate = vi.fn();
    renderBuilder(onUrlUpdate);
    await waitFor(() => expect(fetchFunnel).toHaveBeenCalled());
    fetchFunnel.mockClear();

    await selectCombo("Event for step 2", "search");

    // URL state round-trips (ADR 0027) ...
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("steps")).toContain("search");

    // ... and the query re-runs with the edited step list.
    await waitFor(() =>
      expect(fetchFunnel).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_steps: ["page_view", "search", "feature_used", "purchase"],
        }),
      ),
    );
  });

  it("adds a step (appending the first unused canonical event)", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchFunnel).toHaveBeenCalled());
    fetchFunnel.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Add step" }));

    await waitFor(() =>
      expect(fetchFunnel).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_steps: [
            "page_view",
            "sign_up",
            "feature_used",
            "purchase",
            "search",
          ],
        }),
      ),
    );
  });

  it("removes a step", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchFunnel).toHaveBeenCalled());
    fetchFunnel.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "Remove step 3" }),
    );

    await waitFor(() =>
      expect(fetchFunnel).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_steps: ["page_view", "sign_up", "purchase"],
        }),
      ),
    );
  });
});

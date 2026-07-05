import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import messages from "../../../../messages/en.json";

// Mock the data layer only — the REAL useRetention hook runs, so the test exercises the
// query wiring (queryKey + fetcher call), not a stub of it.
const { fetchRetention } = vi.hoisted(() => ({ fetchRetention: vi.fn() }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/event", () => ({ fetchRetention }));

import { RetentionGrid } from "./RetentionGrid";

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

function renderGrid(onUrlUpdate: (e: UrlUpdateEvent) => void) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <RetentionGrid projectId="p1" />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </NuqsTestingAdapter>,
  );
}

describe("RetentionGrid", () => {
  beforeEach(() => {
    fetchRetention.mockReset().mockResolvedValue([
      {
        cohort_period: "2026-03-23T00:00:00+00:00",
        cohort_size: 10,
        period_offset: 0,
        retained_users: 10,
      },
      {
        cohort_period: "2026-03-23T00:00:00+00:00",
        cohort_size: 10,
        period_offset: 1,
        retained_users: 4,
      },
      {
        cohort_period: "2026-03-30T00:00:00+00:00",
        cohort_size: 8,
        period_offset: 0,
        retained_users: 8,
      },
    ]);
  });

  it("queries with the default URL state and renders the grid", async () => {
    renderGrid(vi.fn());

    await waitFor(() => expect(fetchRetention).toHaveBeenCalled());
    // Default state (ADR 0088 defaults): trailing 90 days, weekly cohorts.
    const [, args] = fetchRetention.mock.calls[0]!;
    expect(args).toMatchObject({ p_project_id: "p1", p_period: "week" });

    // The grid section renders (heading present).
    expect(
      await screen.findByRole("heading", { name: "Retention by cohort" }),
    ).toBeInTheDocument();
  });

  it("writes a changed period to the URL and re-drives the query (shareable link)", async () => {
    const onUrlUpdate = vi.fn();
    renderGrid(onUrlUpdate);
    await waitFor(() => expect(fetchRetention).toHaveBeenCalled());
    fetchRetention.mockClear();

    await selectCombo("Cohort by", "Month");

    // URL state round-trips (ADR 0027) ...
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("period")).toBe("month");

    // ... and the query re-runs with the monthly granularity.
    await waitFor(() =>
      expect(fetchRetention).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ p_period: "month" }),
      ),
    );
  });

  it("writes a changed range to the URL", async () => {
    const onUrlUpdate = vi.fn();
    renderGrid(onUrlUpdate);
    await waitFor(() => expect(fetchRetention).toHaveBeenCalled());

    await selectCombo("Analysis range", "Last 180 days");

    await waitFor(() => {
      const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
      expect(last.searchParams.get("range")).toBe("180d");
    });
  });
});

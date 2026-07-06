import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SegmentRule } from "@/entities/segment";
import { selectCombo } from "@/shared/testing";

import messages from "../../../../messages/en.json";

import { segmentParsers } from "../model/url-state";

// Mock the data layer only — the REAL hooks run, so the test exercises the query wiring
// (queryKey + fetcher call), not a stub of it. `importOriginal` preserves the `[segment]`
// rule schema + vocabularies the widget and url-state depend on (ADR 0017/0089).
const { fetchSegmentSize, fetchSegmentDistribution } = vi.hoisted(() => ({
  fetchSegmentSize: vi.fn(),
  fetchSegmentDistribution: vi.fn(),
}));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("@/entities/segment", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/entities/segment")>()),
  fetchSegmentSize,
  fetchSegmentDistribution,
}));

import { SegmentBuilder } from "./SegmentBuilder";

function renderBuilder(
  onUrlUpdate: (e: UrlUpdateEvent) => void,
  searchParams?: Record<string, string>,
) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <NuqsTestingAdapter onUrlUpdate={onUrlUpdate} searchParams={searchParams}>
      <NextIntlClientProvider locale="en" messages={messages}>
        <QueryClientProvider client={queryClient}>
          <SegmentBuilder projectId="p1" />
        </QueryClientProvider>
      </NextIntlClientProvider>
    </NuqsTestingAdapter>,
  );
}

describe("SegmentBuilder", () => {
  beforeEach(() => {
    fetchSegmentSize.mockReset().mockResolvedValue(26);
    fetchSegmentDistribution.mockReset().mockResolvedValue([
      { bucket: "US", users: 12 },
      { bucket: "GB", users: 14 },
    ]);
  });

  it("queries both aggregations with the default rule and dimension", async () => {
    renderBuilder(vi.fn());

    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    await waitFor(() => expect(fetchSegmentDistribution).toHaveBeenCalled());

    // Default state (ADR 0089): pro users who purchased ≥ 1, broken down by country.
    const [, sizeArgs] = fetchSegmentSize.mock.calls[0]!;
    expect(sizeArgs).toMatchObject({
      p_project_id: "p1",
      p_rule: {
        match: "all",
        attributes: [{ key: "plan", op: "eq", value: "pro" }],
        behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
      },
    });
    const [, distArgs] = fetchSegmentDistribution.mock.calls[0]!;
    expect(distArgs).toMatchObject({ p_dimension: "country" });

    // The distribution section renders with the headline size.
    expect(
      await screen.findByRole("heading", { name: "Segment distribution" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("26")).toBeInTheDocument();
  });

  it("writes a changed dimension to the URL and re-drives the distribution (shareable link)", async () => {
    const onUrlUpdate = vi.fn();
    renderBuilder(onUrlUpdate);
    await waitFor(() => expect(fetchSegmentDistribution).toHaveBeenCalled());
    fetchSegmentDistribution.mockClear();

    await selectCombo("Break down by", "Device");

    // URL state round-trips (ADR 0027) ...
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    const last = onUrlUpdate.mock.calls.at(-1)![0] as UrlUpdateEvent;
    expect(last.searchParams.get("dimension")).toBe("device");

    // ... and the distribution re-runs with the new dimension.
    await waitFor(() =>
      expect(fetchSegmentDistribution).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ p_dimension: "device" }),
      ),
    );
  });

  it("adds an attribute predicate and re-drives both queries with the wider rule", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "Add attribute" }),
    );

    // The appended predicate is the default (plan = free); both aggregations re-run with
    // the two-attribute AND rule.
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            attributes: [
              { key: "plan", op: "eq", value: "pro" },
              { key: "plan", op: "eq", value: "free" },
            ],
          }),
        }),
      ),
    );
  });

  it("re-keys an attribute, resetting the value to the new trait's first option", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    // The single attribute predicate's trait combobox (aria-label indexed per row).
    await selectCombo("Trait for attribute 1", "Country");

    // withKey resets the value to the first country option (US), keeping the rule valid.
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            attributes: [{ key: "country", op: "eq", value: "US" }],
          }),
        }),
      ),
    );
  });

  it("switches an attribute to 'is any of' (in), wrapping the value into an array", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());

    // eq → in: withOp wraps the single value "pro" into ["pro"].
    await selectCombo("Condition for attribute 1", "is any of");
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            attributes: [{ key: "plan", op: "in", value: ["pro"] }],
          }),
        }),
      ),
    );
  });

  it("toggles a value into an 'in' predicate via its checkboxes", async () => {
    // Seed the URL with an in-rule so the checkbox control renders from the first paint.
    const seeded: SegmentRule = {
      match: "all",
      attributes: [{ key: "plan", op: "in", value: ["pro"] }],
      behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
    };
    renderBuilder(vi.fn(), { rule: segmentParsers.rule.serialize(seeded) });
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    // Checking "enterprise" appends it to the in-array (a same-key disjunction).
    await userEvent.click(screen.getByRole("checkbox", { name: "enterprise" }));
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            attributes: [
              { key: "plan", op: "in", value: ["pro", "enterprise"] },
            ],
          }),
        }),
      ),
    );
  });

  it("changes a behavioural predicate's operator", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    await selectCombo("Frequency for behavior 1", "at most");
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            behaviors: [{ event: "purchase", op: "at_most", count: 1 }],
          }),
        }),
      ),
    );
  });

  it("coerces the count input to a non-negative integer", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    // A single deterministic change event (clampCount parses it to an int).
    fireEvent.change(screen.getByLabelText("Count for behavior 1"), {
      target: { value: "3" },
    });
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            behaviors: [{ event: "purchase", op: "at_least", count: 3 }],
          }),
        }),
      ),
    );
  });

  it("adds a second behavioural predicate (AND over the events stream)", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    await userEvent.click(screen.getByRole("button", { name: "Add behavior" }));
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            behaviors: [
              { event: "purchase", op: "at_least", count: 1 },
              { event: "purchase", op: "at_least", count: 1 },
            ],
          }),
        }),
      ),
    );
  });

  it("removes the attribute predicate, leaving a behaviour-only rule", async () => {
    renderBuilder(vi.fn());
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    await userEvent.click(
      screen.getByRole("button", { name: "Remove attribute 1" }),
    );

    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            attributes: [],
            behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
          }),
        }),
      ),
    );
  });

  it("keeps the last 'in' value checked (the min-1 guard is a no-op)", async () => {
    // Seed an in-rule with exactly one value; unchecking it must be a no-op so the rule
    // stays schema-valid (an in-predicate needs ≥ 1 value, ADR 0089).
    const seeded: SegmentRule = {
      match: "all",
      attributes: [{ key: "plan", op: "in", value: ["pro"] }],
      behaviors: [],
    };
    renderBuilder(vi.fn(), { rule: segmentParsers.rule.serialize(seeded) });
    const pro = await screen.findByRole("checkbox", { name: "pro" });
    expect(pro).toBeChecked();
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    await userEvent.click(pro); // attempt to uncheck the only value
    // The guard short-circuits: re-query the (possibly remounted) checkbox — it stays
    // checked — and no new query is driven, so the predicate is genuinely unchanged.
    expect(screen.getByRole("checkbox", { name: "pro" })).toBeChecked();
    expect(fetchSegmentSize).not.toHaveBeenCalled();
  });

  it("switches an 'in' predicate back to eq, taking the first value", async () => {
    // Seed an in-rule with two values; eq can hold only one, so withOp keeps the first.
    const seeded: SegmentRule = {
      match: "all",
      attributes: [{ key: "plan", op: "in", value: ["pro", "enterprise"] }],
      behaviors: [],
    };
    renderBuilder(vi.fn(), { rule: segmentParsers.rule.serialize(seeded) });
    await waitFor(() => expect(fetchSegmentSize).toHaveBeenCalled());
    fetchSegmentSize.mockClear();

    await selectCombo("Condition for attribute 1", "is");
    await waitFor(() =>
      expect(fetchSegmentSize).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          p_rule: expect.objectContaining({
            attributes: [{ key: "plan", op: "eq", value: "pro" }],
          }),
        }),
      ),
    );
  });
});

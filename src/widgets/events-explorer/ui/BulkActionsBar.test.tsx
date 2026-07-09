import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NextIntlClientProvider } from "next-intl";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from "vitest";

import type { AnalyticsEvent } from "@/entities/event";

import messages from "../../../../messages/en.json";

import { BulkActionsBar } from "./BulkActionsBar";

const NOW = Date.parse("2026-07-07T14:32:10.000Z");

function evt(
  id: string,
  event_name: string,
  properties: Record<string, unknown>,
  ts: string,
): AnalyticsEvent {
  return {
    id,
    project_id: "p1",
    event_name,
    distinct_id: "aurora-web_u0130",
    properties: properties as AnalyticsEvent["properties"],
    ts,
    created_at: ts,
  };
}

const MULTI: AnalyticsEvent[] = [
  evt(
    "e1",
    "page_view",
    { plan: "pro", country: "US", device: "desktop" },
    "2026-07-07T14:00:00.000Z",
  ),
  evt(
    "e2",
    "purchase",
    { plan: "pro", country: "DE", device: "desktop", amount: 149 },
    "2026-07-07T14:30:00.000Z",
  ),
];

function renderBar(
  rows: AnalyticsEvent[],
  handlers: Partial<{
    onViewUser: (eventId: string) => void;
    onClear: () => void;
  }> = {},
) {
  const props = { onViewUser: vi.fn(), onClear: vi.fn(), ...handlers };
  render(
    <NextIntlClientProvider locale="en" messages={messages}>
      <BulkActionsBar
        rows={rows}
        projectId="p1"
        nowMs={NOW}
        onViewUser={props.onViewUser}
        onClear={props.onClear}
      />
    </NextIntlClientProvider>,
  );
  return props;
}

describe("BulkActionsBar", () => {
  it("renders nothing when the selection is empty", () => {
    renderBar([]);
    expect(screen.queryByRole("group", { name: "Bulk actions" })).toBeNull();
  });

  it("shows the count and read-only deep-links built from the target grammars", () => {
    renderBar(MULTI);

    expect(screen.getByText("2 selected")).toBeInTheDocument();

    // Deep-links (ADR 0090) — never a mutation; there is deliberately no Delete
    // action anywhere in the bar (events are immutable, ADR 0083).
    const funnel = screen.getByRole("link", { name: "Build funnel" });
    expect(funnel).toHaveAttribute(
      "href",
      expect.stringContaining("/p/p1/funnels?steps=page_view%2Cpurchase"),
    );
    const segment = screen.getByRole("link", { name: "Add to segment" });
    expect(segment.getAttribute("href")).toContain("/p/p1/segments?rule=");
    expect(screen.queryByRole("button", { name: /delete/i })).toBeNull();

    // View user needs exactly one selected row.
    expect(screen.getByRole("button", { name: "View user" })).toBeDisabled();
  });

  it("disables a deep-link whose config cannot validate", () => {
    // One distinct event name → below the funnel's two-step minimum; no traits → no rule.
    renderBar([
      evt("e1", "page_view", { path: "/" }, "2026-07-07T14:00:00.000Z"),
    ]);
    expect(screen.getByRole("button", { name: "Build funnel" })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Add to segment" }),
    ).toBeDisabled();
  });

  it("view-user hands the single selected row's event id to the leaf", async () => {
    const onViewUser = vi.fn();
    renderBar([MULTI[0]!], { onViewUser });

    await userEvent.click(screen.getByRole("button", { name: "View user" }));
    expect(onViewUser).toHaveBeenCalledWith("e1");
  });

  it("clear-selection fires the callback", async () => {
    const onClear = vi.fn();
    renderBar(MULTI, { onClear });

    await userEvent.click(
      screen.getByRole("button", { name: "Clear selection" }),
    );
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  describe("CSV export", () => {
    const createObjectURL = vi.fn((_source: Blob | MediaSource) => "blob:mock");
    const revokeObjectURL = vi.fn();
    let clickSpy: MockInstance<() => void>;

    beforeEach(() => {
      createObjectURL.mockClear();
      revokeObjectURL.mockClear();
      // jsdom ships no object-URL support — provide the pair the handler uses
      // (scoped to this file: each Vitest file gets a fresh jsdom).
      URL.createObjectURL = createObjectURL;
      URL.revokeObjectURL = revokeObjectURL;
      clickSpy = vi
        .spyOn(HTMLAnchorElement.prototype, "click")
        .mockImplementation(() => {});
    });

    afterEach(() => {
      clickSpy.mockRestore();
    });

    it("downloads the SELECTED rows serialized as CSV (never a reduction, ADR 0084)", async () => {
      renderBar(MULTI);

      await userEvent.click(screen.getByRole("button", { name: "Export CSV" }));

      // The blob carries the serialized rows: header + one record per selected row.
      expect(createObjectURL).toHaveBeenCalledTimes(1);
      const [source] = createObjectURL.mock.calls[0]!;
      expect(source).toBeInstanceOf(Blob);
      if (!(source instanceof Blob)) throw new Error("expected a Blob");
      const text = await source.text();
      expect(text).toContain(
        "id,event_name,distinct_id,plan,country,device,amount,currency,ts,properties",
      );
      expect(text).toContain("e1,page_view");
      expect(text).toContain("e2,purchase");

      // The anchor got the date-stamped filename and the object URL was released.
      const anchor = clickSpy.mock.instances[0] as unknown as HTMLAnchorElement;
      expect(anchor.download).toBe("events-2026-07-07.csv");
      expect(revokeObjectURL).toHaveBeenCalledWith("blob:mock");
    });
  });
});

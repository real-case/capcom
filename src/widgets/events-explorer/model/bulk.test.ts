import { describe, expect, it } from "vitest";

import type { AnalyticsEvent } from "@/entities/event";
import { segmentRuleSchema } from "@/entities/segment";

import {
  csvFilename,
  FUNNEL_MAX_STEPS,
  funnelDeepLink,
  funnelStepsFromSelection,
  segmentDeepLink,
  segmentRuleFromSelection,
  toCsv,
} from "./bulk";

function evt(
  id: string,
  event_name: string,
  properties: Record<string, unknown>,
  ts: string,
  distinct_id = "aurora-web_u0130",
): AnalyticsEvent {
  return {
    id,
    project_id: "p1",
    event_name,
    distinct_id,
    properties: properties as AnalyticsEvent["properties"],
    ts,
    created_at: ts,
  };
}

describe("toCsv", () => {
  it("serializes rows with a stable header and RFC 4180 escaping", () => {
    const rows = [
      evt(
        "e1",
        "purchase",
        {
          plan: "pro",
          country: "US",
          device: "desktop",
          amount: 149,
          currency: "USD",
          coupon: "SPRING,SALE",
        },
        "2026-07-07T14:32:00.000Z",
      ),
    ];
    const csv = toCsv(rows);
    const [header, record] = csv.split("\r\n");

    expect(header).toBe(
      "id,event_name,distinct_id,plan,country,device,amount,currency,ts,properties",
    );
    // The trait/value columns mirror the table cells.
    expect(record).toContain(
      "e1,purchase,aurora-web_u0130,pro,US,desktop,149,USD",
    );
    // The jsonb bag rides along JSON-encoded; its commas/quotes force one quoted
    // field with doubled inner quotes.
    expect(record).toContain('"{""plan"":""pro""');
    expect(record).toContain('""coupon"":""SPRING,SALE""');
    // CRLF record separator, trailing newline.
    expect(csv.endsWith("\r\n")).toBe(true);
  });

  it("escapes quotes and newlines inside property-derived fields", () => {
    const rows = [
      evt(
        "e2",
        "search",
        { plan: 'say "hi"', country: "A\nB" },
        "2026-07-07T14:00:00.000Z",
      ),
    ];
    const csv = toCsv(rows);
    // A quoted trait value doubles its quotes; a newline forces quoting.
    expect(csv).toContain('"say ""hi"""');
    expect(csv).toContain('"A\nB"');
  });

  it("leaves amount/currency/trait columns empty when absent and handles a null bag", () => {
    const rows = [
      evt("e3", "page_view", {}, "2026-07-07T13:00:00.000Z"),
      {
        ...evt("e4", "sign_up", {}, "2026-07-07T12:00:00.000Z"),
        properties: null,
      },
    ];
    const lines = toCsv(rows).trimEnd().split("\r\n");
    expect(lines[1]).toBe(
      "e3,page_view,aurora-web_u0130,,,,,,2026-07-07T13:00:00.000Z,{}",
    );
    expect(lines[2]).toBe(
      "e4,sign_up,aurora-web_u0130,,,,,,2026-07-07T12:00:00.000Z,",
    );
  });

  it("emits only the header for an empty selection", () => {
    expect(toCsv([])).toBe(
      "id,event_name,distinct_id,plan,country,device,amount,currency,ts,properties\r\n",
    );
  });
});

describe("csvFilename", () => {
  it("derives a date-stamped name from the injected timestamp", () => {
    expect(csvFilename(Date.parse("2026-07-07T14:32:10.000Z"))).toBe(
      "events-2026-07-07.csv",
    );
  });
});

describe("funnelStepsFromSelection", () => {
  it("orders distinct event names by first occurrence (ts ascending)", () => {
    const rows = [
      evt("e1", "purchase", {}, "2026-07-07T14:30:00.000Z"),
      evt("e2", "page_view", {}, "2026-07-07T14:00:00.000Z"),
      evt("e3", "sign_up", {}, "2026-07-07T14:10:00.000Z"),
      evt("e4", "page_view", {}, "2026-07-07T14:20:00.000Z"),
    ];
    expect(funnelStepsFromSelection(rows)).toEqual([
      "page_view",
      "sign_up",
      "purchase",
    ]);
  });

  it("caps at the funnel's step maximum", () => {
    const rows = Array.from({ length: 8 }, (_, i) =>
      evt(`e${i}`, `step_${i}`, {}, `2026-07-07T14:0${i}:00.000Z`),
    );
    expect(funnelStepsFromSelection(rows)).toHaveLength(FUNNEL_MAX_STEPS);
  });
});

describe("funnelDeepLink", () => {
  it("builds the funnel surface's URL-state through the report serializer", () => {
    const rows = [
      evt("e1", "page_view", {}, "2026-07-07T14:00:00.000Z"),
      evt("e2", "purchase", {}, "2026-07-07T14:30:00.000Z"),
    ];
    const href = funnelDeepLink("p1", rows);
    expect(href).not.toBeNull();
    const url = new URL(href!, "http://localhost");
    expect(url.pathname).toBe("/p/p1/funnels");
    // Steps are the ADR 0090 comma-joined encoding; range/window are the entity defaults.
    expect(url.searchParams.get("steps")).toBe("page_view,purchase");
    expect(url.searchParams.get("range")).toBe("90d");
    expect(url.searchParams.get("window")).toBe("30d");
  });

  it("returns null when the selection has fewer than two distinct events", () => {
    const rows = [
      evt("e1", "page_view", {}, "2026-07-07T14:00:00.000Z"),
      evt("e2", "page_view", {}, "2026-07-07T14:30:00.000Z"),
    ];
    expect(funnelDeepLink("p1", rows)).toBeNull();
    expect(funnelDeepLink("p1", [])).toBeNull();
  });
});

describe("segmentRuleFromSelection", () => {
  it("builds eq for a single trait value and in for several, sorted", () => {
    const rows = [
      evt(
        "e1",
        "purchase",
        { plan: "pro", country: "US" },
        "2026-07-07T14:00:00.000Z",
      ),
      evt(
        "e2",
        "sign_up",
        { plan: "pro", country: "DE" },
        "2026-07-07T14:10:00.000Z",
      ),
    ];
    const rule = segmentRuleFromSelection(rows);
    expect(rule).toEqual({
      match: "all",
      attributes: [
        { key: "plan", op: "eq", value: "pro" },
        { key: "country", op: "in", value: ["DE", "US"] },
      ],
      behaviors: [],
    });
    // The rule is exactly what the `[segment]` grammar accepts (ADR 0089/0017).
    expect(segmentRuleSchema.parse(rule)).toEqual(rule);
  });

  it("returns null when the selection carries no trait at all", () => {
    const rows = [
      evt("e1", "page_view", { path: "/" }, "2026-07-07T14:00:00.000Z"),
    ];
    expect(segmentRuleFromSelection(rows)).toBeNull();
    expect(segmentRuleFromSelection([])).toBeNull();
  });
});

describe("segmentDeepLink", () => {
  it("round-trips the rule through the segment surface's URL grammar", () => {
    const rows = [
      evt(
        "e1",
        "purchase",
        { plan: "enterprise", device: "desktop" },
        "2026-07-07T14:00:00.000Z",
      ),
    ];
    const href = segmentDeepLink("p1", rows);
    expect(href).not.toBeNull();
    const url = new URL(href!, "http://localhost");
    expect(url.pathname).toBe("/p/p1/segments");
    expect(url.searchParams.get("dimension")).toBe("country");
    expect(url.searchParams.get("range")).toBe("90d");
    // The JSON-encoded rule (ADR 0090's parseAsJson encoding) re-validates against
    // the `[segment]` schema — the destination's authority — without coercion.
    const rule: unknown = JSON.parse(url.searchParams.get("rule")!);
    expect(segmentRuleSchema.parse(rule)).toEqual({
      match: "all",
      attributes: [
        { key: "plan", op: "eq", value: "enterprise" },
        { key: "device", op: "eq", value: "desktop" },
      ],
      behaviors: [],
    });
  });

  it("returns null when no rule can be built", () => {
    expect(segmentDeepLink("p1", [])).toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import type { AnalyticsEvent } from "@/entities/event";

import {
  eventHue,
  formatValue,
  jsonRecord,
  planVariant,
  propertyChips,
  relativeParts,
  shortId,
  trait,
} from "./presentation";

function ev(
  properties: Record<string, unknown>,
  over: Partial<AnalyticsEvent> = {},
): AnalyticsEvent {
  return {
    id: "e1",
    project_id: "p1",
    event_name: "purchase",
    distinct_id: "aurora-web_u0001",
    properties,
    ts: "2026-07-07T12:00:00.000Z",
    created_at: "2026-07-07T12:00:00.000Z",
    ...over,
  } as AnalyticsEvent;
}

describe("eventHue", () => {
  it("is a categorical viz token and stable per name", () => {
    expect(eventHue("purchase")).toMatch(
      /^var\(--color-viz-categorical-\d+\)$/,
    );
    expect(eventHue("purchase")).toBe(eventHue("purchase"));
  });
});

describe("jsonRecord", () => {
  it("narrows an object bag and folds null/array/scalar to an empty record", () => {
    expect(jsonRecord({ a: 1 })).toEqual({ a: 1 });
    expect(jsonRecord(null)).toEqual({});
    expect(jsonRecord([1, 2])).toEqual({});
    expect(jsonRecord("x")).toEqual({});
  });
});

describe("planVariant", () => {
  it("maps paid tiers to emphasized variants and everything else to outline", () => {
    expect(planVariant("pro")).toBe("default");
    expect(planVariant("enterprise")).toBe("secondary");
    expect(planVariant("free")).toBe("outline");
    expect(planVariant(undefined)).toBe("outline");
  });
});

describe("trait", () => {
  it("reads a top-level string trait, else undefined", () => {
    expect(trait(ev({ plan: "pro" }), "plan")).toBe("pro");
    expect(trait(ev({ amount: 5 }), "amount")).toBeUndefined();
    expect(trait(ev({}), "plan")).toBeUndefined();
  });
});

describe("formatValue", () => {
  it("formats a numeric amount as currency and returns null otherwise", () => {
    expect(formatValue(ev({ amount: 149, currency: "USD" }), "en")).toContain(
      "149",
    );
    expect(formatValue(ev({}), "en")).toBeNull();
    expect(formatValue(ev({ amount: "149" }), "en")).toBeNull();
    // An invalid currency code falls back to USD instead of throwing a RangeError.
    expect(formatValue(ev({ amount: 10, currency: "bogus" }), "en")).toContain(
      "10",
    );
  });
});

describe("propertyChips", () => {
  it("excludes column props, caps at max, and reports overflow", () => {
    const { chips, overflow } = propertyChips(
      ev({
        plan: "pro",
        country: "US",
        device: "desktop",
        amount: 149,
        currency: "USD",
        coupon: "SPRING",
        source: "ads",
      }),
    );
    expect(chips).toEqual([
      { key: "currency", value: "USD" },
      { key: "coupon", value: "SPRING" },
    ]);
    expect(overflow).toBe(1);
  });
});

describe("relativeParts", () => {
  const base = new Date("2026-07-07T12:00:00.000Z").getTime();
  it("buckets the delta into the right i18n key", () => {
    expect(relativeParts("2026-07-07T12:00:00.000Z", base + 2_000)).toEqual({
      key: "relativeNow",
      n: 0,
    });
    expect(relativeParts("2026-07-07T12:00:00.000Z", base + 30_000)).toEqual({
      key: "relativeSeconds",
      n: 30,
    });
    expect(
      relativeParts("2026-07-07T12:00:00.000Z", base + 5 * 60_000),
    ).toEqual({ key: "relativeMinutes", n: 5 });
    expect(
      relativeParts("2026-07-07T12:00:00.000Z", base + 3 * 3_600_000),
    ).toEqual({ key: "relativeHours", n: 3 });
    expect(
      relativeParts("2026-07-07T12:00:00.000Z", base + 2 * 86_400_000),
    ).toEqual({ key: "relativeDays", n: 2 });
  });
  it("clamps a future timestamp to 'just now'", () => {
    expect(relativeParts("2026-07-07T12:00:10.000Z", base)).toEqual({
      key: "relativeNow",
      n: 0,
    });
  });
});

describe("shortId", () => {
  it("abbreviates a long id and passes a short one through", () => {
    expect(shortId("aurora-web_u0001")).toBe("aurora…001");
    expect(shortId("u_1")).toBe("u_1");
  });
});

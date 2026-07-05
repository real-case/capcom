import { describe, expect, it } from "vitest";

import {
  DEFAULT_TRENDS_QUERY,
  effectiveWindow,
  resolveWindow,
  toTopEventsArgs,
  toTrendsArgs,
  trendsQuerySchema,
  type TrendsQuery,
} from "./url-state";

// A fixed clock so window resolution is deterministic (no live Date in assertions).
const NOW = new Date("2026-06-25T09:30:00.000Z");

describe("trendsQuerySchema", () => {
  it("accepts the defaults", () => {
    expect(trendsQuerySchema.parse(DEFAULT_TRENDS_QUERY)).toEqual(
      DEFAULT_TRENDS_QUERY,
    );
  });

  it("rejects an unknown interval / range / breakdown and an empty event", () => {
    expect(() =>
      trendsQuerySchema.parse({
        ...DEFAULT_TRENDS_QUERY,
        interval: "fortnight",
      }),
    ).toThrow();
    expect(() =>
      trendsQuerySchema.parse({ ...DEFAULT_TRENDS_QUERY, range: "1y" }),
    ).toThrow();
    expect(() =>
      trendsQuerySchema.parse({
        ...DEFAULT_TRENDS_QUERY,
        breakdown: "browser",
      }),
    ).toThrow();
    expect(() =>
      trendsQuerySchema.parse({ ...DEFAULT_TRENDS_QUERY, event: "" }),
    ).toThrow();
  });
});

describe("resolveWindow", () => {
  it("floors `to` to the next UTC midnight so the window is stable within a day", () => {
    const a = resolveWindow("30d", new Date("2026-06-25T09:30:00.000Z"));
    const b = resolveWindow("30d", new Date("2026-06-25T22:15:00.000Z"));
    expect(a).toEqual(b); // same calendar day → identical window → stable query key
    expect(a.to).toBe("2026-06-26T00:00:00.000Z");
  });

  it("spans exactly the requested number of days", () => {
    expect(resolveWindow("7d", NOW).from).toBe("2026-06-19T00:00:00.000Z");
    expect(resolveWindow("30d", NOW).from).toBe("2026-05-27T00:00:00.000Z");
    expect(resolveWindow("90d", NOW).from).toBe("2026-03-28T00:00:00.000Z");
  });
});

describe("toTrendsArgs", () => {
  it("round-trips the controls into the RPC argument bag", () => {
    const query: TrendsQuery = {
      event: "purchase",
      range: "7d",
      interval: "day",
      breakdown: "none",
      from: null,
      to: null,
    };
    const args = toTrendsArgs(query, "proj-1", NOW);
    expect(args).toMatchObject({
      p_project_id: "proj-1",
      p_event_name: "purchase",
      p_interval: "day",
      p_from: "2026-06-19T00:00:00.000Z",
      p_to: "2026-06-26T00:00:00.000Z",
    });
  });

  it("omits the breakdown key for 'none' (single series)", () => {
    const args = toTrendsArgs(DEFAULT_TRENDS_QUERY, "proj-1", NOW);
    expect("p_breakdown_key" in args).toBe(false);
  });

  it("passes the breakdown key through when set", () => {
    const args = toTrendsArgs(
      { ...DEFAULT_TRENDS_QUERY, breakdown: "device" },
      "proj-1",
      NOW,
    );
    expect(args.p_breakdown_key).toBe("device");
  });
});

describe("toTopEventsArgs", () => {
  it("carries the window and a default limit", () => {
    const args = toTopEventsArgs(DEFAULT_TRENDS_QUERY, "proj-1", NOW);
    expect(args).toMatchObject({
      p_project_id: "proj-1",
      p_from: "2026-05-27T00:00:00.000Z",
      p_to: "2026-06-26T00:00:00.000Z",
      p_limit: 10,
    });
  });
});

describe("effectiveWindow (brush override, ADR 0093)", () => {
  const WINDOW = {
    from: "2026-06-10T00:00:00.000Z",
    to: "2026-06-15T00:00:00.000Z",
  };

  it("uses the explicit brush window when both ends are present", () => {
    const query: TrendsQuery = { ...DEFAULT_TRENDS_QUERY, ...WINDOW };
    expect(effectiveWindow(query, NOW)).toEqual(WINDOW);
    // …and the RPC arg bag narrows to it, not the 30d preset.
    expect(toTrendsArgs(query, "proj-1", NOW)).toMatchObject({
      p_from: WINDOW.from,
      p_to: WINDOW.to,
    });
  });

  it("falls back to the preset when only one end is set", () => {
    const query: TrendsQuery = {
      ...DEFAULT_TRENDS_QUERY,
      from: WINDOW.from,
      to: null,
    };
    expect(effectiveWindow(query, NOW)).toEqual(resolveWindow("30d", NOW));
  });
});

describe("trendsQuerySchema brush window", () => {
  it("accepts an ISO window and clears a malformed one to null", () => {
    expect(
      trendsQuerySchema.parse({
        ...DEFAULT_TRENDS_QUERY,
        from: "2026-06-10T00:00:00.000Z",
        to: "not-a-date",
      }),
    ).toMatchObject({ from: "2026-06-10T00:00:00.000Z", to: null });
  });
});

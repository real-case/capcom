import { describe, expect, it } from "vitest";

import {
  DEFAULT_FUNNEL_QUERY,
  funnelQuerySchema,
  resolveWindow,
  toFunnelArgs,
  type FunnelQuery,
} from "./url-state";

// A fixed clock so window resolution is deterministic (no live Date in assertions).
const NOW = new Date("2026-06-25T09:30:00.000Z");

describe("funnelQuerySchema", () => {
  it("accepts the defaults", () => {
    expect(funnelQuerySchema.parse(DEFAULT_FUNNEL_QUERY)).toEqual(
      DEFAULT_FUNNEL_QUERY,
    );
  });

  it("rejects fewer than 2 or more than 6 steps", () => {
    expect(() =>
      funnelQuerySchema.parse({
        ...DEFAULT_FUNNEL_QUERY,
        steps: ["page_view"],
      }),
    ).toThrow();
    expect(() =>
      funnelQuerySchema.parse({
        ...DEFAULT_FUNNEL_QUERY,
        steps: ["a", "b", "c", "d", "e", "f", "g"],
      }),
    ).toThrow();
  });

  it("rejects an empty step, an unknown range, and an unknown window", () => {
    expect(() =>
      funnelQuerySchema.parse({
        ...DEFAULT_FUNNEL_QUERY,
        steps: ["page_view", ""],
      }),
    ).toThrow();
    expect(() =>
      funnelQuerySchema.parse({ ...DEFAULT_FUNNEL_QUERY, range: "1y" }),
    ).toThrow();
    expect(() =>
      funnelQuerySchema.parse({ ...DEFAULT_FUNNEL_QUERY, window: "90d" }),
    ).toThrow();
  });
});

describe("resolveWindow", () => {
  it("floors `to` to the next UTC midnight so the entry window is stable within a day", () => {
    const a = resolveWindow("30d", new Date("2026-06-25T09:30:00.000Z"));
    const b = resolveWindow("30d", new Date("2026-06-25T22:15:00.000Z"));
    expect(a).toEqual(b); // same calendar day → identical window → stable query key
    expect(a.to).toBe("2026-06-26T00:00:00.000Z");
  });

  it("spans exactly the requested number of days", () => {
    expect(resolveWindow("7d", NOW).from).toBe("2026-06-19T00:00:00.000Z");
    expect(resolveWindow("90d", NOW).from).toBe("2026-03-28T00:00:00.000Z");
  });
});

describe("toFunnelArgs", () => {
  it("round-trips the steps and entry range into the RPC argument bag", () => {
    const query: FunnelQuery = {
      steps: ["page_view", "sign_up", "purchase"],
      range: "7d",
      window: "7d",
    };
    const args = toFunnelArgs(query, "proj-1", NOW);
    expect(args).toEqual({
      p_project_id: "proj-1",
      p_steps: ["page_view", "sign_up", "purchase"],
      p_from: "2026-06-19T00:00:00.000Z",
      p_to: "2026-06-26T00:00:00.000Z",
      p_window: "7 days",
    });
  });

  it("maps each conversion-window preset to a Postgres interval string", () => {
    const intervalFor = (window: FunnelQuery["window"]) =>
      toFunnelArgs({ ...DEFAULT_FUNNEL_QUERY, window }, "proj-1", NOW).p_window;
    expect(intervalFor("1d")).toBe("1 day");
    expect(intervalFor("7d")).toBe("7 days");
    expect(intervalFor("14d")).toBe("14 days");
    expect(intervalFor("30d")).toBe("30 days");
  });
});

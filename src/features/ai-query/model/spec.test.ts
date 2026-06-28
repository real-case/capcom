import { describe, expect, it } from "vitest";

import {
  aiQuerySpecSchema,
  specToDeepLink,
  summarizeSpec,
  type AiQuerySpec,
} from "./spec";

/**
 * The `[ai-query]` spec is the closed grammar + injection boundary (ADR 0091): it
 * accepts a valid `{ kind, config }` per kind, round-trips through the PR-8
 * serializer to the correct surface URL, and **rejects** anything outside the
 * closed enums/shape — never coerces. These assertions are the ADR 0089
 * injection-boundary shape applied to model output.
 */

const trends: AiQuerySpec = {
  kind: "trends",
  config: {
    event: "sign_up",
    range: "30d",
    interval: "day",
    breakdown: "referrer",
  },
};
const funnel: AiQuerySpec = {
  kind: "funnel",
  config: {
    steps: ["page_view", "sign_up", "purchase"],
    range: "90d",
    window: "30d",
  },
};
const retention: AiQuerySpec = {
  kind: "retention",
  config: { range: "90d", period: "week" },
};
const segment: AiQuerySpec = {
  kind: "segment",
  config: {
    rule: {
      match: "all",
      attributes: [{ key: "plan", op: "eq", value: "pro" }],
      behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
    },
    dimension: "country",
    range: "90d",
  },
};

describe("aiQuerySpecSchema", () => {
  it("accepts a valid spec for each kind", () => {
    for (const spec of [trends, funnel, retention, segment]) {
      expect(aiQuerySpecSchema.safeParse(spec).success).toBe(true);
    }
  });

  it("rejects an unknown kind (not in the report_kind enum)", () => {
    expect(
      aiQuerySpecSchema.safeParse({ kind: "cohort", config: {} }).success,
    ).toBe(false);
  });

  it("rejects an out-of-vocabulary event — never coerces it", () => {
    const bad = {
      kind: "trends",
      config: { ...trends.config, event: "login" },
    };
    expect(aiQuerySpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an out-of-vocabulary enum value (range)", () => {
    const bad = {
      kind: "retention",
      config: { range: "365d", period: "week" },
    };
    expect(aiQuerySpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an injected extra config key (strictObject)", () => {
    const bad = {
      kind: "trends",
      config: { ...trends.config, drop: "table" },
    };
    expect(aiQuerySpecSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects a funnel with too few or too many steps", () => {
    expect(
      aiQuerySpecSchema.safeParse({
        kind: "funnel",
        config: { steps: ["sign_up"], range: "90d", window: "30d" },
      }).success,
    ).toBe(false);
    expect(
      aiQuerySpecSchema.safeParse({
        kind: "funnel",
        config: {
          steps: [
            "page_view",
            "sign_up",
            "feature_used",
            "search",
            "purchase",
            "page_view",
            "sign_up",
          ],
          range: "90d",
          window: "30d",
        },
      }).success,
    ).toBe(false);
  });

  it("rejects SQL-metacharacter content in an event field (not in the enum)", () => {
    const bad = {
      kind: "trends",
      config: { ...trends.config, event: "sign_up; DROP TABLE events" },
    };
    expect(aiQuerySpecSchema.safeParse(bad).success).toBe(false);
  });
});

describe("specToDeepLink", () => {
  it("serializes a trends spec to its surface URL-state (ADR 0090/0027)", () => {
    expect(specToDeepLink(trends, "p1")).toBe(
      "/p/p1/trends?event=sign_up&range=30d&interval=day&breakdown=referrer",
    );
  });

  it("serializes funnel steps as a comma list on the funnels route", () => {
    const url = specToDeepLink(funnel, "p1");
    const [path, query] = url.split("?");
    expect(path).toBe("/p/p1/funnels");
    const params = new URLSearchParams(query);
    expect(params.get("steps")).toBe("page_view,sign_up,purchase");
    expect(params.get("range")).toBe("90d");
    expect(params.get("window")).toBe("30d");
  });

  it("serializes the segment rule as JSON on the segments route", () => {
    const url = specToDeepLink(segment, "p1");
    const [path, query] = url.split("?");
    expect(path).toBe("/p/p1/segments");
    const params = new URLSearchParams(query);
    expect(JSON.parse(params.get("rule")!)).toEqual(segment.config.rule);
    expect(params.get("dimension")).toBe("country");
    expect(params.get("range")).toBe("90d");
  });

  it("maps retention to the retention route", () => {
    expect(specToDeepLink(retention, "p1")).toBe(
      "/p/p1/retention?range=90d&period=week",
    );
  });
});

describe("summarizeSpec", () => {
  it("returns the ordered display fields for a trends spec", () => {
    expect(summarizeSpec(trends)).toEqual([
      { key: "event", value: "sign_up" },
      { key: "range", value: "30d" },
      { key: "interval", value: "day" },
      { key: "breakdown", value: "referrer" },
    ]);
  });

  it("renders funnel steps and the segment rule as readable strings", () => {
    expect(summarizeSpec(funnel)[0]).toEqual({
      key: "steps",
      value: "page_view → sign_up → purchase",
    });
    expect(summarizeSpec(segment)[0]).toEqual({
      key: "rule",
      value: "plan = pro AND purchase ≥ 1",
    });
  });
});

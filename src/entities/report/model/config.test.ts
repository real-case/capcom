import { describe, expect, it } from "vitest";

import {
  REPORT_KINDS,
  defaultConfigForKind,
  reportConfigToSearchParams,
  reportInputSchema,
  reportKindRoute,
} from "./config";

describe("report config contract (ADR 0090)", () => {
  describe("reportKindRoute", () => {
    it("maps each kind to its analysis route segment", () => {
      expect(reportKindRoute).toEqual({
        trends: "trends",
        funnel: "funnels",
        retention: "retention",
        segment: "segments",
      });
    });
  });

  describe("defaultConfigForKind", () => {
    it("provides a default config for every kind", () => {
      for (const kind of REPORT_KINDS) {
        expect(defaultConfigForKind[kind]).toBeTypeOf("object");
      }
    });
  });

  describe("reportInputSchema", () => {
    it("accepts a well-formed report envelope", () => {
      const parsed = reportInputSchema.safeParse({
        name: "Daily views",
        kind: "trends",
        config: { event: "page_view" },
      });
      expect(parsed.success).toBe(true);
    });

    it("trims and bounds the name", () => {
      expect(
        reportInputSchema.safeParse({
          name: "  ",
          kind: "trends",
          config: {},
        }).success,
      ).toBe(false);
      expect(
        reportInputSchema.safeParse({
          name: "x".repeat(121),
          kind: "trends",
          config: {},
        }).success,
      ).toBe(false);
    });

    it("rejects an unknown kind", () => {
      expect(
        reportInputSchema.safeParse({ name: "n", kind: "cohort", config: {} })
          .success,
      ).toBe(false);
    });

    it("rejects a non-object config", () => {
      expect(
        reportInputSchema.safeParse({ name: "n", kind: "trends", config: "x" })
          .success,
      ).toBe(false);
    });
  });

  describe("reportConfigToSearchParams", () => {
    it("encodes trends string/enum fields", () => {
      const qs = new URLSearchParams(
        reportConfigToSearchParams("trends", {
          event: "page_view",
          range: "30d",
          interval: "day",
          breakdown: "none",
        }),
      );
      expect(qs.get("event")).toBe("page_view");
      expect(qs.get("range")).toBe("30d");
      expect(qs.get("interval")).toBe("day");
      expect(qs.get("breakdown")).toBe("none");
    });

    it("comma-joins funnel steps (matching the widget's nuqs array encoding)", () => {
      const qs = new URLSearchParams(
        reportConfigToSearchParams("funnel", {
          steps: ["page_view", "sign_up", "purchase"],
          range: "90d",
          window: "30d",
        }),
      );
      expect(qs.get("steps")).toBe("page_view,sign_up,purchase");
      expect(qs.get("range")).toBe("90d");
      expect(qs.get("window")).toBe("30d");
    });

    it("encodes retention fields", () => {
      const qs = new URLSearchParams(
        reportConfigToSearchParams("retention", {
          range: "90d",
          period: "week",
        }),
      );
      expect(qs.get("range")).toBe("90d");
      expect(qs.get("period")).toBe("week");
    });

    it("JSON-encodes the segment rule (matching the widget's parseAsJson)", () => {
      const rule = {
        match: "all",
        attributes: [{ key: "plan", op: "eq", value: "pro" }],
        behaviors: [],
      };
      const qs = new URLSearchParams(
        reportConfigToSearchParams("segment", {
          rule,
          dimension: "country",
          range: "90d",
        }),
      );
      expect(qs.get("rule")).toBe(JSON.stringify(rule));
      expect(JSON.parse(qs.get("rule")!)).toEqual(rule);
      expect(qs.get("dimension")).toBe("country");
    });

    it("omits fields absent from the config (the widget reads its own default)", () => {
      expect(reportConfigToSearchParams("trends", {})).toBe("");
    });

    it("round-trips each seeded default config back to non-empty URL-state", () => {
      for (const kind of REPORT_KINDS) {
        expect(
          reportConfigToSearchParams(kind, defaultConfigForKind[kind]).length,
        ).toBeGreaterThan(0);
      }
    });
  });
});

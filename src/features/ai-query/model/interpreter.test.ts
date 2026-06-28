import { describe, expect, it } from "vitest";

import { interpretPrompt } from "./interpreter";
import { aiQuerySpecSchema } from "./spec";

/**
 * The deterministic offline interpreter (ADR 0091) — the no-key fallback and the
 * deterministic happy-path. Every recognized intent maps to a schema-valid spec
 * (so the deep-link never falls back to a widget default), and an unrecognized
 * prompt returns null (the honest "couldn't interpret" path).
 */

describe("interpretPrompt", () => {
  it("maps the canonical prompt to a trends spec (ADR 0091 fixture)", () => {
    const spec = interpretPrompt("registrations by channel over 30 days");
    expect(spec).toEqual({
      kind: "trends",
      config: {
        event: "sign_up",
        range: "30d",
        interval: "day",
        breakdown: "referrer",
      },
    });
  });

  it("recognizes a funnel intent and orders the detected steps", () => {
    const spec = interpretPrompt("sign-up to purchase funnel");
    expect(spec?.kind).toBe("funnel");
    if (spec?.kind === "funnel") {
      expect(spec.config.steps).toEqual(["sign_up", "purchase"]);
    }
  });

  it("recognizes a retention intent with a detected period", () => {
    const spec = interpretPrompt("weekly retention cohorts");
    expect(spec).toMatchObject({
      kind: "retention",
      config: { period: "week" },
    });
  });

  it("recognizes a segment intent with an attribute + behaviour", () => {
    const spec = interpretPrompt("pro users who purchased, by country");
    expect(spec?.kind).toBe("segment");
    if (spec?.kind === "segment") {
      expect(spec.config.rule.attributes).toContainEqual({
        key: "plan",
        op: "eq",
        value: "pro",
      });
      expect(spec.config.rule.behaviors).toContainEqual({
        event: "purchase",
        op: "at_least",
        count: 1,
      });
      expect(spec.config.dimension).toBe("country");
    }
  });

  it("expresses 'never purchased' as at_most 0", () => {
    const spec = interpretPrompt("segment of users who never purchased");
    expect(spec?.kind).toBe("segment");
    if (spec?.kind === "segment") {
      expect(spec.config.rule.behaviors).toContainEqual({
        event: "purchase",
        op: "at_most",
        count: 0,
      });
    }
  });

  it("clamps a 180-day request to the trends range vocabulary", () => {
    const spec = interpretPrompt("purchases over 180 days, monthly");
    expect(spec).toMatchObject({
      kind: "trends",
      config: { event: "purchase", range: "90d", interval: "month" },
    });
  });

  it("returns null for a prompt with no analytics intent", () => {
    expect(interpretPrompt("hello there, how are you?")).toBeNull();
    expect(interpretPrompt("asdfqwer")).toBeNull();
    expect(interpretPrompt("")).toBeNull();
  });

  it("always produces a schema-valid spec when it recognizes intent", () => {
    const prompts = [
      "registrations by channel over 30 days",
      "sign-up to purchase funnel",
      "weekly retention cohorts",
      "pro users who purchased, by country",
      "page views by country last week",
      "monthly retention",
      "feature usage over 90 days",
    ];
    for (const p of prompts) {
      const spec = interpretPrompt(p);
      expect(spec).not.toBeNull();
      expect(aiQuerySpecSchema.safeParse(spec).success).toBe(true);
    }
  });
});

import { describe, expect, it } from "vitest";

import {
  attributePredicateSchema,
  behaviorPredicateSchema,
  ruleToJson,
  segmentRuleSchema,
  type SegmentRule,
} from "./rule";

describe("segmentRuleSchema", () => {
  it("fills defaults for an empty object: match=all, empty predicate lists", () => {
    const parsed = segmentRuleSchema.parse({});
    expect(parsed).toEqual({ match: "all", attributes: [], behaviors: [] });
  });

  it("accepts a full AND rule of attribute + behavioural predicates", () => {
    const rule = {
      match: "all",
      attributes: [
        { key: "plan", op: "eq", value: "pro" },
        { key: "country", op: "in", value: ["US", "GB"] },
      ],
      behaviors: [
        { event: "purchase", op: "at_least", count: 1 },
        { event: "sign_up", op: "at_most", count: 0 },
      ],
    };
    expect(segmentRuleSchema.parse(rule)).toEqual(rule);
  });

  it("rejects match values other than 'all' (OR is a deferred boundary)", () => {
    expect(segmentRuleSchema.safeParse({ match: "any" }).success).toBe(false);
  });

  it("rejects an unknown trait key", () => {
    const bad = { attributes: [{ key: "email", op: "eq", value: "x" }] };
    expect(segmentRuleSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects an unknown event name", () => {
    const bad = { behaviors: [{ event: "login", op: "at_least", count: 1 }] };
    expect(segmentRuleSchema.safeParse(bad).success).toBe(false);
  });
});

describe("attributePredicateSchema (discriminated on op)", () => {
  it("requires a single string value for eq/neq", () => {
    expect(
      attributePredicateSchema.safeParse({
        key: "plan",
        op: "eq",
        value: "pro",
      }).success,
    ).toBe(true);
    // An array value under eq is the wrong arm of the union.
    expect(
      attributePredicateSchema.safeParse({
        key: "plan",
        op: "eq",
        value: ["pro"],
      }).success,
    ).toBe(false);
  });

  it("requires a non-empty array value for in", () => {
    expect(
      attributePredicateSchema.safeParse({
        key: "country",
        op: "in",
        value: ["US"],
      }).success,
    ).toBe(true);
    expect(
      attributePredicateSchema.safeParse({
        key: "country",
        op: "in",
        value: [],
      }).success,
    ).toBe(false);
  });

  it("rejects an empty value string", () => {
    expect(
      attributePredicateSchema.safeParse({ key: "plan", op: "eq", value: "" })
        .success,
    ).toBe(false);
  });
});

describe("behaviorPredicateSchema", () => {
  it("requires a non-negative integer count", () => {
    expect(
      behaviorPredicateSchema.safeParse({
        event: "purchase",
        op: "at_least",
        count: 0,
      }).success,
    ).toBe(true);
    expect(
      behaviorPredicateSchema.safeParse({
        event: "purchase",
        op: "at_least",
        count: -1,
      }).success,
    ).toBe(false);
    expect(
      behaviorPredicateSchema.safeParse({
        event: "purchase",
        op: "at_least",
        count: 1.5,
      }).success,
    ).toBe(false);
  });

  it("rejects an unknown frequency operator", () => {
    expect(
      behaviorPredicateSchema.safeParse({
        event: "purchase",
        op: "exactly",
        count: 1,
      }).success,
    ).toBe(false);
  });
});

describe("ruleToJson", () => {
  it("passes a validated rule through unchanged (typed as Json for the RPC)", () => {
    const rule: SegmentRule = {
      match: "all",
      attributes: [{ key: "device", op: "neq", value: "mobile" }],
      behaviors: [],
    };
    expect(ruleToJson(rule)).toEqual(rule);
  });
});

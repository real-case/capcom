import { describe, expect, it } from "vitest";

import {
  formatIngestIssues,
  ingestBatchSchema,
  MAX_INGEST_BATCH,
} from "./schema";

const validEvent = {
  event_name: "page_view",
  distinct_id: "user-1",
  properties: { path: "/" },
  ts: "2026-06-24T00:00:00.000Z",
};

describe("ingestBatchSchema", () => {
  it("accepts a well-formed batch", () => {
    const result = ingestBatchSchema.safeParse({ events: [validEvent] });
    expect(result.success).toBe(true);
  });

  it("defaults absent properties to an empty object", () => {
    const result = ingestBatchSchema.safeParse({
      events: [{ event_name: "x", distinct_id: "u" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events[0]?.properties).toEqual({});
    }
  });

  it("treats ts as optional", () => {
    const result = ingestBatchSchema.safeParse({
      events: [{ event_name: "x", distinct_id: "u", properties: {} }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.events[0]?.ts).toBeUndefined();
    }
  });

  it("rejects an empty batch", () => {
    const result = ingestBatchSchema.safeParse({ events: [] });
    expect(result.success).toBe(false);
  });

  it("rejects a batch over the cap", () => {
    const events = Array.from({ length: MAX_INGEST_BATCH + 1 }, () => ({
      event_name: "x",
      distinct_id: "u",
    }));
    const result = ingestBatchSchema.safeParse({ events });
    expect(result.success).toBe(false);
  });

  it("rejects a missing event_name", () => {
    const result = ingestBatchSchema.safeParse({
      events: [{ distinct_id: "u" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an over-long distinct_id", () => {
    const result = ingestBatchSchema.safeParse({
      events: [{ event_name: "x", distinct_id: "z".repeat(201) }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-ISO ts", () => {
    const result = ingestBatchSchema.safeParse({
      events: [{ event_name: "x", distinct_id: "u", ts: "not-a-date" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-object payload", () => {
    expect(ingestBatchSchema.safeParse(null).success).toBe(false);
    expect(ingestBatchSchema.safeParse([]).success).toBe(false);
  });
});

describe("formatIngestIssues", () => {
  it("flattens issues to path + message", () => {
    const result = ingestBatchSchema.safeParse({
      events: [{ distinct_id: "u" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const issues = formatIngestIssues(result.error);
      expect(issues.length).toBeGreaterThan(0);
      expect(issues[0]).toHaveProperty("path");
      expect(issues[0]).toHaveProperty("message");
      // The path points at the offending field inside the batch.
      expect(issues.some((i) => i.path.includes("event_name"))).toBe(true);
    }
  });
});

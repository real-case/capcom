import { describe, expect, it } from "vitest";

import { extractBearerToken, hashIngestKey } from "./key";

describe("extractBearerToken", () => {
  it("returns the token from a well-formed Bearer header", () => {
    expect(extractBearerToken("Bearer abc123")).toBe("abc123");
  });

  it("trims surrounding whitespace", () => {
    expect(extractBearerToken("Bearer   abc123  ")).toBe("abc123");
  });

  it("returns null for a missing header", () => {
    expect(extractBearerToken(null)).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    expect(extractBearerToken("Basic abc123")).toBeNull();
  });

  it("returns null when the token is empty", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Bearer    ")).toBeNull();
  });
});

describe("hashIngestKey", () => {
  it("produces lowercase hex sha-256", () => {
    expect(hashIngestKey("x")).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same token", () => {
    expect(hashIngestKey("cap_ingest_aurora_web_dev")).toBe(
      hashIngestKey("cap_ingest_aurora_web_dev"),
    );
  });

  it("matches the value the seed stores via pgcrypto digest()", () => {
    // The exact hash seeded by supabase/seed.sql for the Aurora Web demo key —
    // the parity that lets a SQL-provisioned key resolve against this hash.
    expect(hashIngestKey("cap_ingest_aurora_web_dev")).toBe(
      "8e74bc2b39317b176762990fcb7b65013b382e3716e08e94c30c67b253d4d6d8",
    );
  });

  it("differs for different tokens", () => {
    expect(hashIngestKey("a")).not.toBe(hashIngestKey("b"));
  });
});

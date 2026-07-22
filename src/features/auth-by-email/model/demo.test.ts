import { describe, expect, it } from "vitest";

import { DEMO_ACCOUNTS, demoAccountKeySchema } from "./demo";

describe("demoAccountKeySchema (ADR 0101 — the one-click sign-in boundary)", () => {
  it.each(["alice", "dave", "bob"])("accepts the seeded demo key %s", (key) => {
    expect(demoAccountKeySchema.safeParse(key).success).toBe(true);
  });

  // `carol` is seeded but deliberately outside the one-click set; the rest prove the enum
  // rejects arbitrary strings so the action can never be turned into an arbitrary-login oracle.
  it.each(["mallory", "carol", "", "ALICE", "alice@capcom.dev", "0"])(
    "rejects the off-list value %j — the closed enum is the injection boundary",
    (value) => {
      expect(demoAccountKeySchema.safeParse(value).success).toBe(false);
    },
  );

  it("rejects non-string input", () => {
    expect(demoAccountKeySchema.safeParse(123).success).toBe(false);
    expect(demoAccountKeySchema.safeParse(null).success).toBe(false);
    expect(demoAccountKeySchema.safeParse({ key: "alice" }).success).toBe(
      false,
    );
  });
});

describe("DEMO_ACCOUNTS", () => {
  it("enumerates exactly the keys the schema accepts", () => {
    const keys = DEMO_ACCOUNTS.map((a) => a.key);
    expect(keys).toEqual(["alice", "dave", "bob"]);
    for (const key of keys) {
      expect(demoAccountKeySchema.safeParse(key).success).toBe(true);
    }
  });

  it("carries the owner → analyst → viewer role ladder", () => {
    expect(DEMO_ACCOUNTS.map((a) => a.roleKey)).toEqual([
      "owner",
      "analyst",
      "viewer",
    ]);
  });
});

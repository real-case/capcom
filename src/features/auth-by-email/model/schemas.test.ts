import { describe, expect, it } from "vitest";

import { signInSchema, signUpSchema } from "./schemas";

describe("auth schemas (ADR 0017/0020)", () => {
  it("sign-in accepts a valid email and a non-empty password", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.dev", password: "x" }).success,
    ).toBe(true);
  });

  it("sign-in rejects a malformed email", () => {
    expect(
      signInSchema.safeParse({ email: "not-an-email", password: "x" }).success,
    ).toBe(false);
  });

  it("sign-in rejects an empty password", () => {
    expect(
      signInSchema.safeParse({ email: "a@b.dev", password: "" }).success,
    ).toBe(false);
  });

  it("sign-up requires a password of at least 8 characters", () => {
    expect(
      signUpSchema.safeParse({ email: "a@b.dev", password: "short" }).success,
    ).toBe(false);
    expect(
      signUpSchema.safeParse({ email: "a@b.dev", password: "longenough" })
        .success,
    ).toBe(true);
  });
});

import { describe, expect, it } from "vitest";
import { z } from "zod";

import { env, parseEnv, publicEnvSchema } from "./env";

describe("parseEnv", () => {
  it("returns the validated value for valid input", () => {
    const schema = z.object({ KEY: z.string() });

    expect(parseEnv(schema, { KEY: "value" })).toEqual({ KEY: "value" });
  });

  it("fails fast with an [env]-marked, readable error on invalid input", () => {
    const schema = z.object({ KEY: z.string() });

    expect(() => parseEnv(schema, {})).toThrow(/^\[env\] Invalid environment:/);
  });
});

describe("publicEnvSchema", () => {
  it("defaults NEXT_PUBLIC_SITE_URL to localhost when unset", () => {
    expect(parseEnv(publicEnvSchema, {})).toMatchObject({
      NEXT_PUBLIC_SITE_URL: "http://localhost:20000",
    });
  });

  it("defaults the Supabase public vars to the local stack when unset", () => {
    expect(parseEnv(publicEnvSchema, {})).toMatchObject({
      NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:20030",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH",
    });
  });

  it("rejects a malformed NEXT_PUBLIC_SITE_URL with its origin marker", () => {
    expect(() =>
      parseEnv(publicEnvSchema, { NEXT_PUBLIC_SITE_URL: "not-a-url" }),
    ).toThrow(/\[env\] NEXT_PUBLIC_SITE_URL must be an absolute http\(s\) URL/);
  });

  it("rejects a WHATWG-valid but non-http(s) scheme", () => {
    expect(() =>
      parseEnv(publicEnvSchema, {
        NEXT_PUBLIC_SITE_URL: "mailto:dev@example.com",
      }),
    ).toThrow(/\[env\] NEXT_PUBLIC_SITE_URL must be an absolute http\(s\) URL/);
  });

  it("accepts an explicit absolute URL", () => {
    expect(
      parseEnv(publicEnvSchema, {
        NEXT_PUBLIC_SITE_URL: "https://example.com",
      }),
    ).toMatchObject({ NEXT_PUBLIC_SITE_URL: "https://example.com" });
  });
});

describe("env", () => {
  it("exposes a validated, URL-constructible site origin", () => {
    expect(() => new URL(env.NEXT_PUBLIC_SITE_URL)).not.toThrow();
  });
});

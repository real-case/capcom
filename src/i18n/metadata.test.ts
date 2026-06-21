import { describe, expect, it } from "vitest";

import { buildAlternates } from "./metadata";

// With localePrefix "always", every locale (including the default) is
// prefixed, so the canonical and the self-alternate match and x-default points
// at the default locale (ADR 0030, 0031).
describe("buildAlternates", () => {
  it("returns the locale-prefixed canonical for the active locale", () => {
    expect(buildAlternates("en", "/").canonical).toBe("/en");
  });

  it("emits one alternate per locale plus x-default", () => {
    const { languages } = buildAlternates("en", "/");

    expect(languages).toEqual({ en: "/en", "x-default": "/en" });
  });

  it("preserves a nested pathname under the locale prefix", () => {
    expect(buildAlternates("en", "/about").canonical).toBe("/en/about");
  });
});

import { describe, expect, it } from "vitest";

import robots from "./robots";

const ORIGIN = "http://localhost:20000";

describe("robots", () => {
  it("allows all crawlers and points at the absolute sitemap URL", () => {
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/" },
      sitemap: `${ORIGIN}/sitemap.xml`,
      host: ORIGIN,
    });
  });
});

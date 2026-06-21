import { describe, expect, it } from "vitest";

import sitemap from "./sitemap";

// env defaults NEXT_PUBLIC_SITE_URL to http://localhost:3000 under test.
const ORIGIN = "http://localhost:3000";

describe("sitemap", () => {
  it("emits one absolute, locale-prefixed entry per route × locale", () => {
    const entries = sitemap();

    expect(entries).toEqual([
      {
        url: `${ORIGIN}/en`,
        alternates: { languages: { en: `${ORIGIN}/en` } },
      },
    ]);
  });

  it("uses absolute URLs (sitemaps are not resolved against metadataBase)", () => {
    for (const entry of sitemap()) {
      expect(entry.url.startsWith("http")).toBe(true);
    }
  });
});

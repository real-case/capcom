import { describe, expect, it } from "vitest";

import type { LandingCopy } from "./content";
import { buildLandingJsonLd } from "./jsonld";

// buildLandingJsonLd only reads hero.title + hero.tagline, so a minimal fixture suffices.
const copy = {
  hero: { title: "CAPCOM", tagline: "A product-analytics demo." },
} as unknown as LandingCopy;

describe("buildLandingJsonLd", () => {
  it("emits WebSite and SoftwareApplication JSON-LD with absolute URLs", () => {
    const graph = buildLandingJsonLd("https://capcom.example", copy);

    expect(graph["@context"]).toBe("https://schema.org");

    const types = graph["@graph"].map((node) => node["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("SoftwareApplication");

    for (const node of graph["@graph"]) {
      expect(String(node.url)).toMatch(/^https:\/\//);
    }

    const website = graph["@graph"].find((n) => n["@type"] === "WebSite");
    expect(website?.name).toBe("CAPCOM");
    expect(website?.description).toBe("A product-analytics demo.");
  });

  it("normalizes a trailing slash in the site origin (no doubled slash)", () => {
    const graph = buildLandingJsonLd("https://capcom.example/", copy);

    for (const node of graph["@graph"]) {
      expect(node.url).toBe("https://capcom.example/");
      // `${origin}/#website` must not become `…//#website`.
      expect(String(node["@id"])).not.toContain("//#");
    }
  });
});

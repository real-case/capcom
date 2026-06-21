import { describe, expect, it } from "vitest";

import { cn } from "./utils";

describe("cn", () => {
  it("merges conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("resolves conflicting Tailwind utilities to the last one", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});

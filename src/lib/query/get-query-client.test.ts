import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";

import { getQueryClient } from "./get-query-client";

// jsdom defines `window`, so this exercises the browser branch: one stable
// client reused across calls (ADR 0025). The fresh-per-request server branch
// runs under `next build` / RSC, where there is no `window`.
describe("getQueryClient (browser)", () => {
  it("returns a QueryClient", () => {
    expect(getQueryClient()).toBeInstanceOf(QueryClient);
  });

  it("reuses the same client across calls (browser singleton)", () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });
});

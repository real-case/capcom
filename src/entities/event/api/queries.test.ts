import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchRecentEvents } from "./queries";

type Result = { data: unknown; error: unknown };

// Models only the query-builder shape the fetcher calls (.select/.eq/.order/.limit),
// resolved via the thenable — the full SupabaseClient surface is far larger.
function clientReturning(result: Result): SupabaseClient {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("event queries", () => {
  it("returns the rows on success", async () => {
    const rows = [{ id: "1", event_name: "page_view", project_id: "p1" }];
    expect(
      await fetchRecentEvents(
        clientReturning({ data: rows, error: null }),
        "p1",
      ),
    ).toEqual(rows);
  });

  it("returns an empty array when data is null", async () => {
    expect(
      await fetchRecentEvents(
        clientReturning({ data: null, error: null }),
        "p1",
      ),
    ).toEqual([]);
  });

  it("throws when the query errors", async () => {
    await expect(
      fetchRecentEvents(
        clientReturning({ data: null, error: new Error("boom") }),
        "p1",
      ),
    ).rejects.toThrow();
  });
});

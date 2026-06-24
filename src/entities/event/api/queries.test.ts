import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchRecentEvents } from "./queries";

type Result = { data: unknown; error: unknown };

// A query-builder mock that RECORDS the arguments to each chained call, so the
// tests assert the query shape (project_id filter, newest-first order, limit) and
// not just the resolved value — a dropped filter or a flipped order then fails.
function clientReturning(result: Result) {
  const calls = {
    eq: [] as unknown[][],
    order: undefined as unknown[] | undefined,
    limit: undefined as unknown[] | undefined,
  };
  const builder = {
    select: () => builder,
    eq: (...a: unknown[]) => (calls.eq.push(a), builder),
    order: (...a: unknown[]) => ((calls.order = a), builder),
    limit: (...a: unknown[]) => ((calls.limit = a), builder),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, calls };
}

describe("event queries", () => {
  it("returns the rows on success", async () => {
    const rows = [{ id: "1", event_name: "page_view", project_id: "p1" }];
    const { client } = clientReturning({ data: rows, error: null });
    expect(await fetchRecentEvents(client, "p1")).toEqual(rows);
  });

  it("returns an empty array when data is null", async () => {
    const { client } = clientReturning({ data: null, error: null });
    expect(await fetchRecentEvents(client, "p1")).toEqual([]);
  });

  it("throws when the query errors", async () => {
    const { client } = clientReturning({
      data: null,
      error: new Error("boom"),
    });
    await expect(fetchRecentEvents(client, "p1")).rejects.toThrow();
  });

  it("scopes to the project, orders newest-first, and applies the limit", async () => {
    const { client, calls } = clientReturning({ data: [], error: null });
    await fetchRecentEvents(client, "proj-42", 10);
    expect(calls.eq).toEqual([["project_id", "proj-42"]]);
    expect(calls.order).toEqual(["ts", { ascending: false }]);
    expect(calls.limit).toEqual([10]);
  });

  it("defaults the limit to 50", async () => {
    const { client, calls } = clientReturning({ data: [], error: null });
    await fetchRecentEvents(client, "p1");
    expect(calls.limit).toEqual([50]);
  });
});

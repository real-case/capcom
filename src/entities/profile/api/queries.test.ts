import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchProfile, fetchProfiles } from "./queries";

type Result = { data: unknown; error: unknown };

// A query-builder mock that records the arguments to each chained call, so the
// tests assert the query shape (project_id / distinct_id filters, recency order,
// limit, maybeSingle) and not just the resolved value.
function clientReturning(result: Result) {
  const calls = {
    eq: [] as unknown[][],
    order: undefined as unknown[] | undefined,
    limit: undefined as unknown[] | undefined,
    maybeSingle: false,
  };
  const builder = {
    select: () => builder,
    eq: (...a: unknown[]) => (calls.eq.push(a), builder),
    order: (...a: unknown[]) => ((calls.order = a), builder),
    limit: (...a: unknown[]) => ((calls.limit = a), builder),
    maybeSingle: () => ((calls.maybeSingle = true), builder),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  const client = { from: () => builder } as unknown as SupabaseClient;
  return { client, calls };
}

describe("profile queries", () => {
  it("returns the rows on success", async () => {
    const rows = [{ id: "1", distinct_id: "u1", project_id: "p1" }];
    const { client } = clientReturning({ data: rows, error: null });
    expect(await fetchProfiles(client, "p1")).toEqual(rows);
  });

  it("returns an empty array when data is null", async () => {
    const { client } = clientReturning({ data: null, error: null });
    expect(await fetchProfiles(client, "p1")).toEqual([]);
  });

  it("throws when the list query errors", async () => {
    const { client } = clientReturning({
      data: null,
      error: new Error("boom"),
    });
    await expect(fetchProfiles(client, "p1")).rejects.toThrow();
  });

  it("scopes the list to the project, orders by recency, applies the limit", async () => {
    const { client, calls } = clientReturning({ data: [], error: null });
    await fetchProfiles(client, "proj-42", 25);
    expect(calls.eq).toEqual([["project_id", "proj-42"]]);
    expect(calls.order).toEqual(["last_seen_at", { ascending: false }]);
    expect(calls.limit).toEqual([25]);
  });

  it("fetchProfile returns the single row or null", async () => {
    const row = { id: "1", distinct_id: "u1", project_id: "p1" };
    const present = clientReturning({ data: row, error: null });
    expect(await fetchProfile(present.client, "p1", "u1")).toEqual(row);
    const absent = clientReturning({ data: null, error: null });
    expect(await fetchProfile(absent.client, "p1", "x")).toBeNull();
  });

  it("fetchProfile filters by both project_id and distinct_id, single-row", async () => {
    const { client, calls } = clientReturning({ data: null, error: null });
    await fetchProfile(client, "proj-42", "user-7");
    expect(calls.eq).toEqual([
      ["project_id", "proj-42"],
      ["distinct_id", "user-7"],
    ]);
    expect(calls.maybeSingle).toBe(true);
  });

  it("throws when the single query errors", async () => {
    const { client } = clientReturning({
      data: null,
      error: new Error("boom"),
    });
    await expect(fetchProfile(client, "p1", "u1")).rejects.toThrow();
  });
});

import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchProfile, fetchProfiles } from "./queries";

type Result = { data: unknown; error: unknown };

// Models only the query-builder shape the fetchers call; resolved via the thenable.
function clientReturning(result: Result): SupabaseClient {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    maybeSingle: () => builder,
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("profile queries", () => {
  it("returns the rows on success", async () => {
    const rows = [{ id: "1", distinct_id: "u1", project_id: "p1" }];
    expect(
      await fetchProfiles(clientReturning({ data: rows, error: null }), "p1"),
    ).toEqual(rows);
  });

  it("returns an empty array when data is null", async () => {
    expect(
      await fetchProfiles(clientReturning({ data: null, error: null }), "p1"),
    ).toEqual([]);
  });

  it("throws when the list query errors", async () => {
    await expect(
      fetchProfiles(
        clientReturning({ data: null, error: new Error("boom") }),
        "p1",
      ),
    ).rejects.toThrow();
  });

  it("fetchProfile returns the single row or null", async () => {
    const row = { id: "1", distinct_id: "u1", project_id: "p1" };
    expect(
      await fetchProfile(
        clientReturning({ data: row, error: null }),
        "p1",
        "u1",
      ),
    ).toEqual(row);
    expect(
      await fetchProfile(
        clientReturning({ data: null, error: null }),
        "p1",
        "x",
      ),
    ).toBeNull();
  });

  it("throws when the single query errors", async () => {
    await expect(
      fetchProfile(
        clientReturning({ data: null, error: new Error("boom") }),
        "p1",
        "u1",
      ),
    ).rejects.toThrow();
  });
});

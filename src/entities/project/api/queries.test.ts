import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchProject, fetchProjects } from "./queries";

type Result = { data: unknown; error: unknown };

function clientReturning(result: Result): SupabaseClient {
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: () => builder,
    maybeSingle: () => builder,
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  // Double-cast: the full SupabaseClient surface is far larger than this test
  // exercises, so we model only the query-builder shape the fetchers actually call.
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("project queries", () => {
  it("returns the rows on success", async () => {
    const rows = [{ id: "1", name: "Web", organization_id: "o1" }];
    expect(
      await fetchProjects(clientReturning({ data: rows, error: null })),
    ).toEqual(rows);
  });

  it("returns an empty array when data is null", async () => {
    expect(
      await fetchProjects(clientReturning({ data: null, error: null })),
    ).toEqual([]);
  });

  it("throws when the query errors", async () => {
    await expect(
      fetchProjects(clientReturning({ data: null, error: new Error("boom") })),
    ).rejects.toThrow();
  });

  it("fetchProject returns the single row or null", async () => {
    const row = { id: "1", name: "Web", organization_id: "o1" };
    expect(
      await fetchProject(clientReturning({ data: row, error: null }), "1"),
    ).toEqual(row);
    expect(
      await fetchProject(clientReturning({ data: null, error: null }), "x"),
    ).toBeNull();
  });
});

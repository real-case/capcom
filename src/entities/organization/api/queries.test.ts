import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchOrganization, fetchOrganizations } from "./queries";

type Result = { data: unknown; error: unknown };

// A minimal thenable PostgREST-builder stand-in: every chainable method returns
// the builder, and awaiting the builder resolves to the canned result.
function clientReturning(result: Result): SupabaseClient {
  const builder = {
    select: () => builder,
    order: () => builder,
    eq: () => builder,
    maybeSingle: () => builder,
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("organization queries", () => {
  it("returns the rows on success", async () => {
    const rows = [{ id: "1", name: "Acme" }];
    expect(
      await fetchOrganizations(clientReturning({ data: rows, error: null })),
    ).toEqual(rows);
  });

  it("returns an empty array when data is null", async () => {
    expect(
      await fetchOrganizations(clientReturning({ data: null, error: null })),
    ).toEqual([]);
  });

  it("throws when the query errors", async () => {
    await expect(
      fetchOrganizations(
        clientReturning({ data: null, error: new Error("boom") }),
      ),
    ).rejects.toThrow();
  });

  it("fetchOrganization returns the single row or null", async () => {
    const row = { id: "1", name: "Acme" };
    expect(
      await fetchOrganization(clientReturning({ data: row, error: null }), "1"),
    ).toEqual(row);
    expect(
      await fetchOrganization(
        clientReturning({ data: null, error: null }),
        "x",
      ),
    ).toBeNull();
  });
});

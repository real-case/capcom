import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchMyMemberships } from "./queries";

type Result = { data: unknown; error: unknown };

function clientReturning(result: Result): SupabaseClient {
  const builder = {
    select: () => builder,
    eq: () => builder,
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  return { from: () => builder } as unknown as SupabaseClient;
}

describe("membership queries", () => {
  it("returns the caller's membership rows on success", async () => {
    const rows = [
      { id: "1", user_id: "u1", organization_id: "o1", role: "admin" },
    ];
    expect(
      await fetchMyMemberships(
        clientReturning({ data: rows, error: null }),
        "u1",
      ),
    ).toEqual(rows);
  });

  it("returns an empty array when data is null", async () => {
    expect(
      await fetchMyMemberships(
        clientReturning({ data: null, error: null }),
        "u1",
      ),
    ).toEqual([]);
  });

  it("throws when the query errors", async () => {
    await expect(
      fetchMyMemberships(
        clientReturning({ data: null, error: new Error("boom") }),
        "u1",
      ),
    ).rejects.toThrow();
  });
});

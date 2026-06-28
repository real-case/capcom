import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { fetchReport, fetchReports } from "./queries";

type Result = { data: unknown; error: unknown };

// A query-builder mock that records chained-call arguments, so the tests assert the
// query SHAPE (project_id filter, newest-first order, maybeSingle by id) — a dropped
// filter or flipped order then fails, not just the resolved value.
function clientReturning(result: Result) {
  const calls = {
    eq: [] as unknown[][],
    order: undefined as unknown[] | undefined,
  };
  const builder = {
    select: () => builder,
    eq: (...a: unknown[]) => (calls.eq.push(a), builder),
    order: (...a: unknown[]) => ((calls.order = a), builder),
    maybeSingle: () => Promise.resolve(result),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  const client = { from: () => builder } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

describe("report queries (ADR 0090)", () => {
  it("fetchReports returns rows, scoped to the project newest-first", async () => {
    const rows = [{ id: "r1", project_id: "p1", name: "n", kind: "trends" }];
    const { client, calls } = clientReturning({ data: rows, error: null });
    expect(await fetchReports(client, "p1")).toEqual(rows);
    expect(calls.eq).toEqual([["project_id", "p1"]]);
    expect(calls.order).toEqual(["created_at", { ascending: false }]);
  });

  it("fetchReports returns [] when data is null", async () => {
    const { client } = clientReturning({ data: null, error: null });
    expect(await fetchReports(client, "p1")).toEqual([]);
  });

  it("fetchReports throws on error", async () => {
    const { client } = clientReturning({
      data: null,
      error: new Error("boom"),
    });
    await expect(fetchReports(client, "p1")).rejects.toThrow();
  });

  it("fetchReport returns a single row by id, or null", async () => {
    const row = { id: "r1", name: "n" };
    const found = clientReturning({ data: row, error: null });
    expect(await fetchReport(found.client, "r1")).toEqual(row);
    expect(found.calls.eq).toEqual([["id", "r1"]]);

    const missing = clientReturning({ data: null, error: null });
    expect(await fetchReport(missing.client, "nope")).toBeNull();
  });

  it("fetchReport throws on error", async () => {
    const { client } = clientReturning({ data: null, error: new Error("x") });
    await expect(fetchReport(client, "r1")).rejects.toThrow();
  });
});

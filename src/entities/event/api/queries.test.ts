import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { fetchEventTrends, fetchRecentEvents, fetchTopEvents } from "./queries";

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

// An rpc mock that RECORDS (name, args) so the tests assert the aggregation fetchers
// call the right Postgres function with the exact argument bag (ADR 0084) — a wrong
// fn name, a dropped arg, or accidental client-side reduction then fails. The fetchers
// forward args verbatim and only unwrap { data, error }, so there is no shape to assert
// beyond the call itself.
function rpcReturning(result: Result) {
  const calls: { rpc: unknown[][] } = { rpc: [] };
  const client = {
    rpc: (...a: unknown[]) => {
      calls.rpc.push(a);
      return Promise.resolve(result);
    },
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("fetchEventTrends", () => {
  const args = {
    p_project_id: "proj-42",
    p_event_name: "page_view",
    p_from: "2026-05-01T00:00:00.000Z",
    p_to: "2026-06-01T00:00:00.000Z",
    p_interval: "day",
  };

  it("calls the fn_event_trends RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchEventTrends(client, args);
    expect(calls.rpc).toEqual([["fn_event_trends", args]]);
  });

  it("returns the rows on success and [] when data is null", async () => {
    const rows = [
      { bucket: "2026-05-01T00:00:00Z", series: "page_view", count: 3 },
    ];
    expect(
      await fetchEventTrends(
        rpcReturning({ data: rows, error: null }).client,
        args,
      ),
    ).toEqual(rows);
    expect(
      await fetchEventTrends(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toEqual([]);
  });

  it("throws when the RPC errors (no swallowing)", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchEventTrends(client, args)).rejects.toThrow();
  });
});

describe("fetchTopEvents", () => {
  const args = {
    p_project_id: "proj-42",
    p_from: "2026-05-01T00:00:00.000Z",
    p_to: "2026-06-01T00:00:00.000Z",
    p_limit: 10,
  };

  it("calls the fn_top_events RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchTopEvents(client, args);
    expect(calls.rpc).toEqual([["fn_top_events", args]]);
  });

  it("returns the rows on success and [] when data is null", async () => {
    const rows = [{ event_name: "page_view", count: 42 }];
    expect(
      await fetchTopEvents(
        rpcReturning({ data: rows, error: null }).client,
        args,
      ),
    ).toEqual(rows);
    expect(
      await fetchTopEvents(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toEqual([]);
  });

  it("throws when the RPC errors", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchTopEvents(client, args)).rejects.toThrow();
  });
});

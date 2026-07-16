import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  fetchSegmentDistribution,
  fetchSegmentScatter,
  fetchSegmentSize,
} from "./queries";

type Result = { data: unknown; error: unknown };

// An rpc mock that RECORDS (name, args) so the tests assert the segment fetchers call the
// right Postgres function with the exact argument bag (ADR 0084/0089) — a wrong fn name, a
// dropped arg, or accidental client-side reduction then fails. The fetchers forward args
// verbatim and only unwrap { data, error }.
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

const rule = {
  match: "all",
  attributes: [{ key: "plan", op: "eq", value: "pro" }],
  behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
};

describe("fetchSegmentSize", () => {
  const args = {
    p_project_id: "proj-42",
    p_rule: rule,
    p_from: "2026-03-01T00:00:00.000Z",
    p_to: "2026-06-01T00:00:00.000Z",
  };

  it("calls the fn_segment_size RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: 0, error: null });
    await fetchSegmentSize(client, args);
    expect(calls.rpc).toEqual([["fn_segment_size", args]]);
  });

  it("returns the scalar count on success and 0 when data is null", async () => {
    expect(
      await fetchSegmentSize(
        rpcReturning({ data: 26, error: null }).client,
        args,
      ),
    ).toBe(26);
    expect(
      await fetchSegmentSize(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toBe(0);
  });

  it("throws when the RPC errors (no swallowing)", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchSegmentSize(client, args)).rejects.toThrow();
  });
});

describe("fetchSegmentDistribution", () => {
  const args = {
    p_project_id: "proj-42",
    p_rule: rule,
    p_dimension: "country",
    p_from: "2026-03-01T00:00:00.000Z",
    p_to: "2026-06-01T00:00:00.000Z",
  };

  it("calls the fn_segment_distribution RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchSegmentDistribution(client, args);
    expect(calls.rpc).toEqual([["fn_segment_distribution", args]]);
  });

  it("returns the rows on success and [] when data is null", async () => {
    const rows = [
      { bucket: "US", users: 5 },
      { bucket: "GB", users: 4 },
    ];
    expect(
      await fetchSegmentDistribution(
        rpcReturning({ data: rows, error: null }).client,
        args,
      ),
    ).toEqual(rows);
    expect(
      await fetchSegmentDistribution(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toEqual([]);
  });

  it("throws when the RPC errors", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchSegmentDistribution(client, args)).rejects.toThrow();
  });
});

describe("fetchSegmentScatter", () => {
  // p_limit is optional (it defaults to 300 in SQL); pass it explicitly so the test pins
  // that the fetcher forwards the bag VERBATIM rather than injecting a default of its own.
  const args = {
    p_project_id: "0a000000-0000-0000-0000-0000000000a1",
    p_from: "2026-05-01T00:00:00.000Z",
    p_to: "2026-06-01T00:00:00.000Z",
    p_limit: 10,
  };

  const points = [
    { distinct_id: "u1", frequency: 42, ltv: 199, plan: "enterprise" },
    { distinct_id: "u2", frequency: 7, ltv: 49, plan: "pro" },
    { distinct_id: "u3", frequency: 3, ltv: 0, plan: null },
  ];

  it("calls the fn_segment_scatter RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchSegmentScatter(client, args);
    expect(calls.rpc).toEqual([["fn_segment_scatter", args]]);
  });

  it("returns the reduced points on success and [] when data is null", async () => {
    expect(
      await fetchSegmentScatter(
        rpcReturning({ data: points, error: null }).client,
        args,
      ),
    ).toEqual(points);
    expect(
      await fetchSegmentScatter(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toEqual([]);
  });

  it("forwards the rows untouched — no client-side reduction, cap or re-sort (ADR 0084)", async () => {
    // The SQL owns the `ltv desc` order and the p_limit cap; the fetcher must not re-apply
    // either. Hand it deliberately out-of-order rows and assert they survive verbatim.
    const unsorted = [points[1]!, points[2]!, points[0]!];
    expect(
      await fetchSegmentScatter(
        rpcReturning({ data: unsorted, error: null }).client,
        args,
      ),
    ).toEqual(unsorted);
  });

  it("throws when the RPC errors (no swallowing)", async () => {
    await expect(
      fetchSegmentScatter(
        rpcReturning({ data: null, error: new Error("rls denied") }).client,
        args,
      ),
    ).rejects.toThrow("rls denied");
  });
});

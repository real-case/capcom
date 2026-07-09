import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import {
  fetchEvents,
  fetchEventsFacets,
  fetchEventsSummary,
  fetchEventTrends,
  fetchFunnel,
  fetchRecentEvents,
  fetchRetention,
  fetchTopEvents,
} from "./queries";

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

describe("fetchFunnel", () => {
  const args = {
    p_project_id: "proj-42",
    p_steps: ["page_view", "sign_up", "purchase"],
    p_from: "2026-05-01T00:00:00.000Z",
    p_to: "2026-06-01T00:00:00.000Z",
    p_window: "7 days",
  };

  it("calls the fn_funnel RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchFunnel(client, args);
    expect(calls.rpc).toEqual([["fn_funnel", args]]);
  });

  it("returns the rows on success and [] when data is null", async () => {
    const rows = [
      { step_index: 1, step_event: "page_view", users: 100 },
      { step_index: 2, step_event: "sign_up", users: 60 },
      { step_index: 3, step_event: "purchase", users: 20 },
    ];
    expect(
      await fetchFunnel(rpcReturning({ data: rows, error: null }).client, args),
    ).toEqual(rows);
    expect(
      await fetchFunnel(rpcReturning({ data: null, error: null }).client, args),
    ).toEqual([]);
  });

  it("throws when the RPC errors", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchFunnel(client, args)).rejects.toThrow();
  });
});

describe("fetchRetention", () => {
  const args = {
    p_project_id: "proj-42",
    p_from: "2026-03-01T00:00:00.000Z",
    p_to: "2026-06-01T00:00:00.000Z",
    p_period: "week",
  };

  it("calls the fn_retention RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchRetention(client, args);
    expect(calls.rpc).toEqual([["fn_retention", args]]);
  });

  it("returns the rows on success and [] when data is null", async () => {
    const rows = [
      {
        cohort_period: "2026-03-23T00:00:00+00:00",
        cohort_size: 10,
        period_offset: 0,
        retained_users: 10,
      },
      {
        cohort_period: "2026-03-23T00:00:00+00:00",
        cohort_size: 10,
        period_offset: 1,
        retained_users: 4,
      },
    ];
    expect(
      await fetchRetention(
        rpcReturning({ data: rows, error: null }).client,
        args,
      ),
    ).toEqual(rows);
    expect(
      await fetchRetention(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toEqual([]);
  });

  it("throws when the RPC errors", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchRetention(client, args)).rejects.toThrow();
  });
});

// A query-builder mock for the RANGED page fetcher: records the table, every filter
// predicate (eq / ilike / in / gte / lt), all order() calls, and the range() bounds, so a
// dropped project filter, a coerced/concatenated predicate, a flipped sort, a missing
// tiebreak, or a wrong page window fails the test (ADR 0097). Every predicate is a
// parameterized builder call — the test asserts the operator + arguments, never a SQL string.
function pageClientReturning(result: Result) {
  const calls = {
    from: undefined as unknown,
    eq: [] as unknown[][],
    ilike: [] as unknown[][],
    in: [] as unknown[][],
    gte: [] as unknown[][],
    lt: [] as unknown[][],
    order: [] as unknown[][],
    range: undefined as unknown[] | undefined,
  };
  const builder = {
    select: () => builder,
    eq: (...a: unknown[]) => (calls.eq.push(a), builder),
    ilike: (...a: unknown[]) => (calls.ilike.push(a), builder),
    in: (...a: unknown[]) => (calls.in.push(a), builder),
    gte: (...a: unknown[]) => (calls.gte.push(a), builder),
    lt: (...a: unknown[]) => (calls.lt.push(a), builder),
    order: (...a: unknown[]) => (calls.order.push(a), builder),
    range: (...a: unknown[]) => ((calls.range = a), builder),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  const client = {
    from: (table: unknown) => ((calls.from = table), builder),
  } as unknown as SupabaseClient;
  return { client, calls };
}

describe("fetchEvents", () => {
  it("returns rows on success, [] when null, and throws on error", async () => {
    const rows = [{ id: "1", event_name: "purchase", project_id: "p1" }];
    expect(
      await fetchEvents(
        pageClientReturning({ data: rows, error: null }).client,
        "p1",
      ),
    ).toEqual(rows);
    expect(
      await fetchEvents(
        pageClientReturning({ data: null, error: null }).client,
        "p1",
      ),
    ).toEqual([]);
    await expect(
      fetchEvents(
        pageClientReturning({ data: null, error: new Error("boom") }).client,
        "p1",
      ),
    ).rejects.toThrow();
  });

  it("scopes to the project, sorts ts desc with an id tiebreak, and pages by default range", async () => {
    const { client, calls } = pageClientReturning({ data: [], error: null });
    await fetchEvents(client, "proj-42");
    expect(calls.from).toBe("events");
    expect(calls.eq).toEqual([["project_id", "proj-42"]]);
    expect(calls.order).toEqual([
      ["ts", { ascending: false }],
      ["id", { ascending: false }],
    ]);
    // Default offset 0, limit 25 → inclusive range [0, 24].
    expect(calls.range).toEqual([0, 24]);
  });

  it("applies the explicit page window and the distinct_id filter", async () => {
    const { client, calls } = pageClientReturning({ data: [], error: null });
    await fetchEvents(client, "proj-42", {
      offset: 50,
      limit: 10,
      distinctId: "u_9f3a",
    });
    expect(calls.eq).toEqual([
      ["project_id", "proj-42"],
      ["distinct_id", "u_9f3a"],
    ]);
    expect(calls.range).toEqual([50, 59]);
  });

  it("applies the closed filter as parameterized predicates (ADR 0089)", async () => {
    const { client, calls } = pageClientReturning({ data: [], error: null });
    await fetchEvents(client, "proj-42", {
      filter: {
        search: "  buy  ",
        events: ["purchase"],
        plans: ["pro", "enterprise"],
        countries: [], // empty → no predicate
        devices: ["mobile"],
        from: "2026-06-01T00:00:00.000Z",
        to: "2026-07-01T00:00:00.000Z",
      },
    });
    // Search is trimmed and wrapped as a parameterized ILIKE pattern, never concatenated SQL.
    expect(calls.ilike).toEqual([["event_name", "%buy%"]]);
    // `in` over the event name and the jsonb `->>'` paths; the empty country selection is skipped.
    expect(calls.in).toEqual([
      ["event_name", ["purchase"]],
      ["properties->>plan", ["pro", "enterprise"]],
      ["properties->>device", ["mobile"]],
    ]);
    expect(calls.gte).toEqual([["ts", "2026-06-01T00:00:00.000Z"]]);
    expect(calls.lt).toEqual([["ts", "2026-07-01T00:00:00.000Z"]]);
  });

  it("skips every predicate for an empty filter (blank search, no selections)", async () => {
    const { client, calls } = pageClientReturning({ data: [], error: null });
    await fetchEvents(client, "proj-42", {
      filter: {
        search: "   ",
        events: [],
        plans: [],
        countries: [],
        devices: [],
      },
    });
    expect(calls.ilike).toEqual([]);
    expect(calls.in).toEqual([]);
    expect(calls.gte).toEqual([]);
    expect(calls.lt).toEqual([]);
  });

  it("applies a multi-column sort in order, then the id tiebreak", async () => {
    const { client, calls } = pageClientReturning({ data: [], error: null });
    await fetchEvents(client, "proj-42", {
      sort: [
        { column: "event_name", desc: false },
        { column: "ts", desc: true },
      ],
    });
    expect(calls.order).toEqual([
      ["event_name", { ascending: true }],
      ["ts", { ascending: false }],
      ["id", { ascending: false }],
    ]);
  });
});

describe("fetchEventsFacets", () => {
  const args = {
    p_project_id: "proj-42",
    p_dimension: "plan",
    p_devices: ["mobile"],
  };

  it("calls the fn_events_facets RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchEventsFacets(client, args);
    expect(calls.rpc).toEqual([["fn_events_facets", args]]);
  });

  it("returns the rows on success and [] when data is null", async () => {
    const rows = [
      { value: "pro", count: 12 },
      { value: "free", count: 8 },
    ];
    expect(
      await fetchEventsFacets(
        rpcReturning({ data: rows, error: null }).client,
        args,
      ),
    ).toEqual(rows);
    expect(
      await fetchEventsFacets(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toEqual([]);
  });

  it("throws when the RPC errors", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchEventsFacets(client, args)).rejects.toThrow();
  });
});

describe("fetchEventsSummary", () => {
  const args = { p_project_id: "proj-42" };

  it("calls the fn_events_summary RPC with the exact name and argument bag", async () => {
    const { client, calls } = rpcReturning({ data: [], error: null });
    await fetchEventsSummary(client, args);
    expect(calls.rpc).toEqual([["fn_events_summary", args]]);
  });

  it("unwraps the single summary row on success", async () => {
    const row = { total_events: 3942, distinct_users: 1842, value_sum: 41980 };
    expect(
      await fetchEventsSummary(
        rpcReturning({ data: [row], error: null }).client,
        args,
      ),
    ).toEqual(row);
  });

  it("returns zeros when RLS yields no row (empty or null)", async () => {
    const zeros = { total_events: 0, distinct_users: 0, value_sum: 0 };
    expect(
      await fetchEventsSummary(
        rpcReturning({ data: [], error: null }).client,
        args,
      ),
    ).toEqual(zeros);
    expect(
      await fetchEventsSummary(
        rpcReturning({ data: null, error: null }).client,
        args,
      ),
    ).toEqual(zeros);
  });

  it("throws when the RPC errors (no swallowing)", async () => {
    const { client } = rpcReturning({ data: null, error: new Error("boom") });
    await expect(fetchEventsSummary(client, args)).rejects.toThrow();
  });
});

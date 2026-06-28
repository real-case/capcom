import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

import { fetchDashboards } from "./queries";

type Result = { data: unknown; error: unknown };

function clientReturning(result: Result) {
  const calls = {
    eq: [] as unknown[][],
    order: undefined as unknown[] | undefined,
  };
  const builder = {
    select: () => builder,
    eq: (...a: unknown[]) => (calls.eq.push(a), builder),
    order: (...a: unknown[]) => ((calls.order = a), builder),
    then: (resolve: (value: Result) => unknown) => resolve(result),
  };
  const client = { from: () => builder } as unknown as SupabaseClient<Database>;
  return { client, calls };
}

const dashboard = (items: { id: string; position: number }[]) => ({
  id: "d1",
  project_id: "p1",
  owner_id: null,
  name: "Board",
  created_at: "2026-06-01T00:00:00.000Z",
  updated_at: "2026-06-01T00:00:00.000Z",
  items: items.map((i) => ({ ...i, report: { id: `r-${i.id}` } })),
});

describe("dashboard queries (ADR 0090)", () => {
  it("returns a project's dashboards newest-first", async () => {
    const { client, calls } = clientReturning({
      data: [dashboard([{ id: "i1", position: 0 }])],
      error: null,
    });
    const result = await fetchDashboards(client, "p1");
    expect(result).toHaveLength(1);
    expect(calls.eq).toEqual([["project_id", "p1"]]);
    expect(calls.order).toEqual(["created_at", { ascending: false }]);
  });

  it("orders each dashboard's composed reports by position", async () => {
    // Items returned out of order — PostgREST does not guarantee embedded order.
    const { client } = clientReturning({
      data: [
        dashboard([
          { id: "b", position: 2 },
          { id: "a", position: 0 },
          { id: "c", position: 1 },
        ]),
      ],
      error: null,
    });
    const [board] = await fetchDashboards(client, "p1");
    expect(board!.items.map((i) => i.position)).toEqual([0, 1, 2]);
    expect(board!.items.map((i) => i.id)).toEqual(["a", "c", "b"]);
  });

  it("returns [] when data is null", async () => {
    const { client } = clientReturning({ data: null, error: null });
    expect(await fetchDashboards(client, "p1")).toEqual([]);
  });

  it("throws on error", async () => {
    const { client } = clientReturning({ data: null, error: new Error("x") });
    await expect(fetchDashboards(client, "p1")).rejects.toThrow();
  });
});

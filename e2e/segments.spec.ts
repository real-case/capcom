import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * In-database segmentation tests (ADR 0089 Confirmation, PR-7).
 *
 * `fn_segment_size` / `fn_segment_distribution` are `SECURITY INVOKER`, so they reduce
 * `profiles` + `events` under the CALLING member's RLS. These specs prove the ADR 0089
 * model — (1) an empty rule matches the whole tracked population; (2) attribute predicates
 * partition it (eq/neq complementary, in = union of disjoint eq); (3) behavioural
 * predicates partition it (performed vs never); (4) AND-composition is the intersection
 * (adding a predicate never grows the segment); (5) the distribution sums to the size and
 * is descending; (6) the closed grammar is the injection boundary (a value with SQL
 * metacharacters matches nothing and raises nothing) — and that the ADR 0083 isolation is
 * inherited: a non-member gets size 0 / zero rows with no error.
 *
 * Requires the dense seed at a pinned anchor so the window below has signal:
 *   npm run db:reset
 *   SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z npm run seed:events
 * Assertions are tenant-scoped properties, not exact magnitudes.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

// Seeded fixtures — see supabase/seed.sql and scripts/seed-events.mjs.
const AURORA_WEB_PROJECT = "0a000000-0000-0000-0000-0000000000a1";
const GLOBEX_PROJECT = "0b000000-0000-0000-0000-0000000000b1";
const PASSWORD = "password123";

// A window that covers the pinned-anchor seed spread (trailing 90 days off
// 2026-06-24), queried explicitly so the assertions don't drift with the wall clock.
const FROM = "2026-03-01T00:00:00.000Z";
const TO = "2026-06-25T00:00:00.000Z";

type Rule = Record<string, unknown>;
type DistRow = { bucket: string; users: number };

function anonClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(email: string): Promise<SupabaseClient> {
  const supabase = anonClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  expect(error, `sign-in failed for ${email}: ${error?.message}`).toBeNull();
  return supabase;
}

/** Segment size for a rule, asserting no error and a numeric result. */
async function size(
  client: SupabaseClient,
  rule: Rule,
  projectId = AURORA_WEB_PROJECT,
): Promise<number> {
  const { data, error } = await client.rpc("fn_segment_size", {
    p_project_id: projectId,
    p_rule: rule,
    p_from: FROM,
    p_to: TO,
  });
  expect(error).toBeNull();
  return Number(data);
}

async function distribution(
  client: SupabaseClient,
  rule: Rule,
  dimension: string,
  projectId = AURORA_WEB_PROJECT,
): Promise<DistRow[]> {
  const { data, error } = await client.rpc("fn_segment_distribution", {
    p_project_id: projectId,
    p_rule: rule,
    p_dimension: dimension,
    p_from: FROM,
    p_to: TO,
  });
  expect(error).toBeNull();
  return (data ?? []) as DistRow[];
}

test.describe("fn_segment_size (ADR 0089)", () => {
  test("an empty rule matches the whole tracked population", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora
    const empty = await size(bob, {});

    // Independently: one profile row per tracked user (exact head count, no row transfer).
    const { count } = await bob
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("project_id", AURORA_WEB_PROJECT);

    expect(empty).toBe(count);
    expect(empty).toBeGreaterThan(0);
  });

  test("attribute predicates partition the population (eq/neq complementary, in = union of eq)", async () => {
    const bob = await signIn("bob@capcom.dev");
    const total = await size(bob, {});

    const free = await size(bob, {
      attributes: [{ key: "plan", op: "eq", value: "free" }],
    });
    const notFree = await size(bob, {
      attributes: [{ key: "plan", op: "neq", value: "free" }],
    });
    // eq and neq on the same key are complements over the population.
    expect(free + notFree).toBe(total);
    expect(free).toBeGreaterThan(0);
    expect(notFree).toBeGreaterThan(0);

    // `in` over a key = the union of the per-value eq sets (one country per user, so
    // the eq sets are disjoint and their sizes add up).
    const us = await size(bob, {
      attributes: [{ key: "country", op: "eq", value: "US" }],
    });
    const gb = await size(bob, {
      attributes: [{ key: "country", op: "eq", value: "GB" }],
    });
    const usOrGb = await size(bob, {
      attributes: [{ key: "country", op: "in", value: ["US", "GB"] }],
    });
    expect(usOrGb).toBe(us + gb);
  });

  test("behavioural predicates partition the population (performed vs never)", async () => {
    const bob = await signIn("bob@capcom.dev");
    const total = await size(bob, {});

    const signedUp = await size(bob, {
      behaviors: [{ event: "sign_up", op: "at_least", count: 1 }],
    });
    const neverSignedUp = await size(bob, {
      behaviors: [{ event: "sign_up", op: "at_most", count: 0 }],
    });
    // "performed ≥ 1" and "performed ≤ 0" are complements over the population.
    expect(signedUp + neverSignedUp).toBe(total);
    expect(signedUp).toBeGreaterThan(0);
    expect(neverSignedUp).toBeGreaterThan(0);

    const purchasers = await size(bob, {
      behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
    });
    expect(purchasers).toBeGreaterThan(0);
    expect(purchasers).toBeLessThanOrEqual(total);
  });

  test("AND-composition is the intersection — adding a predicate never grows the segment", async () => {
    const bob = await signIn("bob@capcom.dev");

    const pro = await size(bob, {
      attributes: [{ key: "plan", op: "eq", value: "pro" }],
    });
    const purchased = await size(bob, {
      behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
    });
    const both = await size(bob, {
      match: "all",
      attributes: [{ key: "plan", op: "eq", value: "pro" }],
      behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
    });

    // The AND is a subset of each predicate's set, and non-empty on the seed.
    expect(both).toBeLessThanOrEqual(Math.min(pro, purchased));
    expect(both).toBeGreaterThan(0);
  });

  test("the closed grammar is the injection boundary — a metacharacter value matches nothing, raises nothing", async () => {
    const bob = await signIn("bob@capcom.dev");

    const injected = await size(bob, {
      attributes: [
        { key: "plan", op: "eq", value: "pro'); drop table public.events; --" },
      ],
    });
    expect(injected).toBe(0); // treated as a literal — matches no plan

    // The events table is intact: the metacharacters never reached SQL.
    const { count } = await bob
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("project_id", AURORA_WEB_PROJECT);
    expect(count ?? 0).toBeGreaterThan(0);
  });
});

test.describe("fn_segment_distribution (ADR 0089)", () => {
  test("the distribution sums to the size and is descending by users", async () => {
    const bob = await signIn("bob@capcom.dev");
    const rule: Rule = {
      match: "all",
      attributes: [{ key: "plan", op: "eq", value: "pro" }],
      behaviors: [{ event: "purchase", op: "at_least", count: 1 }],
    };

    const total = await size(bob, rule);
    const rows = await distribution(bob, rule, "country");

    expect(rows.length).toBeGreaterThan(0);
    const sum = rows.reduce((n, r) => n + Number(r.users), 0);
    expect(sum).toBe(total); // every matched user lands in exactly one bucket

    // Ordered by users descending (the SQL order; a stable chart).
    for (let i = 1; i < rows.length; i++) {
      expect(Number(rows[i - 1]!.users)).toBeGreaterThanOrEqual(
        Number(rows[i]!.users),
      );
    }
  });
});

test.describe("cross-tenant isolation (ADR 0083, inherited via SECURITY INVOKER)", () => {
  test("a non-member gets size 0 / zero rows — no error, never another tenant's users", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only

    // A tenant carol cannot access: RLS hides Aurora's profiles, so nothing matches.
    const foreignSize = await size(carol, {}, AURORA_WEB_PROJECT);
    expect(foreignSize).toBe(0);
    const foreignDist = await distribution(
      carol,
      {},
      "country",
      AURORA_WEB_PROJECT,
    );
    expect(foreignDist.length).toBe(0);

    // Sanity: carol DOES see her own tenant's population.
    const ownSize = await size(carol, {}, GLOBEX_PROJECT);
    expect(ownSize).toBeGreaterThan(0);
  });
});

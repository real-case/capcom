import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * In-database retention aggregation tests (ADR 0088 Confirmation, PR-6).
 *
 * `fn_retention` is `SECURITY INVOKER`, so it reduces `events` under the CALLING member's
 * RLS. These specs prove the ADR 0088 semantics — (1) the offset-0 column equals each
 * cohort's size (the 100% baseline); (2) retained_users never exceeds cohort_size; (3)
 * the grid is triangular and contiguous (older cohorts have more offsets, no gaps); (4)
 * cohort sizes count DISTINCT acquired users (first-touch in window), not event volume,
 * and a pre-existing user is not re-counted; (5) week and month both compute and an
 * invalid period is rejected — and that the ADR 0083 isolation is inherited: a non-member
 * gets zero rows (no cohorts) with no error.
 *
 * Requires the dense seed at a pinned anchor so the window below has signal:
 *   npm run db:reset
 *   SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z npm run seed:events
 * Assertions are tenant-scoped properties, not exact magnitudes.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:20030";
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

type RetentionRow = {
  cohort_period: string;
  cohort_size: number;
  period_offset: number;
  retained_users: number;
};

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

/** Group flat cells into cohorts keyed by period, offsets in ascending order. */
type CohortAgg = {
  size: number;
  offsets: number[];
  retained: Map<number, number>;
};

function byCohort(rows: RetentionRow[]) {
  const map = new Map<string, CohortAgg>();
  for (const r of rows) {
    const c: CohortAgg = map.get(r.cohort_period) ?? {
      size: Number(r.cohort_size),
      offsets: [],
      retained: new Map<number, number>(),
    };
    c.offsets.push(Number(r.period_offset));
    c.retained.set(Number(r.period_offset), Number(r.retained_users));
    map.set(r.cohort_period, c);
  }
  for (const c of map.values()) c.offsets.sort((a, b) => a - b);
  return map;
}

test.describe("fn_retention (ADR 0088)", () => {
  test("offset-0 is the cohort size (100%) and no cell exceeds it", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora
    const { data, error } = await bob.rpc("fn_retention", {
      p_project_id: AURORA_WEB_PROJECT,
      p_from: FROM,
      p_to: TO,
      p_period: "week",
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as RetentionRow[];
    expect(rows.length).toBeGreaterThan(0);

    const cohorts = byCohort(rows);
    for (const [, c] of cohorts) {
      // Baseline: every cohort member is active in its own period.
      expect(c.retained.get(0)).toBe(c.size);
      // Subset bound: retained users are a subset of the cohort at every offset.
      for (const [, ret] of c.retained) {
        expect(ret).toBeLessThanOrEqual(c.size);
        expect(ret).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("the grid is triangular and contiguous (older cohorts span more periods)", async () => {
    const bob = await signIn("bob@capcom.dev");
    const { data } = await bob.rpc("fn_retention", {
      p_project_id: AURORA_WEB_PROJECT,
      p_from: FROM,
      p_to: TO,
      p_period: "week",
    });
    const rows = (data ?? []) as RetentionRow[];
    const cohorts = [...byCohort(rows).entries()].sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    expect(cohorts.length).toBeGreaterThan(2);

    // Each cohort emits a contiguous offset run 0..max (the zero-fill spine, no gaps).
    for (const [, c] of cohorts) {
      const max = c.offsets[c.offsets.length - 1]!;
      expect(c.offsets).toEqual(Array.from({ length: max + 1 }, (_, i) => i));
    }

    // Triangular: the oldest cohort spans strictly more periods than the newest.
    const maxOffset = (c: { offsets: number[] }) =>
      c.offsets[c.offsets.length - 1]!;
    const oldest = cohorts[0]![1];
    const newest = cohorts[cohorts.length - 1]![1];
    expect(maxOffset(oldest)).toBeGreaterThan(maxOffset(newest));
  });

  test("cohort sizes count DISTINCT acquired users, not events", async () => {
    const bob = await signIn("bob@capcom.dev");
    const acquired = async (from: string) => {
      const { data } = await bob.rpc("fn_retention", {
        p_project_id: AURORA_WEB_PROJECT,
        p_from: from,
        p_to: TO,
        p_period: "week",
      });
      // Sum of offset-0 cells = sum of cohort sizes = total acquired users in window.
      return [...byCohort((data ?? []) as RetentionRow[]).values()].reduce(
        (sum, c) => sum + c.size,
        0,
      );
    };
    const totalAcquired = await acquired(FROM);

    // Independently, via exact head counts (no row transfer, so no PostgREST page cap):
    // one profile row per tracked user, and the raw event volume. The cohort total is a
    // DISTINCT-user count — it equals the tracked-user population and is far below the
    // event volume, so it cannot be counting events.
    const { count: profileCount } = await bob
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("project_id", AURORA_WEB_PROJECT);
    const { count: eventCount } = await bob
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("project_id", AURORA_WEB_PROJECT);

    // Every seeded user is first seen inside the full window, so the cohort total equals
    // the distinct tracked-user count — and is a small fraction of the event volume.
    expect(totalAcquired).toBe(profileCount);
    expect(totalAcquired).toBeLessThan(eventCount ?? 0);

    // Pre-existing users are NOT re-counted: narrowing the acquisition window strictly
    // shrinks the cohort population (users first seen before the new `from` drop out,
    // even though they remain active inside the window) — first-touch, not any-touch.
    const narrowed = await acquired("2026-05-01T00:00:00.000Z");
    expect(narrowed).toBeGreaterThan(0);
    expect(narrowed).toBeLessThan(totalAcquired);
  });

  test("week and month both compute; an invalid period is rejected", async () => {
    const bob = await signIn("bob@capcom.dev");
    const call = (period: string) =>
      bob.rpc("fn_retention", {
        p_project_id: AURORA_WEB_PROJECT,
        p_from: FROM,
        p_to: TO,
        p_period: period,
      });

    const weekly = await call("week");
    const monthly = await call("month");
    expect(weekly.error).toBeNull();
    expect(monthly.error).toBeNull();
    expect((weekly.data ?? []).length).toBeGreaterThan(0);
    expect((monthly.data ?? []).length).toBeGreaterThan(0);
    // Monthly buckets time more coarsely, so it yields fewer cohorts than weekly.
    const cohorts = (d: unknown) =>
      new Set((d as RetentionRow[]).map((r) => r.cohort_period)).size;
    expect(cohorts(monthly.data)).toBeLessThan(cohorts(weekly.data));

    const bad = await call("day");
    expect(bad.error).not.toBeNull();
  });
});

test.describe("cross-tenant isolation (ADR 0083, inherited via SECURITY INVOKER)", () => {
  test("a non-member gets zero rows — no cohorts, no error, never another tenant's retention", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only

    const foreign = await carol.rpc("fn_retention", {
      p_project_id: AURORA_WEB_PROJECT, // a tenant carol cannot access
      p_from: FROM,
      p_to: TO,
      p_period: "week",
    });
    // RLS hides Aurora's events from carol, so there are no cohorts to scaffold: zero
    // rows, and NO error.
    expect(foreign.error).toBeNull();
    expect((foreign.data ?? []).length).toBe(0);

    // Sanity: carol DOES see her own tenant's retention.
    const own = await carol.rpc("fn_retention", {
      p_project_id: GLOBEX_PROJECT,
      p_from: FROM,
      p_to: TO,
      p_period: "week",
    });
    expect(own.error).toBeNull();
    expect((own.data ?? []).length).toBeGreaterThan(0);
  });
});

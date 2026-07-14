import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * In-database Overview KPI aggregation tests (ADR 0099 / 0084 Confirmation, Phase D).
 *
 * `fn_overview_kpis` and `fn_overview_signal` are `SECURITY INVOKER`, so they reduce
 * `events` under the CALLING member's RLS. These specs prove: (1) the KPI reductions hold
 * their tenant-scoped invariants (active_users > 0; purchasers/new_signups are DISTINCT-user
 * subsets ≤ active_users; value_sum ≥ 0); (2) the "_prev" columns equal a second call whose
 * CURRENT window is the equal-length adjacent preceding span — the identity that pins the
 * `[from - (to-from), from)` window (off-by-one / overlap / wrong-length all fail); (3) the
 * signal buckets fall inside the window and are ordered; and (4) the ADR 0083 isolation is
 * inherited: a non-member's call returns zeros / all-zero buckets with no error, never
 * another tenant's numbers.
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

// A window inside the pinned-anchor seed spread, queried explicitly so the assertions don't
// drift with the wall clock. The adjacent preceding span (for the _prev identity) is derived
// from the span so it always matches the SQL `[from - (to-from), from)` definition.
const FROM = "2026-05-01T00:00:00.000Z";
const TO = "2026-06-01T00:00:00.000Z";
const SPAN_MS = new Date(TO).getTime() - new Date(FROM).getTime();
const PREV_FROM = new Date(new Date(FROM).getTime() - SPAN_MS).toISOString();

type Kpis = {
  active_users: number;
  active_users_prev: number;
  new_signups: number;
  new_signups_prev: number;
  purchasers: number;
  purchasers_prev: number;
  value_sum: number;
  value_sum_prev: number;
};
type SignalRow = {
  bucket: string;
  active_users: number;
  new_signups: number;
  value_sum: number;
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

async function kpis(
  client: SupabaseClient,
  projectId: string,
  from: string,
  to: string,
): Promise<Kpis> {
  const { data, error } = await client.rpc("fn_overview_kpis", {
    p_project_id: projectId,
    p_from: from,
    p_to: to,
  });
  expect(error).toBeNull();
  return (data as Kpis[])[0]!;
}

test.describe("fn_overview_kpis (ADR 0099/0084)", () => {
  test("reduces the KPIs with tenant-scoped subset invariants", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora
    const k = await kpis(bob, AURORA_WEB_PROJECT, FROM, TO);

    // Real signal in the window.
    expect(Number(k.active_users)).toBeGreaterThan(0);
    // purchasers and new_signups are DISTINCT-user subsets of the active users.
    expect(Number(k.purchasers)).toBeLessThanOrEqual(Number(k.active_users));
    expect(Number(k.new_signups)).toBeLessThanOrEqual(Number(k.active_users));
    // Revenue is a non-negative sum.
    expect(Number(k.value_sum)).toBeGreaterThanOrEqual(0);
    // The previous-window columns are consistent too.
    expect(Number(k.purchasers_prev)).toBeLessThanOrEqual(
      Number(k.active_users_prev),
    );
  });

  test("the _prev columns equal the equal-length adjacent preceding window", async () => {
    const bob = await signIn("bob@capcom.dev");
    const current = await kpis(bob, AURORA_WEB_PROJECT, FROM, TO);
    // A second call whose CURRENT window is exactly the span the _prev columns cover.
    const prior = await kpis(bob, AURORA_WEB_PROJECT, PREV_FROM, FROM);

    // Identity: the first call's _prev == the prior window's current — this pins the
    // equal-length, adjacent, half-open `[from - (to-from), from)` window.
    expect(Number(current.active_users_prev)).toBe(Number(prior.active_users));
    expect(Number(current.new_signups_prev)).toBe(Number(prior.new_signups));
    expect(Number(current.purchasers_prev)).toBe(Number(prior.purchasers));
    expect(Number(current.value_sum_prev)).toBeCloseTo(
      Number(prior.value_sum),
      2,
    );
  });

  test("the signal buckets fall inside the window and are ordered", async () => {
    const bob = await signIn("bob@capcom.dev");
    // Day granularity keeps the truncated bucket labels aligned to the midnight window
    // bounds (a week/month truncation can snap the first bucket back to the period start —
    // the accepted fn_event_trends behavior — so it is not asserted for in-window bounds).
    const { data, error } = await bob.rpc("fn_overview_signal", {
      p_project_id: AURORA_WEB_PROJECT,
      p_from: FROM,
      p_to: TO,
      p_interval: "day",
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as SignalRow[];
    expect(rows.length).toBeGreaterThan(0);

    const times = rows.map((r) => new Date(r.bucket).getTime());
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(new Date(FROM).getTime());
      expect(t).toBeLessThan(new Date(TO).getTime());
    }
    // Strictly ascending buckets (the zero-fill spine is ordered).
    for (let i = 1; i < times.length; i++) {
      expect(times[i]!).toBeGreaterThan(times[i - 1]!);
    }
    // Every measure is a non-negative reduced value.
    expect(rows.every((r) => Number(r.active_users) >= 0)).toBe(true);
  });
});

test.describe("cross-tenant isolation (ADR 0083, inherited via SECURITY INVOKER)", () => {
  test("a non-member gets all-zero KPIs / zero-filled signal — never another tenant's numbers", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only

    // RLS hides Aurora's events from carol → every KPI reduces over nothing, NO error.
    const foreign = await kpis(carol, AURORA_WEB_PROJECT, FROM, TO);
    expect(Number(foreign.active_users)).toBe(0);
    expect(Number(foreign.new_signups)).toBe(0);
    expect(Number(foreign.purchasers)).toBe(0);
    expect(Number(foreign.value_sum)).toBe(0);
    expect(Number(foreign.active_users_prev)).toBe(0);
    expect(Number(foreign.value_sum_prev)).toBe(0);

    const foreignSignal = await carol.rpc("fn_overview_signal", {
      p_project_id: AURORA_WEB_PROJECT,
      p_from: FROM,
      p_to: TO,
      p_interval: "week",
    });
    expect(foreignSignal.error).toBeNull();
    const sigRows = (foreignSignal.data ?? []) as SignalRow[];
    // The bucket spine still renders (zero-filled), but every measure is zero.
    expect(
      sigRows.every(
        (r) => Number(r.active_users) === 0 && Number(r.value_sum) === 0,
      ),
    ).toBe(true);

    // Sanity: carol DOES see her own tenant's KPIs.
    const own = await kpis(carol, GLOBEX_PROJECT, FROM, TO);
    expect(Number(own.active_users)).toBeGreaterThan(0);
  });
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * In-database trends aggregation tests (ADR 0084 Confirmation, PR-4).
 *
 * The trend / top-event functions are `SECURITY INVOKER`, so they reduce `events`
 * under the CALLING member's RLS. These specs prove that (1) the reduction is correct
 * — contiguous zero-filled buckets, a top-N + 'Other' breakdown, descending ranking —
 * and (2) the ADR 0083 isolation is inherited: a non-member's call returns zero rows
 * with no error, never another tenant's aggregates.
 *
 * Requires the dense seed at a pinned anchor so the window below has signal:
 *   npm run db:reset
 *   SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z npm run seed:events
 * (the spec's test_command runs both before this file). Assertions are tenant-scoped
 * properties, not exact counts.
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
const TO = "2026-06-26T00:00:00.000Z";

type Bucket = { bucket: string; series: string; count: number };
type TopRow = { event_name: string; count: number };

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

test.describe("fn_event_trends (ADR 0084)", () => {
  test("buckets are contiguous and zero-filled for a single series", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora
    const { data, error } = await bob.rpc("fn_event_trends", {
      p_project_id: AURORA_WEB_PROJECT,
      p_event_name: "page_view",
      p_from: FROM,
      p_to: TO,
      p_interval: "day",
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as Bucket[];
    expect(rows.length).toBeGreaterThan(0);

    // Exactly one series (no breakdown), and it is the event name.
    expect(new Set(rows.map((r) => r.series))).toEqual(new Set(["page_view"]));
    // There is real signal in the window.
    expect(rows.reduce((sum, r) => sum + Number(r.count), 0)).toBeGreaterThan(
      0,
    );
    // Contiguous daily buckets: every step is exactly 1 day — no gaps, which is the
    // proof the empty buckets were zero-filled rather than dropped.
    const DAY = 86_400_000;
    const ts = rows
      .map((r) => new Date(r.bucket).getTime())
      .sort((a, b) => a - b);
    // Pairwise step check via reduce (no index access / non-null assertions): each
    // consecutive pair must be exactly one day apart.
    ts.reduce((prev, cur) => {
      expect(cur - prev).toBe(DAY);
      return cur;
    });
    // No trailing all-zero bucket at the (boundary-aligned, half-open) window edge:
    // the match window is `ts < p_to`, so the last bucket must be strictly before p_to.
    expect(Math.max(...ts)).toBeLessThan(new Date(TO).getTime());
    // Zero-fill means a bucket can legitimately be 0; none is negative.
    expect(rows.every((r) => Number(r.count) >= 0)).toBe(true);
  });

  test("a breakdown yields top-N series plus an 'Other' rollup on every bucket", async () => {
    const bob = await signIn("bob@capcom.dev");
    const LIMIT = 2;
    const { data, error } = await bob.rpc("fn_event_trends", {
      p_project_id: AURORA_WEB_PROJECT,
      p_event_name: "page_view",
      p_from: FROM,
      p_to: TO,
      p_interval: "month",
      p_breakdown_key: "device",
      p_breakdown_limit: LIMIT,
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as Bucket[];
    expect(rows.length).toBeGreaterThan(0);

    const series = new Set(rows.map((r) => r.series));
    // device has more than LIMIT values in the seed, so the surplus folds into 'Other'.
    expect(series.has("Other")).toBe(true);
    // top-N named series + the 'Other' rollup.
    expect(series.size).toBe(LIMIT + 1);
    // Zero-filled grid: every (bucket × series) pair is present exactly once.
    const buckets = new Set(rows.map((r) => r.bucket));
    expect(rows.length).toBe(buckets.size * series.size);
  });

  test("an invalid interval is rejected", async () => {
    const bob = await signIn("bob@capcom.dev");
    const { error } = await bob.rpc("fn_event_trends", {
      p_project_id: AURORA_WEB_PROJECT,
      p_event_name: "page_view",
      p_from: FROM,
      p_to: TO,
      p_interval: "fortnight",
    });
    expect(error).not.toBeNull();
  });
});

test.describe("fn_top_events (ADR 0084)", () => {
  test("returns events ranked by count, descending, within the limit", async () => {
    const bob = await signIn("bob@capcom.dev");
    const LIMIT = 3;
    const { data, error } = await bob.rpc("fn_top_events", {
      p_project_id: AURORA_WEB_PROJECT,
      p_from: FROM,
      p_to: TO,
      p_limit: LIMIT,
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as TopRow[];
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThanOrEqual(LIMIT);
    // Monotonically non-increasing counts.
    for (let i = 1; i < rows.length; i++) {
      expect(Number(rows[i]!.count)).toBeLessThanOrEqual(
        Number(rows[i - 1]!.count),
      );
    }
  });
});

test.describe("cross-tenant isolation (ADR 0083, inherited via SECURITY INVOKER)", () => {
  test("a non-member gets zero rows from both RPCs — empty, not an error", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only

    const trends = await carol.rpc("fn_event_trends", {
      p_project_id: AURORA_WEB_PROJECT, // a tenant carol cannot access
      p_event_name: "page_view",
      p_from: FROM,
      p_to: TO,
      p_interval: "week",
    });
    // RLS hides Aurora's events from carol, so the aggregation reduces over nothing:
    // an empty result with NO error (no existence leak, no permission failure).
    expect(trends.error).toBeNull();
    expect(
      (trends.data ?? []).every((r: Bucket) => Number(r.count) === 0),
    ).toBe(true);

    const top = await carol.rpc("fn_top_events", {
      p_project_id: AURORA_WEB_PROJECT,
      p_from: FROM,
      p_to: TO,
    });
    expect(top.error).toBeNull();
    expect(top.data ?? []).toEqual([]);

    // Sanity: carol DOES see her own tenant's aggregates.
    const own = await carol.rpc("fn_top_events", {
      p_project_id: GLOBEX_PROJECT,
      p_from: FROM,
      p_to: TO,
    });
    expect(own.error).toBeNull();
    expect((own.data ?? []).length).toBeGreaterThan(0);
  });
});

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * In-database funnel aggregation tests (ADR 0087 Confirmation, PR-5).
 *
 * `fn_funnel` is `SECURITY INVOKER`, so it reduces `events` under the CALLING member's
 * RLS. These specs prove the ADR 0087 semantics — (1) step counts are non-increasing
 * by construction; (2) the entry step counts the DISTINCT users with step 1 in the
 * window, not the event volume; (3) shrinking the conversion window never increases a
 * step; (4) the entry event is step 1 and order matters; (5) the guards reject a
 * <2-step funnel and a non-positive window — and that the ADR 0083 isolation is
 * inherited: a non-member's call returns zero-count rows with no error.
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
// A narrower window for the distinct-count cross-check, small enough that the raw
// page_view rows fit well under PostgREST's default page size (no truncation).
const NARROW_FROM = "2026-05-20T00:00:00.000Z";
const NARROW_TO = "2026-06-24T00:00:00.000Z";

// The canonical acquisition → activation → revenue funnel the seed is built around.
const STEPS = ["page_view", "sign_up", "feature_used", "purchase"];

type FunnelRow = { step_index: number; step_event: string; users: number };

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

test.describe("fn_funnel (ADR 0087)", () => {
  test("step counts are non-increasing and labelled by step in order", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora
    const { data, error } = await bob.rpc("fn_funnel", {
      p_project_id: AURORA_WEB_PROJECT,
      p_steps: STEPS,
      p_from: FROM,
      p_to: TO,
      p_window: "90 days",
    });
    expect(error).toBeNull();
    const rows = (data ?? []) as FunnelRow[];

    // One row per step, in order, named by the requested step events.
    expect(rows.map((r) => r.step_event)).toEqual(STEPS);
    expect(rows.map((r) => Number(r.step_index))).toEqual([1, 2, 3, 4]);
    // Real signal at the entry.
    expect(Number(rows[0]!.users)).toBeGreaterThan(0);
    // Monotonic non-increase — each step's users are a subset of the previous step's.
    rows.reduce((prev, r) => {
      expect(Number(r.users)).toBeLessThanOrEqual(prev);
      return Number(r.users);
    }, Number.POSITIVE_INFINITY);
  });

  test("the entry step counts DISTINCT users with step 1 in the window, not events", async () => {
    const bob = await signIn("bob@capcom.dev");

    const { data: funnel } = await bob.rpc("fn_funnel", {
      p_project_id: AURORA_WEB_PROJECT,
      p_steps: STEPS,
      p_from: NARROW_FROM,
      p_to: NARROW_TO,
      p_window: "90 days",
    });
    const step1 = Number((funnel as FunnelRow[])[0]!.users);

    // Independently: the distinct page_view users with an event in the same window.
    const { data: pv } = await bob
      .from("events")
      .select("distinct_id")
      .eq("project_id", AURORA_WEB_PROJECT)
      .eq("event_name", "page_view")
      .gte("ts", NARROW_FROM)
      .lt("ts", NARROW_TO)
      .limit(10000);
    const rows = pv ?? [];
    // Sanity: we pulled every matching row (not a truncated page), so the dedupe below
    // sees the full set — otherwise the equality would be meaningless.
    expect(rows.length).toBeLessThan(10000);
    const distinctUsers = new Set(rows.map((r) => r.distinct_id)).size;

    expect(step1).toBe(distinctUsers);
    // And it is genuinely a DISTINCT count, strictly below the raw event volume.
    expect(distinctUsers).toBeLessThan(rows.length);
  });

  test("shrinking the conversion window never increases a step (and the entry is window-independent)", async () => {
    const bob = await signIn("bob@capcom.dev");
    const call = (window: string) =>
      bob.rpc("fn_funnel", {
        p_project_id: AURORA_WEB_PROJECT,
        p_steps: STEPS,
        p_from: FROM,
        p_to: TO,
        p_window: window,
      });

    const wide = ((await call("90 days")).data ?? []) as FunnelRow[];
    const tight = ((await call("1 hour")).data ?? []) as FunnelRow[];

    // The entry (step 1) is bounded by the entry window only, not the conversion
    // window, so it is identical under both.
    expect(Number(tight[0]!.users)).toBe(Number(wide[0]!.users));
    // Every later step is no larger under the tighter window (ADR 0087 monotone-in-W).
    tight.forEach((r, i) => {
      expect(Number(r.users)).toBeLessThanOrEqual(Number(wide[i]!.users));
    });
    // A 1-hour window collapses the multi-day conversions: the final step shrinks.
    expect(Number(tight[3]!.users)).toBeLessThan(Number(wide[3]!.users));
  });

  test("order matters: the entry event is step 1, so a rarer entry yields a smaller funnel", async () => {
    const bob = await signIn("bob@capcom.dev");
    const entryUsers = async (steps: string[]) => {
      const { data } = await bob.rpc("fn_funnel", {
        p_project_id: AURORA_WEB_PROJECT,
        p_steps: steps,
        p_from: FROM,
        p_to: TO,
        p_window: "90 days",
      });
      return Number((data as FunnelRow[])[0]!.users);
    };
    // purchase is far rarer than page_view; entering on it yields a much smaller step 1.
    const pageViewFirst = await entryUsers(["page_view", "purchase"]);
    const purchaseFirst = await entryUsers(["purchase", "page_view"]);
    expect(purchaseFirst).toBeGreaterThan(0);
    expect(purchaseFirst).toBeLessThan(pageViewFirst);
  });

  test("guards: a <2-step funnel and a non-positive window are rejected", async () => {
    const bob = await signIn("bob@capcom.dev");
    const oneStep = await bob.rpc("fn_funnel", {
      p_project_id: AURORA_WEB_PROJECT,
      p_steps: ["page_view"],
      p_from: FROM,
      p_to: TO,
      p_window: "7 days",
    });
    expect(oneStep.error).not.toBeNull();

    const zeroWindow = await bob.rpc("fn_funnel", {
      p_project_id: AURORA_WEB_PROJECT,
      p_steps: STEPS,
      p_from: FROM,
      p_to: TO,
      p_window: "0 seconds",
    });
    expect(zeroWindow.error).not.toBeNull();
  });
});

test.describe("cross-tenant isolation (ADR 0083, inherited via SECURITY INVOKER)", () => {
  test("a non-member gets zero-count rows — empty, not an error, never another tenant's funnel", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only

    const foreign = await carol.rpc("fn_funnel", {
      p_project_id: AURORA_WEB_PROJECT, // a tenant carol cannot access
      p_steps: STEPS,
      p_from: FROM,
      p_to: TO,
      p_window: "90 days",
    });
    // RLS hides Aurora's events from carol, so the funnel reduces over nothing: the
    // step skeleton is present but every count is 0, and there is NO error.
    expect(foreign.error).toBeNull();
    const foreignRows = (foreign.data ?? []) as FunnelRow[];
    expect(foreignRows.length).toBe(STEPS.length);
    expect(foreignRows.every((r) => Number(r.users) === 0)).toBe(true);

    // Sanity: carol DOES see her own tenant's funnel.
    const own = await carol.rpc("fn_funnel", {
      p_project_id: GLOBEX_PROJECT,
      p_steps: STEPS,
      p_from: FROM,
      p_to: TO,
      p_window: "90 days",
    });
    expect(own.error).toBeNull();
    expect(Number((own.data as FunnelRow[])[0]!.users)).toBeGreaterThan(0);
  });
});

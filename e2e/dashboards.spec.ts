import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Saved-analysis RBAC + composition tests (ADR 0090 Confirmation) — the first
 * member-WRITABLE domain tables (reports / dashboards / dashboard_reports). Like the
 * other RLS specs, this drives the local Supabase API directly as the seeded users
 * (supabase/seed.sql): the claim under test is a *database* invariant the Server Actions
 * rely on — read is any member, write is `has_role(project,'analyst')` so viewer is
 * read-only, `owner_id` is unspoofable, isolation is inherited, and cross-tenant
 * composition is structurally impossible (composite FKs). Proven here because the e2e CI
 * job is deferred during bootstrap (DEV-001); `supabase-rls-reviewer` reviewed the
 * migration. Requires the local stack up and freshly seeded: `npm run db:reset`.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

// Seeded fixtures — see supabase/seed.sql.
const AURORA_PROJECT = "0a000000-0000-0000-0000-0000000000a1";
const GLOBEX_PROJECT = "0b000000-0000-0000-0000-0000000000b1";
const ALICE_ID = "aaaa1111-1111-1111-1111-111111111111";
const SEED_REPORT_TRENDS = "d0000000-0000-0000-0000-000000000001";
const SEED_REPORT_FUNNEL = "d0000000-0000-0000-0000-000000000002";
const SEED_DASHBOARD = "da000000-0000-0000-0000-000000000001";
const PASSWORD = "password123";

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

test.describe("saved analyses — RBAC over isolation (ADR 0090)", () => {
  test("any member reads the project's seeded reports and dashboards", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora

    const { data: reports } = await bob
      .from("reports")
      .select("name")
      .eq("project_id", AURORA_PROJECT)
      .order("name");
    expect(reports?.map((r) => r.name)).toEqual([
      "Acquisition funnel",
      "Daily page views",
      "Paying purchasers by country",
    ]);

    const { data: dashboards } = await bob
      .from("dashboards")
      .select("name, items:dashboard_reports(position)")
      .eq("project_id", AURORA_PROJECT);
    expect(dashboards?.[0]?.name).toBe("Acquisition overview");
    expect(dashboards?.[0]?.items).toHaveLength(2);
  });

  test("a viewer cannot write — INSERT is denied, UPDATE/DELETE match no rows", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora

    const { error: insertError } = await bob.from("reports").insert({
      project_id: AURORA_PROJECT,
      name: "viewer attempt",
      kind: "trends",
      config: {},
    });
    expect(insertError?.code).toBe("42501"); // RLS insufficient_privilege

    // UPDATE/DELETE are filtered by the RLS USING clause → zero rows, no error, and the
    // seeded row is left intact (absent vs forbidden are indistinguishable, ADR 0083).
    const { data: updated } = await bob
      .from("reports")
      .update({ name: "hacked" })
      .eq("id", SEED_REPORT_TRENDS)
      .select("id");
    expect(updated).toEqual([]);

    const { data: deleted } = await bob
      .from("reports")
      .delete()
      .eq("id", SEED_REPORT_TRENDS)
      .select("id");
    expect(deleted).toEqual([]);

    const { data: still } = await bob
      .from("reports")
      .select("name")
      .eq("id", SEED_REPORT_TRENDS)
      .single();
    expect(still?.name).toBe("Daily page views");
  });

  test("an analyst can create, rename, and delete a report", async () => {
    const dave = await signIn("dave@capcom.dev"); // analyst @ Aurora

    const { data: created, error: createError } = await dave
      .from("reports")
      .insert({
        project_id: AURORA_PROJECT,
        name: "analyst report",
        kind: "funnel",
        config: { steps: ["page_view", "sign_up"], range: "30d", window: "7d" },
      })
      .select("id, owner_id")
      .single();
    expect(createError).toBeNull();
    expect(created?.id).toBeTruthy();
    // owner_id was stamped to the caller, not supplied.
    expect(created?.owner_id).not.toBeNull();

    const { data: renamed } = await dave
      .from("reports")
      .update({ name: "analyst report v2" })
      .eq("id", created!.id)
      .select("name");
    expect(renamed?.[0]?.name).toBe("analyst report v2");

    const { data: removed } = await dave
      .from("reports")
      .delete()
      .eq("id", created!.id)
      .select("id");
    expect(removed).toHaveLength(1);
  });

  test("owner_id cannot be spoofed to another user", async () => {
    const dave = await signIn("dave@capcom.dev"); // analyst @ Aurora

    const { error } = await dave.from("reports").insert({
      project_id: AURORA_PROJECT,
      owner_id: ALICE_ID, // not the caller — rejected by the insert WITH CHECK
      name: "spoofed owner",
      kind: "trends",
      config: {},
    });
    expect(error?.code).toBe("42501");
  });

  test("cross-tenant: a Globex owner sees no Aurora saved analyses and cannot write", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only

    const { data: auroraReports } = await carol
      .from("reports")
      .select("id")
      .eq("project_id", AURORA_PROJECT);
    expect(auroraReports).toEqual([]);

    const { error } = await carol.from("reports").insert({
      project_id: AURORA_PROJECT,
      name: "cross-tenant write",
      kind: "trends",
      config: {},
    });
    expect(error?.code).toBe("42501");
  });

  test("an analyst composes and reorders reports on a dashboard; cross-project is rejected", async () => {
    const dave = await signIn("dave@capcom.dev"); // analyst @ Aurora

    // A scratch dashboard so the test is self-contained and the seed is untouched.
    const { data: board, error: boardError } = await dave
      .from("dashboards")
      .insert({ project_id: AURORA_PROJECT, name: "scratch board" })
      .select("id")
      .single();
    expect(boardError).toBeNull();
    const dashboardId = board!.id;

    const addItem = (reportId: string, position: number) =>
      dave
        .from("dashboard_reports")
        .insert({
          project_id: AURORA_PROJECT,
          dashboard_id: dashboardId,
          report_id: reportId,
          position,
        })
        .select("id")
        .single();

    const { data: item0 } = await addItem(SEED_REPORT_TRENDS, 0);
    const { data: item1 } = await addItem(SEED_REPORT_FUNNEL, 1);
    expect(item0?.id && item1?.id).toBeTruthy();

    // Reorder: swap the two positions, then read back the order.
    await dave
      .from("dashboard_reports")
      .update({ position: 1 })
      .eq("id", item0!.id);
    await dave
      .from("dashboard_reports")
      .update({ position: 0 })
      .eq("id", item1!.id);

    const { data: ordered } = await dave
      .from("dashboard_reports")
      .select("report_id, position")
      .eq("dashboard_id", dashboardId)
      .order("position");
    expect(ordered?.map((i) => i.report_id)).toEqual([
      SEED_REPORT_FUNNEL,
      SEED_REPORT_TRENDS,
    ]);

    // Cross-project composition is impossible: a link row claiming the Globex project on
    // an Aurora dashboard is rejected (RLS has_role(Globex) fails / composite FK mismatch).
    const { error: crossError } = await dave.from("dashboard_reports").insert({
      project_id: GLOBEX_PROJECT,
      dashboard_id: dashboardId,
      report_id: SEED_REPORT_TRENDS,
      position: 2,
    });
    expect(crossError).not.toBeNull();

    // Remove one item, then clean up the scratch dashboard (cascade clears its links).
    const { data: afterRemove } = await dave
      .from("dashboard_reports")
      .delete()
      .eq("id", item0!.id)
      .select("id");
    expect(afterRemove).toHaveLength(1);

    const { data: deletedBoard } = await dave
      .from("dashboards")
      .delete()
      .eq("id", dashboardId)
      .select("id");
    expect(deletedBoard).toHaveLength(1);
  });

  test("the seeded dashboard composition is intact after the suite", async () => {
    const alice = await signIn("alice@capcom.dev"); // owner @ Aurora

    const { data } = await alice
      .from("dashboard_reports")
      .select("report_id, position")
      .eq("dashboard_id", SEED_DASHBOARD)
      .order("position");
    expect(data?.map((i) => i.report_id)).toEqual([
      SEED_REPORT_TRENDS,
      SEED_REPORT_FUNNEL,
    ]);
  });
});

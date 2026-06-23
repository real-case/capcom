import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * RLS isolation tests on the membership critical path (ADR 0083 Confirmation).
 *
 * This is the risk-weighted path that loses CI e2e coverage during bootstrap
 * (DEV-001), so it is proven here and reviewed by `supabase-rls-reviewer` before
 * the PR. It exercises the security model directly against the local Supabase API
 * as the seeded users (supabase/seed.sql) — no browser needed — because the claim
 * under test is a *database* invariant, not a UI behaviour: a viewer reads only
 * their tenant, cross-tenant reads return nothing, RBAC gates writes over
 * isolation, and the anonymous role sees nothing (deny-by-default).
 *
 * Requires the local stack up and freshly seeded: `npm run db:reset`.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

// Seeded fixtures — see supabase/seed.sql.
const AURORA = "0a000000-0000-0000-0000-000000000001";
const GLOBEX = "0b000000-0000-0000-0000-000000000002";
const AURORA_PROJECT = "0a000000-0000-0000-0000-0000000000a1";
const GLOBEX_PROJECT = "0b000000-0000-0000-0000-0000000000b1";
const BOB_ID = "bbbb2222-2222-2222-2222-222222222222";
const ALICE_ID = "aaaa1111-1111-1111-1111-111111111111";
const CAROL_ID = "cccc3333-3333-3333-3333-333333333333";
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

test.describe("tenant isolation (ADR 0083)", () => {
  test("a viewer reads only their own tenant", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora

    const { data: orgs } = await bob.from("organizations").select("name");
    expect(orgs?.map((o) => o.name)).toEqual(["Aurora Labs"]);

    const { data: projects } = await bob
      .from("projects")
      .select("name")
      .order("name");
    expect(projects?.map((p) => p.name)).toEqual([
      "Aurora Mobile",
      "Aurora Web",
    ]);
  });

  test("cross-tenant reads return nothing, not an error (deny-by-default)", async () => {
    const bob = await signIn("bob@capcom.dev");

    const { data: org, error: orgError } = await bob
      .from("organizations")
      .select("*")
      .eq("id", GLOBEX)
      .maybeSingle();
    // A denied SELECT is an empty result, not an error — no existence leak.
    expect(orgError).toBeNull();
    expect(org).toBeNull();

    const { data: project, error: projectError } = await bob
      .from("projects")
      .select("*")
      .eq("id", GLOBEX_PROJECT)
      .maybeSingle();
    expect(projectError).toBeNull();
    expect(project).toBeNull();
  });

  test("an owner of one tenant never sees another", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only
    const { data: orgs } = await carol.from("organizations").select("name");
    expect(orgs?.map((o) => o.name)).toEqual(["Globex Analytics"]);
  });

  test("a multi-tenant member sees every tenant they belong to", async () => {
    const alice = await signIn("alice@capcom.dev"); // owner @ Aurora + admin @ Globex
    const { data: orgs } = await alice
      .from("organizations")
      .select("name")
      .order("name");
    expect(orgs?.map((o) => o.name)).toEqual([
      "Aurora Labs",
      "Globex Analytics",
    ]);
  });

  test("anonymous callers see nothing", async () => {
    const anon = anonClient();
    const { data: orgs } = await anon.from("organizations").select("*");
    const { data: projects } = await anon.from("projects").select("*");
    // Anonymous holds no table GRANT, so reads come back with no rows — the
    // hardest deny, refused before RLS is even consulted.
    expect(orgs ?? []).toEqual([]);
    expect(projects ?? []).toEqual([]);
  });
});

test.describe("RBAC composes over isolation (ADR 0083)", () => {
  test("a viewer cannot create a project", async () => {
    const bob = await signIn("bob@capcom.dev");
    const { error } = await bob.from("projects").insert({
      organization_id: AURORA,
      name: "Viewer should not create this",
    });
    expect(error).not.toBeNull();
  });

  test("a viewer cannot add a member", async () => {
    const bob = await signIn("bob@capcom.dev");
    // Carol is not in Aurora, so there is no (user_id, organization_id) row to
    // collide with — the insert can only fail on the RLS WITH CHECK (42501),
    // proving the authorization gate rather than a unique-constraint accident.
    const { error } = await bob.from("memberships").insert({
      user_id: CAROL_ID,
      organization_id: AURORA,
      role: "viewer",
    });
    expect(error?.code).toBe("42501");
  });

  test("a viewer cannot raise their own role (silent no-op under RLS)", async () => {
    const bob = await signIn("bob@capcom.dev");
    // The UPDATE policy requires admin+, so this matches zero rows rather than
    // erroring — the proof is that the role is unchanged afterwards.
    await bob
      .from("memberships")
      .update({ role: "owner" })
      .eq("user_id", BOB_ID)
      .eq("organization_id", AURORA);

    const { data } = await bob
      .from("memberships")
      .select("role")
      .eq("user_id", BOB_ID)
      .single();
    expect(data?.role).toBe("viewer");
  });

  test("an admin can create a project in their tenant", async () => {
    const alice = await signIn("alice@capcom.dev"); // admin @ Globex — may create
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex — DELETE is owner-only
    const NAME = "RBAC test project";

    // Idempotent pre-clean, run as the owner (the project DELETE policy is
    // owner-only, so an admin's delete would silently no-op and leak residue).
    await carol
      .from("projects")
      .delete()
      .eq("organization_id", GLOBEX)
      .eq("name", NAME);

    const { data, error } = await alice
      .from("projects")
      .insert({ organization_id: GLOBEX, name: NAME })
      .select()
      .single();
    expect(error).toBeNull();
    expect(data?.organization_id).toBe(GLOBEX);

    // Keep the fixture set hermetic — the owner removes what the admin created.
    if (data?.id) {
      await carol.from("projects").delete().eq("id", data.id);
    }
  });

  test("a membership's identity is immutable — only the role may change", async () => {
    const alice = await signIn("alice@capcom.dev"); // admin @ Globex AND owner @ Aurora
    // RLS would permit the UPDATE (alice administers both orgs), but moving the
    // (user_id, organization_id) pair is blocked by the immutability trigger.
    const { error } = await alice
      .from("memberships")
      .update({ organization_id: AURORA })
      .eq("user_id", ALICE_ID)
      .eq("organization_id", GLOBEX);
    // Assert the trigger's own message, so an unrelated policy/constraint error
    // can't masquerade as immutability enforcement.
    expect(error?.message).toMatch(/immutable/i);
  });

  test("an admin cannot promote to owner — only an owner may grant owner", async () => {
    const alice = await signIn("alice@capcom.dev"); // admin @ Globex (not owner there)
    // WITH CHECK rejects the new owner row → RLS violation (42501), no mutation.
    const { error } = await alice
      .from("memberships")
      .update({ role: "owner" })
      .eq("user_id", ALICE_ID)
      .eq("organization_id", GLOBEX);
    expect(error?.code).toBe("42501");

    const { data } = await alice
      .from("memberships")
      .select("role")
      .eq("user_id", ALICE_ID)
      .eq("organization_id", GLOBEX)
      .single();
    expect(data?.role).toBe("admin");
  });

  test("an admin cannot touch an owner's membership", async () => {
    const alice = await signIn("alice@capcom.dev"); // admin @ Globex
    // Carol is owner @ Globex; the USING clause hides her row from a mere admin,
    // so the UPDATE matches zero rows (returned set is empty) and her role holds.
    const { data: updated } = await alice
      .from("memberships")
      .update({ role: "viewer" })
      .eq("user_id", CAROL_ID)
      .eq("organization_id", GLOBEX)
      .select("role");
    expect(updated).toEqual([]);

    const { data } = await alice
      .from("memberships")
      .select("role")
      .eq("user_id", CAROL_ID)
      .eq("organization_id", GLOBEX)
      .single();
    expect(data?.role).toBe("owner");
  });
});

test.describe("project-scoped membership helpers (ADR 0083)", () => {
  test("is_member / has_role answer for the caller's own access", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora

    const ownProject = await bob.rpc("is_member", {
      p_project_id: AURORA_PROJECT,
    });
    expect(ownProject.data).toBe(true);
    const otherProject = await bob.rpc("is_member", {
      p_project_id: GLOBEX_PROJECT,
    });
    expect(otherProject.data).toBe(false);

    const asViewer = await bob.rpc("has_role", {
      p_project_id: AURORA_PROJECT,
      p_min_role: "viewer",
    });
    expect(asViewer.data).toBe(true);
    const asAdmin = await bob.rpc("has_role", {
      p_project_id: AURORA_PROJECT,
      p_min_role: "admin",
    });
    expect(asAdmin.data).toBe(false);
  });
});

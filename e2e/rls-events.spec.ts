import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * RLS isolation tests for the analytics domain (ADR 0083/0085 Confirmation).
 *
 * Events and profiles are the rows the product is *about*, so their isolation is
 * the same risk-weighted critical path as the tenancy spine — proven here against
 * the local Supabase API as the seeded users and reviewed by `supabase-rls-reviewer`
 * before the PR (the e2e job is removed from CI during bootstrap, DEV-001).
 *
 * Assertions are tenant-scoped *properties* (a member sees their tenant's rows and
 * exactly zero of another's), not exact counts, so they hold whether the database
 * carries only the seed.sql baseline or the dense `seed:events` volume on top.
 *
 * Requires the local stack up and seeded: `npm run db:reset`.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

// Seeded fixtures — see supabase/seed.sql.
const AURORA_WEB_PROJECT = "0a000000-0000-0000-0000-0000000000a1";
const AURORA_MOBILE_PROJECT = "0a000000-0000-0000-0000-0000000000a2";
const GLOBEX_PROJECT = "0b000000-0000-0000-0000-0000000000b1";
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

test.describe("event isolation (ADR 0083)", () => {
  test("a member reads events only in their tenant's projects", async () => {
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora Labs

    const { data: events, error } = await bob
      .from("events")
      .select("project_id");
    expect(error).toBeNull();
    // Bob sees Aurora events (there is seeded data) …
    expect(events?.length).toBeGreaterThan(0);
    // … and every row he sees belongs to an Aurora project — never Globex.
    const visibleProjects = new Set(events?.map((e) => e.project_id));
    expect(visibleProjects.has(GLOBEX_PROJECT)).toBe(false);
    for (const projectId of visibleProjects) {
      expect([AURORA_WEB_PROJECT, AURORA_MOBILE_PROJECT]).toContain(projectId);
    }
  });

  test("a cross-tenant event read returns nothing, not an error", async () => {
    const bob = await signIn("bob@capcom.dev");
    const { data, error } = await bob
      .from("events")
      .select("*")
      .eq("project_id", GLOBEX_PROJECT);
    // A denied SELECT is an empty result under the USING filter — no existence leak.
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  test("an owner of one tenant never sees another tenant's events", async () => {
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only
    const { data } = await carol
      .from("events")
      .select("project_id")
      .eq("project_id", AURORA_WEB_PROJECT);
    expect(data ?? []).toEqual([]);
  });

  test("a member cannot insert events (write path is ingest-only)", async () => {
    const bob = await signIn("bob@capcom.dev");
    // authenticated holds no INSERT grant and there is no INSERT policy, so the
    // write is refused outright (permission denied / RLS), never silently accepted.
    const { error } = await bob.from("events").insert({
      project_id: AURORA_WEB_PROJECT,
      event_name: "should_not_insert",
      distinct_id: "intruder",
    });
    expect(error).not.toBeNull();
  });

  test("anonymous callers see no events", async () => {
    const anon = anonClient();
    const { data } = await anon.from("events").select("*");
    // anon holds no table GRANT — the read comes back empty, refused before RLS.
    expect(data ?? []).toEqual([]);
  });
});

test.describe("profile isolation (ADR 0083)", () => {
  test("a member reads profiles only in their tenant's projects", async () => {
    const bob = await signIn("bob@capcom.dev");
    const { data: profiles, error } = await bob
      .from("profiles")
      .select("project_id");
    expect(error).toBeNull();
    expect(profiles?.length).toBeGreaterThan(0);
    const visibleProjects = new Set(profiles?.map((p) => p.project_id));
    expect(visibleProjects.has(GLOBEX_PROJECT)).toBe(false);
  });

  test("a cross-tenant profile read returns nothing", async () => {
    const bob = await signIn("bob@capcom.dev");
    const { data, error } = await bob
      .from("profiles")
      .select("*")
      .eq("project_id", GLOBEX_PROJECT);
    expect(error).toBeNull();
    expect(data ?? []).toEqual([]);
  });

  test("a member cannot insert profiles", async () => {
    const bob = await signIn("bob@capcom.dev");
    const { error } = await bob.from("profiles").insert({
      project_id: AURORA_WEB_PROJECT,
      distinct_id: "intruder",
    });
    expect(error).not.toBeNull();
  });

  test("anonymous callers see no profiles", async () => {
    const anon = anonClient();
    const { data } = await anon.from("profiles").select("*");
    expect(data ?? []).toEqual([]);
  });
});

test.describe("ingest-key isolation (ADR 0085)", () => {
  test("members cannot read the ingest-key table (no GRANT)", async () => {
    const alice = await signIn("alice@capcom.dev"); // owner/admin across both orgs
    const { data, error } = await alice.from("project_ingest_keys").select("*");
    // The credential table has no member GRANT and no policy — invisible to every
    // member, even one who administers the project. Supabase returns an error or
    // an empty set depending on layer; either way no key material is exposed.
    expect(data ?? []).toEqual([]);
    if (error) expect(error.code).toBeDefined();
  });

  test("anonymous callers cannot read the ingest-key table", async () => {
    const anon = anonClient();
    const { data } = await anon.from("project_ingest_keys").select("*");
    expect(data ?? []).toEqual([]);
  });
});

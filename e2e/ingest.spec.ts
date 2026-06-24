import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";

/**
 * Ingest-route contract tests (ADR 0085 Confirmation).
 *
 * Exercises `POST /api/ingest` end-to-end against the running app: a valid batch
 * is accepted and its rows land scoped to the project the key resolves to; a
 * missing key is 401; an unknown key is 403; an invalid payload is 422. Scoping
 * is verified through the *member* read path (sign in, read under RLS) so the
 * test needs no service-role credential of its own.
 *
 * The running server must hold SUPABASE_SECRET_KEY (the ingest route writes under
 * the service-role). `npm run start` reads it from .env.local locally; the e2e job
 * is deferred in CI during bootstrap (DEV-001). If the key is absent the route
 * returns 500 and the accepted-path test fails loudly — that is the intended
 * signal, not a flake.
 */

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321";
const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH";

// Demo ingest keys + project ids — see supabase/seed.sql.
const AURORA_WEB_KEY = "cap_ingest_aurora_web_dev";
const AURORA_WEB_PROJECT = "0a000000-0000-0000-0000-0000000000a1";
const PASSWORD = "password123";

async function signIn(email: string): Promise<SupabaseClient> {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  expect(error, `sign-in failed for ${email}: ${error?.message}`).toBeNull();
  return supabase;
}

test.describe("POST /api/ingest (ADR 0085)", () => {
  test("accepts a valid batch and writes rows scoped to the resolved project", async ({
    request,
  }) => {
    // A unique marker so the assertion is independent of any other seeded data.
    const probe = `e2e_probe_${Date.now()}`;
    const distinctId = `e2e-user-${Date.now()}`;

    const res = await request.post("/api/ingest", {
      headers: { Authorization: `Bearer ${AURORA_WEB_KEY}` },
      data: {
        events: [
          { event_name: probe, distinct_id: distinctId, properties: { a: 1 } },
          {
            event_name: probe,
            distinct_id: distinctId,
            ts: "2026-06-01T12:00:00.000Z",
          },
        ],
      },
    });
    expect(res.status()).toBe(202);
    expect(await res.json()).toEqual({ accepted: 2 });

    // The rows are visible to an Aurora member under RLS, scoped to Aurora Web.
    const bob = await signIn("bob@capcom.dev"); // viewer @ Aurora Labs
    const { data: rows } = await bob
      .from("events")
      .select("project_id, distinct_id")
      .eq("event_name", probe);
    expect(rows?.length).toBe(2);
    expect(rows?.every((r) => r.project_id === AURORA_WEB_PROJECT)).toBe(true);

    // The profile was materialized from the batch (ADR 0083).
    const { data: profile } = await bob
      .from("profiles")
      .select("distinct_id")
      .eq("project_id", AURORA_WEB_PROJECT)
      .eq("distinct_id", distinctId)
      .maybeSingle();
    expect(profile?.distinct_id).toBe(distinctId);

    // A member of a different tenant never sees the ingested rows.
    const carol = await signIn("carol@capcom.dev"); // owner @ Globex only
    const { data: leaked } = await carol
      .from("events")
      .select("id")
      .eq("event_name", probe);
    expect(leaked ?? []).toEqual([]);
  });

  test("rejects a missing key with 401", async ({ request }) => {
    const res = await request.post("/api/ingest", {
      data: { events: [{ event_name: "x", distinct_id: "u" }] },
    });
    expect(res.status()).toBe(401);
    expect((await res.json()).error.code).toBe("unauthorized");
  });

  test("rejects an unknown key with 403", async ({ request }) => {
    const res = await request.post("/api/ingest", {
      headers: { Authorization: "Bearer not-a-real-key" },
      data: { events: [{ event_name: "x", distinct_id: "u" }] },
    });
    expect(res.status()).toBe(403);
    expect((await res.json()).error.code).toBe("forbidden");
  });

  test("rejects an invalid payload with 422 and structured issues", async ({
    request,
  }) => {
    const res = await request.post("/api/ingest", {
      headers: { Authorization: `Bearer ${AURORA_WEB_KEY}` },
      data: { events: [] }, // empty batch — below the min(1) bound.
    });
    expect(res.status()).toBe(422);
    const body = await res.json();
    expect(body.error.code).toBe("invalid_payload");
    expect(Array.isArray(body.error.issues)).toBe(true);
  });

  test("rejects a malformed event with 422", async ({ request }) => {
    const res = await request.post("/api/ingest", {
      headers: { Authorization: `Bearer ${AURORA_WEB_KEY}` },
      data: { events: [{ distinct_id: "u" }] }, // missing event_name.
    });
    expect(res.status()).toBe(422);
    expect((await res.json()).error.code).toBe("invalid_payload");
  });
});

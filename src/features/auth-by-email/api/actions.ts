"use server";

import { createClient } from "@/lib/supabase/server";

import { demoAccountKeySchema, type DemoAccountKey } from "../model/demo";
import {
  signInSchema,
  signUpSchema,
  type SignInValues,
  type SignUpValues,
} from "../model/schemas";

/**
 * Server Actions for email/password auth (ADR 0016, 0020). Each one re-validates
 * its input against the canonical schema before touching Supabase, then runs as
 * the request — the auth client reads/writes the session cookie via the
 * request-scoped server client (ADR 0013). They return a discriminated result and
 * never throw a redirect across the action boundary; navigation is the client's
 * job (so RHF can surface a failure inline). Failure reasons are coarse codes, not
 * raw provider text — the UI maps them to generic translated copy (ADR 0019).
 */

export type AuthFailure =
  | "invalid_input"
  | "invalid_credentials"
  | "signup_failed";
export type AuthResult = { ok: true } | { ok: false; reason: AuthFailure };

export async function signIn(input: SignInValues): Promise<AuthResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, reason: "invalid_credentials" };

  return { ok: true };
}

// The seeded demo accounts (ADR 0101) share the seed password (`supabase/seed.sql`) — already
// public on the landing, but held in this "use server" module so it never enters the client
// bundle: the client sends only a demo-account KEY, never a credential. Not exported.
const DEMO_PASSWORD = "password123";
const DEMO_EMAIL: Record<DemoAccountKey, string> = {
  alice: "alice@capcom.dev",
  dave: "dave@capcom.dev",
  bob: "bob@capcom.dev",
};

/**
 * One-click demo sign-in (ADR 0101). Accepts only a key from the closed demo-account enum —
 * the injection boundary — resolves it to the seeded email + shared password held above, then
 * runs the same password sign-in as `signIn`. An off-list key is rejected (never coerced) and
 * there is no client-supplied credential path. Extends the 0016 email/password baseline with a
 * demo-only convenience; inert for a real deployment (only the seeded identities are reachable).
 */
export async function signInAsDemo(key: DemoAccountKey): Promise<AuthResult> {
  const parsed = demoAccountKeySchema.safeParse(key);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: DEMO_EMAIL[parsed.data],
    password: DEMO_PASSWORD,
  });
  if (error) return { ok: false, reason: "invalid_credentials" };

  return { ok: true };
}

export async function signUp(input: SignUpValues): Promise<AuthResult> {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false, reason: "invalid_input" };

  const supabase = await createClient();
  // Email confirmation is disabled in the local stack (config.toml), so a
  // successful sign-up establishes a session immediately. A brand-new user has no
  // memberships yet — the workspace home renders its empty state for them.
  const { error } = await supabase.auth.signUp(parsed.data);
  if (error) return { ok: false, reason: "signup_failed" };

  return { ok: true };
}

export async function signOut(): Promise<{ ok: boolean }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();
  // Surface the outcome instead of dropping it — the caller decides whether to
  // navigate away (a failed sign-out leaves the session intact).
  return { ok: !error };
}

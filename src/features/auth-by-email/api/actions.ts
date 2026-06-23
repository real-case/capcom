"use server";

import { createClient } from "@/lib/supabase/server";

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

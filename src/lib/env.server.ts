// Build-time fence (ADR 0018): importing this module from any client-bundled
// code fails `next build` — secrets cannot leak into the browser bundle.
import "server-only";

import { z } from "zod";

import { parseEnv } from "./env";

/**
 * Server-only environment — secrets and server-side configuration (ADR 0018).
 *
 * Every entry is Zod-validated like the public module and unreachable from
 * client code; the input object below must list each key explicitly.
 */
export const serverEnvSchema = z.object({
  /**
   * Supabase secret key (the service-role key in the new key format) —
   * **bypasses RLS**, so it is confined to trusted server-only modules and
   * never reaches the browser (ADR 0013, 0018). Optional: no admin
   * (RLS-bypassing) operation exists yet, and a required secret would fail
   * every `next build` until the value is provisioned in Vercel (Phase 7 human
   * task). `createAdminClient` validates presence at use.
   */
  SUPABASE_SECRET_KEY: z
    .string()
    .min(1, "[env] SUPABASE_SECRET_KEY must be a non-empty key")
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const serverEnv = parseEnv(serverEnvSchema, {
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
});

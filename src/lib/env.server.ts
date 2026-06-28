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

  /**
   * Provider-agnostic advisory-AI transport (ADR 0075/0091) for the runtime
   * AI natural-language query path (`src/lib/ai`). All three are **optional**:
   * the surface is INERT until `AI_API_KEY` is provisioned (ADR 0046) — without
   * it the feature falls back to its deterministic offline interpreter and never
   * crashes (ADR 0091), and a required value would fail every `next build` until
   * a key exists. No provider is hardwired (ADR 0075): point `AI_BASE_URL` at any
   * OpenAI-compatible `/chat/completions` endpoint and name the model in
   * `AI_MODEL`. Secrets here are behind the `server-only` fence and never reach
   * the browser (ADR 0018).
   */
  AI_API_KEY: z
    .string()
    .min(1, "[env] AI_API_KEY must be a non-empty key")
    .optional(),
  AI_BASE_URL: z
    .url({
      protocol: /^https?$/,
      error: "[env] AI_BASE_URL must be an absolute http(s) URL",
    })
    .optional(),
  AI_MODEL: z
    .string()
    .min(1, "[env] AI_MODEL must be a non-empty model id")
    .optional(),
  /** Output-token budget for one translation turn — a tuning knob, not a secret. */
  AI_MAX_TOKENS: z.coerce
    .number()
    .int()
    .positive("[env] AI_MAX_TOKENS must be a positive integer")
    .optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export const serverEnv = parseEnv(serverEnvSchema, {
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY,
  AI_API_KEY: process.env.AI_API_KEY,
  AI_BASE_URL: process.env.AI_BASE_URL,
  AI_MODEL: process.env.AI_MODEL,
  AI_MAX_TOKENS: process.env.AI_MAX_TOKENS,
});

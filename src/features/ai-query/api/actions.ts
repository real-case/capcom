"use server";

import { chatComplete, isAiConfigured } from "@/lib/ai";
import { getCurrentUser } from "@/lib/supabase/server";

import { translateInputSchema, type TranslateInput } from "../model/spec";
import {
  translate,
  type TranslateEngine,
  type TranslateResult,
} from "../model/translate";

/**
 * The AI natural-language query translation Server Action (ADR 0091) — the
 * server-only boundary where the AI key is used. It runs the provider-agnostic
 * `src/lib/ai` client (ADR 0075) behind the `server-only` fence (ADR 0018), so the
 * key, the provider, and the prompt never reach client code. It does NO database
 * work and constructs no SQL/RPC/URL from model text: it returns a closed,
 * Zod-validated spec (via `translate`) or a discriminated failure, and never
 * throws across the action boundary. Auth gates the (potentially paid) model call —
 * the action itself touches no tenant data, so it needs no RLS, but only a
 * signed-in user may spend the key (ADR 0046). Coverage-excluded (Node runtime);
 * the pure `translate` orchestration it wraps is unit-tested directly.
 */
export type TranslateActionResult =
  | TranslateResult
  | { ok: false; engine: TranslateEngine; reason: "unauthorized" | "invalid" };

export async function translateQuery(
  input: TranslateInput,
): Promise<TranslateActionResult> {
  const engine: TranslateEngine = isAiConfigured() ? "model" : "offline";

  const parsed = translateInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, engine, reason: "invalid" };

  const user = await getCurrentUser();
  if (!user) return { ok: false, engine, reason: "unauthorized" };

  return translate(parsed.data.prompt, {
    configured: isAiConfigured(),
    chatComplete,
  });
}

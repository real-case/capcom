// Build-time fence (ADR 0018): this module reaches the server-only env (the AI
// secret) and must never be imported from client-bundled code — `next build`
// fails if it is. The AI natural-language query path (ADR 0091) calls it only
// from a `"use server"` action.
import "server-only";

import { serverEnv } from "@/lib/env.server";

/**
 * Runtime, provider-agnostic advisory-AI client (ADR 0075/0091) — the app-side
 * sibling of `scripts/ai/lib.mjs`. It speaks the OpenAI-compatible Chat
 * Completions shape over Node 24's global `fetch` (ADR 0004), so the three
 * `AI_*` env vars point it at any compatible provider; no vendor is hardwired.
 * It is INERT until `AI_API_KEY` (+ base URL + model) are provisioned: without
 * them the feature falls back to its deterministic offline interpreter and never
 * crashes (ADR 0091). The key never leaves this server-only boundary (ADR 0018).
 */

/** One Chat Completions message. The common OpenAI-compatible subset (ADR 0075). */
export type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Output-token budget — a query-spec JSON is tiny; a reasoning model can be given
// headroom via the AI_MAX_TOKENS env var (typed in env.server, ADR 0018).
const MAX_TOKENS = serverEnv.AI_MAX_TOKENS ?? 1024;

/**
 * True only when the full provider contract is present (key + base URL + model).
 * This is the operative "live path available" gate: the page surfaces it as the
 * banner state and the action uses it to choose the model path vs the offline
 * interpreter (ADR 0091). `AI_API_KEY` is the headline human-provisioned secret
 * (ADR 0046); a partial config (key but no base URL/model) reads as not-configured
 * and degrades to offline rather than failing.
 */
export function isAiConfigured(): boolean {
  return Boolean(
    serverEnv.AI_API_KEY?.trim() && serverEnv.AI_BASE_URL && serverEnv.AI_MODEL,
  );
}

/**
 * One non-streaming completion turn against the configured OpenAI-compatible
 * endpoint. Throws when not configured or on a non-2xx; returns the assistant
 * message content (`""` if the provider returns a 200 with no content — a
 * reasoning model exhausting `max_tokens`, a content filter, or a throttled free
 * gateway all surface this way). `temperature: 0` keeps the spec output as
 * deterministic as the provider allows. The caller (ADR 0091's `translate`)
 * treats any throw or empty string as "fall back to the offline interpreter".
 */
export async function chatComplete(messages: ChatMessage[]): Promise<string> {
  if (!isAiConfigured()) {
    throw new Error(
      "[ai] not configured — AI_API_KEY / AI_BASE_URL / AI_MODEL",
    );
  }
  const baseUrl = serverEnv.AI_BASE_URL!.replace(/\/+$/, "");
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${serverEnv.AI_API_KEY}`,
    },
    body: JSON.stringify({
      model: serverEnv.AI_MODEL,
      max_tokens: MAX_TOKENS,
      temperature: 0,
      messages,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[ai] request failed: ${res.status} ${res.statusText} — ${body.slice(0, 300)}`,
    );
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: unknown } }[];
  };
  const content = json.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim() : "";
}

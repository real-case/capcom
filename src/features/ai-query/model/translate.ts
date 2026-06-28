import { interpretPrompt } from "./interpreter";
import { buildMessages, parseModelSpec, type PromptMessage } from "./prompt";
import type { AiQuerySpec } from "./spec";

/**
 * The translation orchestration (ADR 0091): turn a prompt into a validated spec,
 * preferring the live model when configured and falling back to the deterministic
 * offline interpreter otherwise (or when the model errors / returns nothing
 * usable). Pure and transport-agnostic — the model client is **injected** as
 * `chatComplete`, so this never imports the server-only `src/lib/ai` and is
 * unit-tested directly with a stub (the "stubbed-AI happy path") and with no client
 * at all (the no-key happy path). The action wires the real client.
 */

export type TranslateEngine = "model" | "offline";

export type TranslateResult =
  | { ok: true; engine: TranslateEngine; spec: AiQuerySpec }
  | { ok: false; engine: TranslateEngine; reason: "unrecognized" };

/** The injected model transport (a structural subset of the `src/lib/ai` client). */
export type ChatComplete = (messages: PromptMessage[]) => Promise<string>;

export type TranslateDeps = {
  /** Whether the live model path is available (the full AI_* contract, ADR 0075). */
  configured: boolean;
  /** The model transport, injected for testability; absent → offline only. */
  chatComplete?: ChatComplete;
};

export async function translate(
  prompt: string,
  deps: TranslateDeps,
): Promise<TranslateResult> {
  const trimmed = prompt.trim();
  const primary: TranslateEngine = deps.configured ? "model" : "offline";
  if (!trimmed) return { ok: false, engine: primary, reason: "unrecognized" };

  // Live model first when configured; any failure (network error, empty or
  // out-of-grammar completion) falls through to the interpreter so the surface
  // never crashes (ADR 0091).
  if (deps.configured && deps.chatComplete) {
    try {
      const text = await deps.chatComplete(buildMessages(trimmed));
      const spec = parseModelSpec(text);
      if (spec) return { ok: true, engine: "model", spec };
    } catch {
      // fall through to the offline interpreter
    }
  }

  const spec = interpretPrompt(trimmed);
  if (spec) return { ok: true, engine: "offline", spec };
  return { ok: false, engine: primary, reason: "unrecognized" };
}

import { AI_EVENTS, aiQuerySpecSchema, type AiQuerySpec } from "./spec";

/**
 * The live-model side of the translation (ADR 0091): build the messages that ask
 * an OpenAI-compatible model to emit a closed `[ai-query]` spec as JSON, and
 * **safely parse** whatever it returns. Parsing is the injection boundary — the
 * model's text is `safeParse`d against `aiQuerySpecSchema` and **rejected, never
 * coerced** on any mismatch (ADR 0089 applied to model output); only the closed
 * `{ kind, config }` fields are read, so extra commentary keys are ignored, not
 * trusted. This module imports no server-only code, so it is unit-tested directly;
 * the network call lives behind the `src/lib/ai` client.
 */

/** A message in the OpenAI-compatible shape (a structural subset of the client's). */
export type PromptMessage = { role: "system" | "user"; content: string };

const SYSTEM_PROMPT = `You translate a product analyst's natural-language request into ONE analytics query spec for a multi-tenant product-analytics tool. You do NOT answer the question, write SQL, or add commentary — you ONLY emit a single JSON object.

Return EXACTLY one JSON object of the form { "kind": <kind>, "config": <config> } and nothing else (no prose, no code fence).

kind is one of: "trends", "funnel", "retention", "segment".

Event names (use ONLY these): ${AI_EVENTS.join(", ")}.

config by kind:
- trends:    { "event": <event>, "range": "7d"|"30d"|"90d", "interval": "hour"|"day"|"week"|"month", "breakdown": "none"|"device"|"plan"|"country"|"path"|"referrer" }
- funnel:    { "steps": [<event>, …2–6 ordered], "range": "7d"|"30d"|"90d", "window": "1d"|"7d"|"14d"|"30d" }
- retention: { "range": "30d"|"90d"|"180d", "period": "week"|"month" }
- segment:   { "rule": { "match": "all", "attributes": [{ "key": "plan"|"country"|"device"|"referrer", "op": "eq"|"neq"|"in", "value": <string or string[] for in> }], "behaviors": [{ "event": <event>, "op": "at_least"|"at_most", "count": <integer ≥ 0> }] }, "dimension": "plan"|"country"|"device"|"referrer", "range": "30d"|"90d"|"180d" }

Pick the kind that best fits the request; choose sensible values for anything unspecified. "registrations" → sign_up; "by channel" → breakdown/dimension "referrer". Output ONLY the JSON object.`;

/** Build the system + user messages for one translation turn. */
export function buildMessages(prompt: string): PromptMessage[] {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: prompt },
  ];
}

function tryParse(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return undefined;
  }
}

/** Best-effort extraction of a JSON object from a model completion. */
function extractJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = (fenced?.[1] ?? text).trim();
  const direct = tryParse(body);
  if (direct !== undefined) return direct;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) return tryParse(body.slice(start, end + 1));
  return undefined;
}

/**
 * Parse a model completion into a validated spec, or `null` if it does not match
 * the closed grammar (the caller then falls back to the offline interpreter). Only
 * `kind` + `config` are read; any other field the model emitted is dropped before
 * validation, and `safeParse` rejects an out-of-vocabulary value — never coerces.
 */
export function parseModelSpec(text: string): AiQuerySpec | null {
  const obj = extractJsonObject(text);
  if (obj === null || typeof obj !== "object") return null;
  const record = obj as Record<string, unknown>;
  const candidate = { kind: record.kind, config: record.config };
  const result = aiQuerySpecSchema.safeParse(candidate);
  return result.success ? result.data : null;
}

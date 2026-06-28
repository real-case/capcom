/**
 * Public API of the `ai-query` feature (ADR 0065/0066/0091). Consumers import
 * `@/features/ai-query`, never a deep path. The page mounts the container; the
 * closed `[ai-query]` spec schema + type are exported for consumers and tests.
 * The translation Server Action and the server-only `src/lib/ai` client stay
 * internal (the secret never crosses this boundary into client code, ADR 0018).
 */
export { AiQueryManager } from "./ui/AiQueryManager";
export { aiQuerySpecSchema, type AiQuerySpec } from "./model/spec";

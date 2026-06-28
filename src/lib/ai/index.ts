/**
 * Public surface of the runtime AI client (ADR 0075/0091). Server-only — the
 * `"use server"` translation action imports it; client code never does (ADR 0018).
 */
export { chatComplete, isAiConfigured, type ChatMessage } from "./client";

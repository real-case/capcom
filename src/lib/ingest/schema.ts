import { z } from "zod";

import type { Json } from "@/lib/supabase/database.types";

/**
 * The ingest boundary schema `[ingest]` (ADR 0085 / 0017).
 *
 * This is the sole parser for the untrusted event batch a product POSTs to
 * `/api/ingest`. Types are inferred from it (ADR 0017) — there is no hand-written
 * request type — and every message carries the `[ingest]` origin marker so a
 * validation failure names its boundary in logs and responses.
 *
 * The batch is bounded (ADR 0085): a demonstration intake, not a high-volume
 * pipeline, so an oversized batch is rejected rather than streamed.
 */

/** Upper bound on events per request — the recorded scope boundary (ADR 0085). */
export const MAX_INGEST_BATCH = 500;

/**
 * Any JSON value, typed to the generated Supabase `Json` so a validated
 * `properties` / `traits` bag is directly insertable into the `jsonb` columns
 * (ADR 0084 reads them as-is). Recursive, hence `z.lazy`.
 */
const jsonValueSchema: z.ZodType<Json> = z.lazy(() =>
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    z.null(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

/** A JSON object — the shape of an event property / profile trait bag. */
const jsonObjectSchema = z.record(z.string(), jsonValueSchema);

/** A single event in the batch. `project_id` is NOT accepted from the caller —
 * the route stamps the resolved tenant, so a payload cannot target another one. */
export const ingestEventSchema = z.object({
  event_name: z
    .string()
    .min(1, "[ingest] event_name is required")
    .max(200, "[ingest] event_name must be at most 200 characters"),
  distinct_id: z
    .string()
    .min(1, "[ingest] distinct_id is required")
    .max(200, "[ingest] distinct_id must be at most 200 characters"),
  // An open property bag; defaults to empty so a bare event is still valid.
  properties: jsonObjectSchema.default({}),
  // Emitter-supplied event time. Optional — an absent ts defaults server-side to
  // the database `now()` (ADR 0085). Must be a full ISO 8601 instant (Z or offset).
  ts: z.iso
    .datetime({
      offset: true,
      error: "[ingest] ts must be an ISO 8601 datetime",
    })
    .optional(),
});

/** A bounded batch of events — the request body shape. */
export const ingestBatchSchema = z.object({
  events: z
    .array(ingestEventSchema)
    .min(1, "[ingest] at least one event is required")
    .max(
      MAX_INGEST_BATCH,
      `[ingest] a batch may contain at most ${MAX_INGEST_BATCH} events`,
    ),
});

/** A validated single event (ADR 0017 — inferred, never hand-written). */
export type IngestEvent = z.infer<typeof ingestEventSchema>;

/** A validated event batch. */
export type IngestBatch = z.infer<typeof ingestBatchSchema>;

/** One flattened validation issue for the structured `422` response (ADR 0019). */
export interface IngestIssue {
  path: string;
  message: string;
}

/**
 * Flatten a Zod error into `{ path, message }[]` for the `422` body. The caller's
 * own payload is being described, so the field detail is safe to return — it is
 * developer feedback on a contract, not a leak of server internals (ADR 0019).
 */
export function formatIngestIssues(error: z.ZodError): IngestIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

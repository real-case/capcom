import "server-only";

import { NextResponse } from "next/server";

import { extractBearerToken, hashIngestKey } from "@/lib/ingest/key";
import { formatIngestIssues, ingestBatchSchema } from "@/lib/ingest/schema";
import { logError, logWarn } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * `POST /api/ingest` — the single demonstration intake (ADR 0085).
 *
 * A product emits a batch of events authenticated by a per-project ingest key.
 * The key is hashed and resolved server-side to exactly one `project_id`; every
 * event is then written stamped with that resolved tenant, so a payload can never
 * target another one. This is a non-member write path, so it runs under the
 * service-role (RLS-bypassing) credential — confined to this route, server-only,
 * never reaching client code (ADR 0013). The key is compared by hash and never
 * logged (ADR 0085).
 *
 * Node runtime, webhook-style route handler — not a Server Action, not Edge
 * (ADR 0002 / 0004). Structured error contract: 401 missing/malformed key,
 * 403 unknown/revoked key, 422 invalid payload (ADR 0019).
 *
 * This is the contract demonstration, not a pipeline: no SDK, queue, batching,
 * or at-scale idempotency. Data volume comes from the seed generator (ADR 0085).
 */
export const runtime = "nodejs";

interface IngestErrorBody {
  error: { code: string; message: string; issues?: unknown };
}

function errorResponse(
  status: number,
  code: string,
  message: string,
  issues?: unknown,
): NextResponse<IngestErrorBody> {
  return NextResponse.json(
    {
      error:
        issues === undefined ? { code, message } : { code, message, issues },
    },
    { status },
  );
}

export async function POST(request: Request) {
  // 1. Credential present and well-formed? (ADR 0085: 401 = missing/malformed.)
  const token = extractBearerToken(request.headers.get("authorization"));
  if (!token) {
    logWarn("ingest: missing or malformed ingest key");
    return errorResponse(
      401,
      "unauthorized",
      "Missing or malformed ingest key.",
    );
  }

  // 2. Resolve the key to exactly one project. The service-role client bypasses
  //    RLS to read the credential table (members cannot); the key is matched by
  //    hash and never logged (ADR 0085 / 0013).
  const admin = createAdminClient();
  const keyHash = hashIngestKey(token);
  const { data: keyRow, error: keyError } = await admin
    .from("project_ingest_keys")
    .select("project_id")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (keyError) {
    logError("ingest: ingest-key resolution failed", keyError);
    return errorResponse(
      500,
      "internal_error",
      "Could not process the request.",
    );
  }
  if (!keyRow) {
    logWarn("ingest: unknown or revoked ingest key");
    return errorResponse(403, "forbidden", "Unknown or revoked ingest key.");
  }
  const projectId = keyRow.project_id;

  // 3. Validate the untrusted batch at the boundary (ADR 0017). A bad body or a
  //    schema violation is a 422 with structured, caller-facing field detail.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logWarn("ingest: request body is not valid JSON", {
      project_id: projectId,
    });
    return errorResponse(
      422,
      "invalid_payload",
      "Request body is not valid JSON.",
    );
  }

  const parsed = ingestBatchSchema.safeParse(body);
  if (!parsed.success) {
    logWarn("ingest: event batch failed validation", { project_id: projectId });
    return errorResponse(
      422,
      "invalid_payload",
      "Event batch failed validation.",
      formatIngestIssues(parsed.error),
    );
  }
  const events = parsed.data.events;

  // The server-side receipt time: the default for an absent ts (ADR 0085) and the
  // last_seen_at stamp for the profile refresh. Defaulted here rather than by the
  // column DEFAULT because a multi-row insert sends a missing key as NULL, not
  // DEFAULT — so ts must be explicit on every row to satisfy its NOT NULL.
  const receivedAt = new Date().toISOString();

  // 4. Confined write: every row is stamped with the RESOLVED project_id, so the
  //    caller's payload cannot reach another tenant (ADR 0085).
  const eventRows = events.map((event) => ({
    project_id: projectId,
    event_name: event.event_name,
    distinct_id: event.distinct_id,
    properties: event.properties,
    ts: event.ts ?? receivedAt,
  }));

  const { error: insertError } = await admin.from("events").insert(eventRows);
  if (insertError) {
    logError("ingest: event insert failed", insertError, {
      project_id: projectId,
    });
    return errorResponse(500, "internal_error", "Could not store the events.");
  }

  // 5. Materialize/refresh tracked-user profiles from the batch (ADR 0083): one
  //    upsert per distinct_id, bumping last_seen_at. first_seen_at/traits are not
  //    in the payload, so an existing profile keeps them and a new one defaults.
  const profileRows = [
    ...new Set(events.map((event) => event.distinct_id)),
  ].map((distinctId) => ({
    project_id: projectId,
    distinct_id: distinctId,
    last_seen_at: receivedAt,
  }));

  const { error: profileError } = await admin
    .from("profiles")
    .upsert(profileRows, { onConflict: "project_id,distinct_id" });
  if (profileError) {
    // The events already landed; the profile refresh is best-effort. Log it but
    // still report success for the events that were accepted.
    logError("ingest: profile upsert failed", profileError, {
      project_id: projectId,
    });
  }

  return NextResponse.json({ accepted: events.length }, { status: 202 });
}

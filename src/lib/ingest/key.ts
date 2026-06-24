import { createHash } from "node:crypto";

/**
 * Ingest-key helpers (ADR 0085). The per-project ingest key is a bearer secret:
 * it is stored only as a hash (`project_ingest_keys.key_hash`) and compared by
 * hash, never logged in plaintext (ADR 0013). These are pure functions — the
 * `node:crypto` import keeps them server-only (a client bundle cannot import it),
 * and the route resolves the hash against the database under the service-role.
 */

const BEARER_PREFIX = "Bearer ";

/**
 * Pull the token out of an `Authorization: Bearer <token>` header. Returns
 * `null` for a missing, non-Bearer, or empty header — the route maps that to a
 * `401` (missing/malformed credential, ADR 0085).
 */
export function extractBearerToken(header: string | null): string | null {
  if (!header || !header.startsWith(BEARER_PREFIX)) return null;
  const token = header.slice(BEARER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
}

/**
 * The at-rest form of an ingest key: lowercase hex sha-256 of the token. This is
 * exactly what the seed stores via pgcrypto `encode(digest(token,'sha256'),'hex')`,
 * so a key provisioned in SQL resolves against a hash computed here.
 */
export function hashIngestKey(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

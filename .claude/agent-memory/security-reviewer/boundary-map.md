---
name: boundary-map
description: Where the server-only fence actually lives, and which entity barrels are safe to import from client components. Re-verify paths before relying on them.
metadata:
  type: project
---

# Client/server boundary map (re-verify before relying — the tree evolves)

**`server-only` is imported by (as of feat/ai-query, 2026-06):**
`src/lib/env.server.ts`, `src/lib/env.ts`, `src/lib/supabase/admin.ts` (service-role),
`src/lib/ingest/key.ts`, `src/lib/ai/client.ts`, `src/app/api/ingest/route.ts`,
plus the ai-query server modules (`features/ai-query/{index,api/actions,model/prompt,model/translate}`).
Grep `grep -rln "server-only" src` to refresh — but note prose mentions of "server-only" in
comments also match; confirm it's a real `import "server-only"` line.

**Entity barrels are SAFE to import from client components.**
`@/entities/report` and `@/entities/segment` re-export their `api/queries.ts` fetchers, BUT
those fetchers **take a `SupabaseClient` as a parameter** and import only `import type {...}`
(SupabaseClient, Database, row types) — no server client is constructed or imported in the
entity layer. So pulling an entity barrel into a `"use client"` file drags no `server-only`
and no secret into the bundle. The Supabase server client lives only in `src/lib/supabase/server.ts`
(imports `next/headers` cookies; request-scoped via `react.cache`) and is passed in by callers.

**Deep-link safety pattern (ADR 0090/0091).** `reportConfigToSearchParams` builds a
`URLSearchParams` (percent-encodes every value) and `reportKindRoute` is a fixed map over the
validated `report_kind` enum. A deep link is always a root-anchored relative path
`/p/{projectId}/{route}?{qs}` — structurally cannot become `javascript:` or an external URL.
This is the open-redirect answer for any feature that reuses these helpers.

**ai-query injection boundary (ADR 0091).** Model text crosses exactly one boundary:
`parseModelSpec` → `aiQuerySpecSchema.safeParse` (discriminated union of `strictObject` configs,
rejects unknown keys, never coerces). Only `kind`/`config` are read. No model text reaches SQL,
RPC names, routes, or hrefs — the validated spec drives a fixed route map. Good reference shape
for "untrusted LLM output → closed Zod spec → deep-link" features.

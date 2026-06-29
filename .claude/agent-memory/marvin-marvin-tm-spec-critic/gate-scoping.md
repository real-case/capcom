---
name: gate-scoping
description: CAPCOM gate scoping — which check:* gates apply to src/widgets vs src/components only, token-gate glob, coverage excludes, e2e seed/anchor coupling. Useful when judging any FSD-slice or CI-touching spec.
metadata:
  type: project
---

Gate topology verified 2026-06-29 while critiquing the public-landing-i18n-seo spec. Re-verify against current config before relying on these (gates evolve).

**Token gate (ADR 0058)** — `check:tokens` = `eslint src/components src/widgets --no-error-on-unmatched-pattern`. The eslint rule block (`eslint.config.mjs` ~line 59) has `files: ["src/components/**/*.{ts,tsx}", "src/widgets/**/*.{ts,tsx}"]`, ignoring `*.test.*`/`*.stories.*`/`__snapshots__`. So **src/widgets IS token-gated; src/app is NOT.** This is why one-off page markup belongs in a `widgets/` slice, not directly in `src/app/[locale]/page.tsx`.

**Component-kit-only gates** — `check:stories` (ROOT=`src/components`), `check:graph` (UI_DIR=`src/components/ui`), `check:design-intent` (UI_DIR=`src/components/ui`) are all scoped to **src/components only**. A new `src/widgets/*` slice does NOT trigger colocated-story mandate, composition-graph, or design-intent.ts. (So putting page sections in `widgets/` avoids forcing a full story-matrix + design-intent on marketing one-offs — a real, grounded reason, not a strawman.)

**Coverage (ADR 0008)** — `vitest.config.mts` thresholds: statements 80, lines 80 (no branch/function gate). Excludes include `src/app/[locale]/page.tsx`, `src/app/[locale]/layout.tsx`, `src/app/[locale]/*/layout.tsx`, `src/design-system/**`, `src/lib/supabase/**`, `src/lib/ai/**`, `src/lib/env.server.ts`, providers/error/not-found. `src/widgets/**` IS in the denominator — new widget source needs a unit test or story that actually renders it (a shallow test that mocks the composition leaves children uncovered).

**i18n parity (ADR 0055)** — `check:i18n` parity is **vacuous with one locale** (only ICU structural check runs over en). A spec claiming "key parity holds" with single-locale en is technically true-but-empty.

**e2e seed/anchor coupling (ADR 0084/0085)** — `db:reset` runs `supabase/seed.sql` (auth users alice/bob@capcom.dev pw `password123`, projects, profiles, memberships). The dense event volume is a SEPARATE step: `seed:events` (scripts/seed-events.mjs, needs `SUPABASE_SECRET_KEY` from `supabase status`). The data-dense e2e specs (trends/funnels/retention/segments) hardcode windows around **`SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z`** and FAIL without that exact pinned anchor. `npm run test:e2e` (= `playwright test`, webServer = `next build && next start` on :3100) assumes the stack + seed are ALREADY prepared — it does NOT run supabase/db:reset/seed itself. So `npm run test:e2e` proves the suite green given a prepared stack; it does NOT prove an authored ci.yml job's step ordering/key-export is correct.

**react/no-danger** — NOT enabled in eslint.config.mjs, so JSON-LD via `dangerouslySetInnerHTML` raises no lint error and needs no eslint-disable (no check:debt entry).

**check:spelling** — `cspell --no-progress "**/*.md"` only (`cspell.json` files=["**/*.md"]). Project words live in `.cspell/project-words.txt` (wired via dictionaryDefinitions). Only .md prose needs new words; TS/script identifiers are out of scope.

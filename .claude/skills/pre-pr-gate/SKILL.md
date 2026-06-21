---
name: pre-pr-gate
description: >-
  Run the full local quality sweep before opening a PR — the CI gate (typecheck, lint,
  format, stories, design-system bundle, FSD boundaries, gate self-test, token drift, build,
  coverage) plus
  the jobs deferred to local-only during bootstrap (Playwright e2e, Storybook test-runner
  smoke). Reports a pass/fail checklist and maps each failure to its fix, so review starts
  green. Use before "open a PR", "is this PR-ready", "run the gates", "pre-PR check", or
  "/pre-pr-gate".
disable-model-invocation: true
---

# Pre-PR gate — the full local sweep

CI (`.github/workflows/ci.yml`, ADR 0010) is the merge guarantee, but two of its jobs are
temporarily removed during bootstrap to keep CI fast and run **local-only** for now: the
**Storybook test-runner smoke**, and the **Supabase e2e job** — which also carried the
**migration-replay + `gen:types` type-drift check**. That second omission matters: with the
e2e job gone, nothing in CI verifies that `supabase/migrations/**` and the generated
`database.types.ts` agree, and the `post-edit-checks` hook only emits a **non-blocking** nudge
— so this skill is currently the **only enforcing gate** for DB type drift. So "green CI" no
longer means "everything ran". This skill runs **the CI gate plus those deferred jobs** in one
pass and reports a checklist, so nothing reaches the PR unproven. It only runs checks (no code
edits), but it is **user-invoked** because the full sweep (build + coverage + e2e) is heavy.

> Node 24 is required (`engines.node >=24 <25`). If `node -v` is not v24.x, prepend your
> Node 24 (the newest `~/.nvm/versions/node/v24.*/bin`) to `PATH` first. The e2e tier needs
> **Docker** and a local Supabase stack (`npx supabase start`).

## How to run it

Go **cheap-to-expensive** and report every result — do **not** stop at the first red unless
the user asked to fail fast; a full checklist is more useful than one failure. Capture
pass/fail per step.

### Tier 1 — static gate (fast, always run)
```bash
npx tsc --noEmit                 # types — strict, noUncheckedIndexedAccess (ADR 0003)
npm run lint                     # ESLint incl. the component token gate (ADR 0006/0058)
npm run format:check             # Prettier (ADR 0006)
npm run check:stories            # every src/components/** has colocated stories (ADR 0042)
npm run check:design-system      # tokens + boundaries + graph + design-intent + seals + i18n (ADR 0058–0064)
npm run check:fsd                # FSD layer boundaries — Steiger (ADR 0065/0066)
npm run check:gates              # gate self-test — each custom rule still rejects its violator (P6)
```

### Tier 2 — token-drift (generated registry matches source)
```bash
npm run gen:tokens
git diff --exit-code -- src/design-system/tokens.generated.ts \
  src/design-system/tokens.allowlist.json src/design-system/tokens.agent-rules.md
```
A non-empty diff means `globals.css` (@theme) and the generated token registry are out of
sync (ADR 0058) — **stage the regenerated files**, then this passes. (Same check CI runs.)

### Tier 3 — build + tests (heavier)
```bash
npm run build                    # next build — the production compile must succeed
npm run test:coverage            # Vitest both projects + merged coverage; fails below 80% (ADR 0008/0041)
```

### Tier 4 — deferred-to-local jobs (the ones CI is NOT running right now)
```bash
# DB type drift — regenerate the typed client against the running stack and assert it
# matches what's committed. This is the gate CI lost with the e2e job: migration edits
# silently staledate database.types.ts, and the post-edit hook's gen:types reminder is
# non-blocking, so without this nothing catches the drift before merge (ADR 0014/0015).
# Needs Docker + the stack up; if it's down this is a ⏭️ skip (say so), NOT a pass.
npm run gen:types
git diff --exit-code -- src/lib/supabase/database.types.ts   # non-empty diff = stale types; stage them

# Playwright e2e — needs Docker + a running stack (npx supabase start). Covers the
# auth/RLS critical path (ADR 0007). Skip ONLY if no stack is available — and say so.
npm run test:e2e

# Storybook test-runner build-integrity smoke over the statically built Storybook (ADR 0037).
npm run build-storybook && npm run test:storybook
```

## Reporting

Produce a checklist, every step marked, with failures first and each tied to its fix:

```
## Pre-PR gate

Tier 1 — static
  ✅ tsc            ✅ lint           ✅ format:check
  ✅ check:stories  ❌ check:design-system   ✅ check:gates
Tier 2 — token drift   ✅ (registry in sync)
Tier 3 — build/tests   ✅ build   ⚠️ coverage 78% (< 80%)
Tier 4 — deferred      ✅ type-drift   ✅ e2e   ⏭️ storybook smoke (skipped — reason)

### Must fix before PR
- check:design-system → `npm run check:design-intent` failed on card.design-intent.ts:
  <error>. Fix: <concrete change>.
- coverage 78% < 80% (ADR 0008): add tests for <uncovered file>, or — only if this is a
  `hotfix/*` PR — the threshold bypass applies (ADR 0008), nothing else does.

### Skipped (and why)
- storybook smoke — no built Storybook / not requested. Run: `npm run build-storybook && npm run test:storybook`.
```

## Rules

- **Report, don't paper over.** State failures plainly with their output; never present a
  skipped tier as passed. A skipped e2e because the stack is down is a ⏭️ with a reason, not a ✅.
- **This gate does not fix code.** Map each failure to the fix command or the file to change,
  and hand back — the user (or a follow-up edit) applies it. For auto-fixable formatting,
  point to `npm run format`; for token violations, the semantic token to swap in.
- **Coverage floor is hard.** Below 80% blocks merge; only `hotfix/*` / `hotfix`-labeled PRs
  bypass it, and nothing else of the gate (ADR 0008). Do not suggest lowering the threshold.
- **The human gates are not yours.** Opening the PR, its required human approval (ADR 0047),
  and merging into `dev`/`main` (ADR 0046) stay with the user. This skill gets the branch
  green; it does not ship it.

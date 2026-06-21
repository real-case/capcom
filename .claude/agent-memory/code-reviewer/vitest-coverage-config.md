---
name: vitest-coverage-config
description: Verified facts about this repo's Vitest 4 / Vite 8 test+coverage config — avoid false positives on resolve.tsconfigPaths and the 80% threshold
metadata:
  type: project
---

Verified 2026-06-11 on branch `feat/phase-2-quality-tooling` (PR #2, Phase 2). Re-verify if the toolchain is upgraded.

**`resolve: { tsconfigPaths: true }` in `vitest.config.mts` is VALID and load-bearing — do NOT flag it.**
Vitest 4 / Vite 8 natively support `resolve.tsconfigPaths` to auto-honor tsconfig `paths` (the `@/*` → `src/*` alias). Probed directly: a `@/app/page` import resolves WITH the key and fails ("Failed to resolve import") WITHOUT it. `vite-tsconfig-paths` is NOT installed and is NOT needed here. The older guidance (need the `vite-tsconfig-paths` plugin or explicit `test.alias`) applies to older Vite, not this repo.

**Why:** Initial instinct was that `resolve.tsconfigPaths` is an unknown Vite key silently ignored. That was wrong for Vite 6+/8. Always probe alias resolution before flagging.

**How to apply:** If a reviewer (or you) suspects the `@/*` alias is broken in tests, plant a throwaway `src/x.test.tsx` importing via `@/...` and run `vitest run` rather than asserting from memory.

**The 80% coverage threshold DOES enforce (denominator includes untested files).**
`coverage.include: ["src/**/*.{ts,tsx}"]` with the V8 provider counts files that were never imported by any test. Probed: planting an untested `src/lib/*.ts` dropped statements to ~14% and the run exited code 1 with `ERROR: ... does not meet global threshold (80%)`. So the gate is real, not vacuous — do NOT claim it only counts imported code. The coverage *table* looks empty when the only covered file (`page.tsx`) is 100% and `layout.tsx` is excluded; that emptiness is not a misconfiguration.

**Gotcha when probing exit codes:** piping the coverage run through `tail` makes `$?` capture tail's exit (0), masking vitest's real exit. Redirect to /dev/null and check `$?` directly to see the true 1-on-failure.

Related: [[node-24-via-nvm]] — these commands need Node 24 on PATH (shell default is 22).

---
name: capcom-ac-oracle-drop-risk
description: Marvin specs bind each AC to a named test oracle — verify that exact oracle exists in the diff, gates won't
metadata:
  type: feedback
---

Marvin `.marvin/task/<slug>.md` specs list, per acceptance criterion, an `oracle.ref` naming the exact test (file + test name) that proves it, and a `build_order` of F-items. An F-item can be silently dropped during implementation and **every quality gate still passes green**, because coverage %, tsc, lint, and the e2e do not force a specific named unit test to exist.

**Why:** observed in PR-4 (trends-explorer). AC4's oracle was `src/entities/event/api/queries.test.ts::rpc fetchers call the right function with the right args` (spec item F5). The implementation shipped the fetchers but **never added F5** — `queries.test.ts` was not in the diff and had no rpc-shape test. The component test mocked `@/entities/event` (so it can't prove the real `.rpc(name,args)` shape) and the e2e called `supabase.rpc` directly (bypassing the fetchers). Result: AC4's explicit failure mode (wrong fn name/args, swallowed error) was unguarded, yet coverage was 94.85% and all gates green.

**How to apply:** for every AC in the spec, grep the diff for the file named in `oracle.ref` AND confirm a test there actually asserts that AC's failure mode. Treat a missing/never-created oracle as a coverage BLOCKER even when gates are green — "passes the gate but under-proven" is exactly the class this critic exists to catch. Cross-check `implemented_by` F-items against `git diff --name-status` to spot dropped files. Related: [[capcom-token-gate-mechanics]].

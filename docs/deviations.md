# Deviation journal

A journal of **temporary, on-the-record departures from an accepted ADR**, taken while the
template still has no product code — to keep CI turnaround fast and the toolchain lean
during bootstrap. A deviation is **not** an ADR change: the recorded decision remains the
target end-state, and the entry tracks the gap until it closes. The governing process is in
[`03-methodology.md`](03-methodology.md), section "Managed deviations (lean bootstrap)".

## Admissibility

A departure belongs in this journal only if it:

1. departs from an **accepted** ADR (not a proposed one),
2. is **temporary**, and
3. names a **concrete re-enable trigger** — a condition, not a guessed date.

Anything permanent requires a superseding ADR instead, never a journal entry.

## Entry format

| Field                | Meaning                                                           |
| -------------------- | ----------------------------------------------------------------- |
| ID                   | `DEV-NNN`, sequential and permanent.                              |
| ADR commitment       | the accepted ADR(s) the deviation departs from.                   |
| Deviation            | what is not done as the ADR specifies, and since when.            |
| Rationale            | why the departure is worth it during bootstrap.                   |
| Compensating control | what guards the gap while the deviation is active.                |
| Re-enable trigger    | the concrete condition that ends the deviation.                   |
| Status               | `active` / `resolved` (with the resolving commit/PR when closed). |

---

## Active deviations

_None._ Both bootstrap deviations were resolved in PR-10 (the last roadmap unit before the
first `dev` → `main` promotion), when their re-enable trigger was met — see below.

## Resolved deviations

### DEV-001 — Playwright e2e + migration replay deferred from CI

- **ADR commitment:** the Playwright e2e suite runs in the CI gate, exercising the
  auth/RLS critical path end-to-end (ADR 0007 testing — the risk-weighted critical path
  gets e2e first; ADR 0010 CI gate; ADR 0008 the gate as a merge requirement).
- **Deviation:** the e2e job (Supabase stack startup → migration replay → `gen:types`
  drift check → auth/RLS e2e) was **not wired into `ci.yml`** during bootstrap. It was
  referenced from the `ci.yml` comment that marked the deferred job.
- **Rationale:** Supabase image pulls (~3–4 min/run) dominated CI turnaround during
  bootstrap, while there were no real feature components and no migrations yet.
- **Compensating control:** the specs ran **locally** on every change —
  `npm run test:e2e` (needs a local stack: `npx supabase start`). The
  `supabase-rls-reviewer` agent and the `create-migration` skill's RLS self-check were
  the load-bearing guards for row-isolation correctness while the job was deferred.
- **Re-enable trigger:** before the **first `dev` → `main` production promotion**
  (ADR 0011). Met by PR-10.
- **Status:** **resolved** — the `e2e` job was authored in `.github/workflows/ci.yml`
  (PR-10): `supabase start` → `db:reset` (migration replay + base seed) → `gen:types`
  drift check → export the local dev service key → `seed:events` at the pinned anchor →
  `npm run test:e2e`. The full suite (incl. `e2e/ai-query.spec.ts` and the new
  `e2e/landing.spec.ts`) runs against the seeded local stack. Marking it a **required
  check** is the remaining human branch-protection step (ADR 0046), after one observed-green
  cycle.

### DEV-002 — Storybook test-runner smoke is local-only

- **ADR commitment:** a `@storybook/test-runner` smoke pass over the **statically built**
  Storybook in CI — render + play, no axe, no coverage (ADR 0036 / 0037).
- **Deviation:** the smoke job was **deferred from `ci.yml`** (same lean-bootstrap
  rationale as DEV-001 — it adds a Storybook build + serve + a second browser run). It was
  referenced from the `ci.yml` comment that marked the deferred job.
- **Rationale:** the build + serve + second browser run was pure overhead while there were no
  components to smoke-test yet.
- **Compensating control:** the Vitest addon already runs the **browser-mode story tests —
  a11y + merged coverage** in the quality gate (ADR 0038 / 0039 / 0041) — the load-bearing
  engine — and continues to.
- **Re-enable trigger:** alongside DEV-001, before the first production promotion. Met by PR-10.
- **Status:** **resolved** — the `storybook-smoke` job was authored in
  `.github/workflows/ci.yml` (PR-10): `build-storybook` → serve `storybook-static` →
  `npm run test:storybook` (render + play, no axe/coverage — single-sourced from the Vitest
  addon). Marking it required is the same human branch-protection step as DEV-001.

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

### DEV-001 — Playwright e2e + migration replay deferred from CI

- **ADR commitment:** the Playwright e2e suite runs in the CI gate, exercising the
  auth/RLS critical path end-to-end (ADR 0007 testing — the risk-weighted critical path
  gets e2e first; ADR 0010 CI gate; ADR 0008 the gate as a merge requirement).
- **Deviation:** the e2e job (Supabase stack startup → migration replay → `gen:types`
  drift check → auth/RLS e2e) is **not wired into `ci.yml`** during bootstrap. It is
  referenced from the `ci.yml` comment that marks the deferred job.
- **Rationale:** Supabase image pulls (~3–4 min/run) dominate CI turnaround during
  bootstrap, while there are no real feature components and no migrations yet.
- **Compensating control:** the specs still run **locally** on every change —
  `npm run test:e2e` (needs a local stack: `npx supabase start`). Until the job returns,
  the `supabase-rls-reviewer` agent and the `create-migration` skill's RLS self-check are
  the load-bearing guards for row-isolation correctness.
- **Re-enable trigger:** before the **first `dev` → `main` production promotion**
  (ADR 0011). The job is **authored at that point** (Supabase startup → migration replay →
  `gen:types` drift → auth/RLS e2e) — there is no prior job in this repo's history to
  recover.
- **Status:** active.

### DEV-002 — Storybook test-runner smoke is local-only

- **ADR commitment:** a `@storybook/test-runner` smoke pass over the **statically built**
  Storybook in CI — render + play, no axe, no coverage (ADR 0036 / 0037).
- **Deviation:** the smoke job is **deferred from `ci.yml`** (same lean-bootstrap
  rationale as DEV-001 — it adds a Storybook build + serve + a second browser run). It is
  referenced from the `ci.yml` comment that marks the deferred job.
- **Rationale:** the build + serve + second browser run is pure overhead while there are no
  components to smoke-test yet.
- **Compensating control:** the Vitest addon already runs the **browser-mode story tests —
  a11y + merged coverage** in the quality gate (ADR 0038 / 0039 / 0041) — the load-bearing
  engine. The smoke job runs locally on demand: `npm run build-storybook`, serve
  `storybook-static` (or `npm run storybook`), then `npm run test:storybook`.
- **Re-enable trigger:** alongside DEV-001, before the first production promotion.
- **Status:** active.

## Resolved deviations

_None yet._ When a deviation's re-enable trigger is met, move its entry here and record the
resolving commit or PR in the Status field.

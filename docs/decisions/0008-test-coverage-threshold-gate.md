---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Mandatory 80% global test-coverage threshold gating PR merge, except hotfixes

## Context and Problem Statement

The project runs tests (**0007**) inside the CI quality gate (**0010**), and changes reach
the integration/production branches through pull requests (**0011**). But the *presence* of
tests says nothing about how much of the code they exercise: without a coverage floor,
coverage erodes quietly as features land with thin or no tests, and "the tests pass" stops
being a meaningful signal.

The project wants a **mandatory** coverage threshold that blocks a PR from merging when
coverage falls below it — with one carve-out: urgent **hotfixes** must be able to ship
without being held up by the coverage gate. Two things must be decided: the coverage model
and number, and how the gate is enforced and bypassed for hotfixes.

## Decision Drivers

* **Meaningful coverage, enforced** — a floor must prevent silent erosion; "tests exist" is
  not enough.
* **Actually merge-blocking** — the threshold must block merge via the CI status check
  (**0010**) and branch protection (**0011**), not be advisory.
* **Minimal added infrastructure** — prefer enforcing through the existing runner (Vitest,
  **0007**) and gate (**0010**) rather than adding external services.
* **Unblocked incident response** — a hotfix to production must not be blocked by coverage,
  while the exception stays controlled and visible.

## Considered Options

* Global coverage threshold (80%) enforced in Vitest, blocking merge; hotfix bypass
* No enforced threshold — coverage measured but advisory only
* Diff / patch coverage via an external service (Codecov / Coveralls)
* Ratchet — coverage may not drop below the base branch

## Decision Outcome

Chosen option: "Global 80% threshold enforced in Vitest, blocking merge, with a hotfix
bypass", because it enforces a meaningful floor using the test runner already chosen
(**0007**) with no extra service, and it is genuinely merge-blocking through the existing CI
gate (**0010**) and branch protection (**0011**). Concretely:

- **Threshold:** global coverage **≥ 80%**, measured on statements/lines (branch coverage is
  tracked and may be tuned up over time). Configured via Vitest `coverage.thresholds`, so the
  dedicated `npm run test:coverage` run **fails** below 80%.
- **Enforcement:** the failing `test:coverage` step turns the CI gate (**0010**) red; because
  merge requires that check (branch protection, **0011**), a sub-threshold PR cannot merge.
- **Exclusions:** generated files (the Supabase types from **0015**), configuration,
  type-only declarations, test files themselves, and pure scaffolding are excluded from the
  denominator so the number reflects meaningful application code.
- **Hotfix exception:** a PR on a `hotfix/*` branch (branched off `main` per **0011**), or
  carrying a `hotfix` label, bypasses the coverage threshold only — all other gate steps
  still apply. The bypass is noted in the PR, and a follow-up to restore coverage is required.

### Consequences

* Good, because a baseline of real coverage is guaranteed and erosion is caught before merge,
  not after.
* Good, because it adds no infrastructure — Vitest enforces the threshold inside the gate
  that already exists (**0007**, **0010**).
* Good, because the hotfix carve-out keeps incident response fast while keeping the exception
  narrow and logged.
* Bad, because a global percentage is a blunt instrument: a PR can add untested code yet keep
  the global number ≥ 80% if the rest of the codebase is well-covered — diff/patch coverage
  would catch that, so reviewers must still check that new code is tested.
* Bad, because a hard floor can incentivize low-value "coverage theater" tests; this is
  mitigated by reviewing test *quality*, not just the number.
* Bad, because sustaining 80% as the codebase grows is ongoing effort, and the number may
  need revisiting via a superseding ADR.
* Risk: the hotfix bypass could be abused to skip tests routinely → Mitigation: restrict it
  to `hotfix/*` branches / the `hotfix` label, record each use in the PR, and require a
  follow-up that adds the missing tests.

### Confirmation

Vitest `coverage.thresholds` is set to 80% (statements/lines) with the exclusions above;
coverage runs as a dedicated `npm run test:coverage` command — separate from the fast
`npm run test:unit` inner-loop runner (**0007**) — and fails below the threshold; CI (**0010**) runs
`test:coverage` as its own step and the check is required for merge (**0011**). The only
sanctioned bypass is a `hotfix/*` branch or `hotfix`-labeled PR, documented as such.

## Pros and Cons of the Options

### Global 80% in Vitest, merge-blocking, hotfix bypass (chosen)

* Good, because it enforces a real floor with zero extra infrastructure and truly blocks
  merge.
* Good, because the hotfix carve-out keeps urgent fixes unblocked under a controlled
  exception.
* Bad, because the global metric is blunt and can miss untested new code; a hard floor risks
  low-value tests.

### No enforced threshold (advisory only)

* Good, because it adds no friction and can still surface a coverage trend.
* Neutral, because coverage is at least visible.
* Bad, because nothing prevents erosion and nothing blocks an under-tested merge — which
  fails the explicit "mandatory, merge-blocking" requirement outright.

### Diff / patch coverage via external service

* Good, because it gates exactly the PR's new and changed lines — the most meaningful per-PR
  signal, and it catches untested new code the global metric can miss.
* Neutral, because it provides rich reporting and history.
* Bad, because it requires adopting and configuring an external service (Codecov/Coveralls),
  a token, and a status integration — more moving parts and a new dependency than the chosen
  zero-infra approach, and not what was asked for now.

### Ratchet (no drop vs base)

* Good, because it prevents erosion without committing to an absolute number.
* Neutral, because it adapts as coverage rises.
* Bad, because it needs base-branch comparison tooling, can stall on a volatile base, and
  does not set the explicit floor that was requested.

## More Information

Builds on **0007** (Vitest, the runner that measures and enforces coverage), **0010** (the CI
gate the failing threshold turns red), and **0011** (branch protection that makes the check
required, and the `hotfix/*` branches that are the sanctioned exception). It can be superseded
later to raise the number, tighten branch coverage, or add diff/patch coverage on top of the
global floor.

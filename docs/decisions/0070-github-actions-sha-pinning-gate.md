---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Enforce SHA-pinning of GitHub Actions with a fitness-function gate

## Context and Problem Statement

Every `uses:` in this repo's workflows is pinned to a full commit SHA (e.g.
`actions/checkout@df4cb1c0…`), following the pinning posture of **0044** (the same posture
0056 cites for the scanner). But the posture is a **convention, not an enforced
invariant** — a future workflow edit can introduce a mutable `@v4` tag or `@main` branch
ref, which a compromised or retagged upstream action can exploit (the supply-chain attack
SHA-pinning exists to prevent). Nothing fails CI when that happens.

## Decision Drivers

* **Make 0044's pinning posture a verifiable invariant**, not a reviewer's memory.
* **Supply-chain integrity** — a mutable ref is an unreviewed code-execution surface in CI.
* **Deterministic, dependency-free** — consistent with the reference-integrity gate family
  (check:claude / check:citations) and AI-GUARDRAILS §7 single-source discipline.
* **Self-testing** — the gate must prove it rejects its own violator (the P6 pattern of
  check:gates / check:claude).

## Considered Options

* **A dependency-free Node gate (`check:action-pins`)** over `.github/workflows/*.yml` with
  a P6 self-test, in the `claude-infra` job.
* **A third-party action** (e.g. `ensure-sha-pinned-actions`).
* **Allowlist / convention only** — keep relying on review.

## Decision Outcome

Chosen option: "a dependency-free Node gate", because it matches the existing
reference-integrity family exactly: a small `scripts/check-action-pins.mjs` scans every
workflow file and flags any `uses:` whose ref is not a 40-hex commit SHA — local actions
(`./…`) and reusable-workflow refs excluded by the same rule — exiting non-zero on a
violation. It ships a `--self-test` that proves it rejects a planted `@v4`/`@main` ref (P6),
and runs in the `claude-infra` CI job beside `check:citations`. Using SAST/3rd-party
tooling here would add a pin-to-maintain to guard pinning — circular; the in-repo script is
the lighter, self-consistent choice.

### Consequences

* Good, because 0044's pinning posture becomes a CI invariant — a mutable action ref can no
  longer slip in via a workflow edit.
* Good, because it reuses the established self-testing, dependency-free gate pattern; no new
  trust surface to guard the trust surface.
* Bad, because Renovate (0057) bumps pinned SHAs with an accompanying comment; the gate must
  accept the `# vX.Y.Z` trailer convention (it checks the ref, not the comment) so
  legitimate pin-bumps pass.
* Bad, because one more required check to keep green; the P6 self-test guards the gate
  itself.

### Confirmation

`scripts/check-action-pins.mjs` + the `check:action-pins` npm script exist; a `--self-test`
passes (rejects a planted unpinned `uses:`); the gate runs in the `claude-infra` CI job;
every current `uses:` across `.github/workflows/*.yml` is SHA-pinned, so the live run is
green.

## Pros and Cons of the Options

### Dependency-free Node gate (chosen)

* Good, because deterministic, zero-dependency, self-testing, consistent with check:citations.
* Good, because it directly enforces an existing accepted decision (0044) rather than
  introducing a new policy.
* Bad, because it is bespoke code to maintain (mitigated by the small surface + self-test).

### Third-party action

* Good, because off-the-shelf, no code to write.
* Bad, because it adds an action that itself must be SHA-pinned and trusted — guarding the
  pinning posture with another external dependency is self-undermining.

### Convention only

* Good, because nothing to build.
* Bad, because the posture stays unenforced; a single careless edit reintroduces a mutable
  ref with no failing signal.

## More Information

Enforces the pinning posture of **0044**; joins the deterministic reference-integrity gate
family recorded by **0067** (check:claude / check:claude-md / check:citations) in the
`claude-infra` CI job (**0010**). Self-test follows the P6 convention of `check:gates`.

---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Self-testing gates and the technical-debt escape-hatch gate

## Context and Problem Statement

The deterministic `check:*` gates assert properties of the code. Two **meta** questions about the
gate system itself have no owning record:

1. *Does a gate actually fail when it should?* A custom gate that can never reject a violator is
   indistinguishable from no gate — the silent failure mode the design-system plan calls **P6**.
2. *Are the sanctioned escape hatches used with their required justification?* The project
   deliberately allows escape hatches — `eslint-disable` (**0003**/**0006**), `"use no memo"`
   (**0029**), a per-story a11y opt-out (**0039**), a design-intent `applicable: false` (**0062**),
   and a quarantined/skipped test (**0049**) — but each is allowed *only with a recorded reason*,
   and nothing inventories them or checks the reason is present.

Both are enforced today — `check:gates` and `check:debt` run in CI — but each is cited as a
distributed list of ADR numbers with no single owner. A mechanism with N citations and zero owners
is exactly the ambiguity this corpus otherwise avoids.

## Decision Drivers

* **A green gate must mean something** — every custom gate must be proven to reject a real
  violator, or "green" is not evidence (P6).
* **Debt must be visible and justified** — escape hatches are necessary, but an *unjustified* or
  *forgotten* one is silent debt; it should be inventoried and its reason enforced.
* **Single owner** — the meta-integrity layer needs one founding record, not a citation smeared
  across the gates it touches.
* **Reuse one convention** — a shared `--self-test` shape across custom gates, not a bespoke test
  per gate.

## Considered Options

* **One meta-integrity record** owning `check:gates` (self-test) and `check:debt` (escape-hatch
  inventory)
* **Leave both as distributed citations** across the gates and escape-hatch ADRs they touch
* **Trust gates without self-tests, and reviewers to catch unjustified escape hatches**

## Decision Outcome

Chosen option: "one meta-integrity record", because both gates answer the same question — *can we
trust the rule system itself?* — and both were orphaned for the same reason.

* **`check:gates`** (`scripts/check-gates.mjs`) plants a known violator for each custom gate, runs
  the gate, asserts a **non-zero** exit, and restores all state in a `finally` block. It is the
  test of the tests; every custom gate ships a `--self-test` it drives.
* **`check:debt`** (`scripts/debt-scan.mjs`) inventories every sanctioned escape hatch and fails
  when one lacks its mandated reason, or when a test quarantine is past its time-box (**0049**).
  Plain `TODO`/`FIXME` markers are reported, never failed.

Both run in CI beside the gates they guard.

### Consequences

* Good, because a gate that silently stops rejecting violators turns CI red via its own self-test,
  instead of passing everything unnoticed.
* Good, because technical debt is surfaced and justified rather than accumulating invisibly.
* Good, because the meta-layer now has a single home, ending the distributed-citation smell.
* Bad, because every new custom gate must also author a `--self-test` — intended friction, but real
  authoring cost.
* Bad, because `check:debt` is a pattern scan: it catches the escape hatches it knows, so a novel
  hatch needs a new pattern (the reactive-growth loop of **0064**).

### Confirmation

`check:gates` runs in CI and fails if any custom gate fails to reject its planted violator;
restoring state in `finally` keeps it idempotent. `check:debt` fails on a planted `eslint-disable`
with no reason and on a quarantine past its time-box, and passes when every escape hatch carries
its justification. Both gates are themselves listed in the suite, so the meta-layer is run like any
other check. P6 holds: `npm run check:gates` is green only when every gate's self-test rejects its
violator.

## Pros and Cons of the Options

### One meta-integrity record (chosen)

* Good, because it gives both self-testing and debt-inventory a single owner and rationale.
* Good, because it mirrors **0067**'s pattern of one record owning a family of integrity gates.
* Bad, because it bundles two scripts under one decision — justified only because they share the
  one purpose (trusting the rule system).

### Leave as distributed citations

* Good, because it requires no new record.
* Bad, because "which ADR owns gate self-testing?" stays unanswerable, and the next reader
  re-derives it from a four-number citation — the drift this corpus exists to prevent.

### Trust gates and reviewers

* Good, because it is the least machinery.
* Bad, because a gate that quietly stopped working is invisible precisely when it matters, and
  unjustified escape hatches are exactly the high-frequency, low-salience item review skips under
  load.

## More Information

P6 ("gates that test themselves") is from `AI-GUARDRAILS.md` §7; the escape hatches are sanctioned
by **0003**, **0029**, **0039**, **0049**, and **0062**. The Defect-Log reactive growth (**0064**)
graduates new invariants into Stage-1 gates, each of which then needs its own self-test under this
record. This completes the integrity-gate family alongside **0067** (citation resolution) and the
`check:claude` reference checks (**0077**).

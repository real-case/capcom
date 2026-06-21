---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# AI triage of CI failures, with explicit flake quarantine and no blind retries

## Context and Problem Statement

The testing stack spans four execution surfaces — Vitest unit/RTL (**0007**), Vitest
browser-mode story tests (**0037**), the test-runner smoke pass over the built Storybook
(**0037**), and Playwright e2e (**0007**) — plus the visual (**0043**) and accessibility
(**0039**) checks, all wired into one gate (**0010**). A failed run on any surface demands
diagnosis: real regression, flaky test, or infrastructure hiccup? The corpus records no
policy for this. The default failure modes are both bad: silent auto-retries that launder
real regressions into green builds, or humans hand-reading CI logs across four surfaces
for every red run.

## Decision Drivers

* **Diagnosis before action** — a red gate should arrive with a classified cause, not a
  log dump.
* **Flakes as visible debt** — a nondeterministic test is a defect with an owner and a
  deadline, not a retry setting.
* **No laundering** — the gate (**0010**, **0008**) is only meaningful if a pass means a
  pass; blanket retries undermine every record that relies on the gate.
* **Multi-surface cost** — with four engines, manual triage cost scales with the test
  suite; the corpus's automation-first posture (**0001**) applies.

## Considered Options

* An AI triage job on gate failure that posts a classified diagnosis, plus an explicit
  quarantine policy for flakes; no global retry configuration
* Manual triage only — humans read the logs
* Auto-retry failed jobs N times; investigate only persistent failures

## Decision Outcome

Chosen option: "AI triage plus explicit quarantine, no blind retries", because it makes
diagnosis cheap without weakening what a green gate means. When a required check fails, a
triage job collects the failing surface's logs and the PR diff and posts a comment
classifying the failure: **real regression** (with the suspected change), **flaky test**
(only with evidence — e.g. pass-on-targeted-rerun plus a hypothesized nondeterminism
source: timing, ordering, shared state, animation per **0043**), or **infrastructure**
(runner/network/quota). The classification is advisory; disposition is human. A test
established as flaky is **quarantined explicitly** — skipped via an annotated skip linked
to a tracking issue, time-boxed — never stabilized by retry config. CI has **no global
retry policy**; targeted reruns are a triage tool, not a merge path.

### Consequences

* Good, because every red gate arrives pre-diagnosed, cutting the most tedious
  multi-surface cost of the **0035–0042** testing investment.
* Good, because flakes become tracked, time-boxed issues instead of invisible retry noise —
  the suite's determinism is actively defended.
* Good, because "green means green" is preserved: no retry configuration can convert a
  real intermittent regression into a pass.
* Bad, because triage can misclassify (a real race labeled "flaky"); the human disposition
  step exists precisely because the classification is probabilistic.
* Bad, because triage runs add token and compute cost on every failure, and quarantine
  discipline (linked issue, time-box) is process that can rot without the audit in
  **0054**.

### Confirmation

The triage workflow exists and triggers on failure of gate jobs (**0010**); CI
configuration contains no global retry settings; every skipped/quarantined test carries an
annotation linking a tracking issue; sampled failure PRs show triage comments with one of
the three classifications and evidence for any "flaky" verdict.

## Pros and Cons of the Options

### AI triage + explicit quarantine, no blind retries (chosen)

* Good, because diagnosis is immediate and the gate's meaning is never diluted.
* Good, because flake debt is visible and bounded (issue + time-box).
* Neutral, because targeted reruns remain available as evidence-gathering, distinct from
  merge-path retries.
* Bad, because it costs an AI invocation per failure and needs prompt maintenance per
  surface.

### Manual triage only

* Good, because no new machinery or cost.
* Bad, because four execution surfaces make log-reading the recurring tax on every red
  build, paid by the scarcest resource (**0047**'s bottleneck argument).
* Bad, because under time pressure humans default to "rerun and hope" — de-facto blind
  retries without even a setting to audit.

### Auto-retry N times

* Good, because transient infrastructure failures self-heal without attention.
* Bad, because it systematically launders intermittent real regressions into green builds —
  directly undermining **0010**/**0008** and everything gated on them.
* Bad, because flakes accumulate silently: the suite degrades while dashboards stay green.

## More Information

Builds on **0010** (the gate it triages), **0007**/**0037** (the surfaces), **0008**/
**0041** (coverage gating that failure-laundering would corrupt), **0043** (animation/
determinism discipline as a flake source). Related: **0048** (AI on diffs pre-merge),
**0054** (scheduled audit that can police quarantine rot). Revisit if triage accuracy
proves too low to trust or if a surface gains native flake-detection tooling.

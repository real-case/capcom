---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Defect Log and reactive growth of design-system fitness functions

## Context and Problem Statement

The deterministic gates (**0058**/**0060**), the structural skills (**0051**-class), and the registries
(**0061**) are written up front against the failures we *anticipate*. But the failures that actually
hurt are the ones the rules **did not anticipate**: a rule that was never written, a rule that exists in
CI but never reached the agent, a rule too ambiguous to apply, or a real violation no automated check
catches. Left alone, the rule set ossifies against an out-of-date picture of how the agent actually
fails, and quality decays even though every gate is green (problem P6). A second, related decay is
structural: when a component is deprecated, its node and `usedIn` edges in the **0059** graph have an
undefined fate, so the graph accretes dead nodes and the **0060** reconciliation starts to lie (problem
P9). And in batch passes, context is lost returning to a component across waves (problem P7). This record
defines the **feedback loop** that keeps the rules current — a Defect Log of *missing or ambiguous rules*
and a reactive process that graduates them into checks — and the graph-hygiene the loop depends on. It
extends **0049** (flaky-test quarantine discipline) and **0054** (the drift audit), reusing their
mechanisms rather than duplicating them.

## Decision Drivers

* **Record the gap, not every error** — the log must capture *infrastructure* failures (a missing or
  ambiguous rule), not a bug tracker of every defect, or it drowns and stops being filled (P6/P7).
* **Root-cause determines the fix** — classifying each entry (rule absent / didn't reach the agent /
  ambiguous / not auto-caught) is what turns a defect into the *right* kind of remediation.
* **Reactive, not speculative growth** — a new invariant starts as an ADR Confirmation enforced by review;
  it earns an executable check only on its **first real violation**, which is exactly **0054**'s
  "mechanical predicates graduate into CI" mechanism — so the gate set grows from evidence, not guesswork.
* **Close the loop organizationally** — filling the log must be a *mandatory* step of the review/escalation
  phase, and "defect → rule/skill/registry" must be an *owned* action, or the loop is theatre (P7).
* **Graph hygiene is part of the loop** — component deprecation must define the fate of the **0059** node
  and its edges, or the import↔composition reconciliation (**0060**) degrades into false signal (P9).

## Considered Options

* **A Defect Log of missing/ambiguous rules + reactive fitness-function growth + graph-deprecation hygiene**,
  reviewed per wave with an assigned owner
* **A general bug tracker** — log every defect and triage later, no rule-gap focus
* **No explicit loop** — rely on **0054**'s scheduled drift audit alone to surface rule decay

## Decision Outcome

Chosen option: "a Defect Log + reactive fitness growth + graph hygiene", because it is the only option that
treats *rule decay itself* as the tracked artifact and gives each gap a defined path back into the gates. The
**Defect Log** is a journal of infrastructure failures — *missing or ambiguous rules*, not every error — each
entry classified by root cause: **rule absent** (write the rule), **didn't reach the agent** (surface it in
the agent rules/skill), **ambiguous** (sharpen the registry/ADR), or **not auto-caught** (the rule exists but
nothing enforces it). Filling the log is a **mandatory action of the review/escalation phase**, not optional.
**Reactive growth**: a new invariant begins as an ADR Confirmation enforced *by review*; on the first
violation it gets an executable check and rises into the Stage-1 deterministic layer — the **0054** graduation
mechanism, applied to design-system rules. **Closing the loop is organizational**: each wave *begins* with a
review of the accumulated log, and "defect → rule/skill/registry" is an assigned, owned step, never "someday".
Two hygiene obligations ride along: **dictionary governance** (a **0061** rename/merge/split is a migration of
every referencing intent — assign an owner + procedure before the first one), and **component deprecation**
(define the fate of a retired component's **0059** node and `usedIn` edges, so the **0060** reconciliation
keeps telling the truth). The batch-wave methodology (Stage 6) stays a convention here, promoted to its own
ADR only if it grows enforcement teeth.

### Consequences

* Good, because rule decay becomes visible and addressable: the log names *what the rules missed*, and the
  graduation path turns that into a standing check on first violation (P6).
* Good, because the per-wave review with an owner makes "defect → rule" an executed step, so context lost
  across batch passes (P7) is recovered at a defined moment rather than never.
* Good, because graph-deprecation hygiene keeps the **0059**/**0060** reconciliation honest as components
  retire (P9), and dictionary governance keeps **0061** renames from fragmenting the intent files.
* Bad, because the loop is process, and process erodes without ownership — an unfilled log or an unassigned
  "defect → rule" step silently reverts to the no-loop baseline; the mandatory-step framing is the only guard.
* Bad, because reactive growth means the *first* occurrence of a new failure class is, by design, caught by
  review and not by a gate — an accepted recall cost in exchange for not speculatively building checks for
  failures that never happen.

### Confirmation

A Defect Log exists and records missing/ambiguous rules (not every error), each with a root-cause class; it
has at least one entry *converted* into a rule/skill/registry change; a graduated invariant appears as a new
Stage-1 check (the **0054** mechanism). Per-wave reviews of the log are evidenced, with an owner. A dictionary
rename/merge/split procedure and a component-deprecation procedure (node + `usedIn` edge fate) are recorded
before the first such event. Reuses **0049**'s quarantine discipline for flaky checks and **0054**'s
graduation path. Subject to the **0054** drift audit once accepted.

## Pros and Cons of the Options

### Defect Log + reactive growth + graph hygiene (chosen)

* Good, because it tracks rule decay as a first-class artifact and routes each gap back into the gates.
* Good, because it reuses **0049**/**0054** rather than inventing parallel machinery.
* Neutral, because reactive growth accepts that the first instance of a new failure is review-caught.
* Bad, because it is process that depends on ownership to not erode.

### General bug tracker

* Good, because teams already have one and it captures everything.
* Bad, because mixing rule-gaps into ordinary defects buries the signal this loop needs; the rule-decay view
  (P6) never emerges from a flat bug list.

### No explicit loop, rely on 0054

* Good, because **0054** already audits code against Confirmations on a schedule.
* Bad, because **0054** finds *drift from existing decisions*; it does not surface *missing* decisions or the
  agent-reach/ambiguity classes — the gaps the Defect Log is specifically for (P6/P7).

## More Information

Extends **0049** (flaky-test quarantine: annotated skip + tracked issue + time-box) and **0054** (the drift
audit and its "mechanical predicates graduate into CI" mechanism), applying both to the design-system rule
set. Owns the dictionary-governance procedure that **0061** renames require and the component-deprecation
hygiene that keeps the **0059** graph and **0060** reconciliation honest. The batch-wave (L1) methodology is
the Stage-6 convention, not an ADR unless it gains enforcement. Confirms problems P6 (rules diverging from
reality / knowledge laundering), P7 (context loss across batch passes), and P9 (artifact drift after
approval). Assigning the governance/loop owner is a human action (**0046**).

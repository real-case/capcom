---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Scheduled AI audit of code against accepted ADR Confirmations (drift check)

## Context and Problem Statement

The ADR tooling verifies the corpus's *internal* integrity (`adr-audit`: numbering,
references, sections, index) and its *coverage* (`adr-coverage`: missing decisions). No
mechanism verifies the third and most consequential property: that the **code still
matches the decisions**. Yet nearly every record already carries a Confirmation section
written as checkable predicates — "no literal tokens, only `${...}` references"
(**0044**), "no image baselines are committed to the repo" (**0043**), "no Figma→token
generation pipeline exists" (**0045**), "CI commands equal the local commands"
(**0010**). Once records are accepted and code accumulates, silent divergence between
code and decision is precisely the failure mode **0001** was adopted to prevent — but
nothing patrols it.

## Decision Drivers

* **Confirmations should be a contract, not prose** — the corpus invested in writing
  checkable Confirmation sections; unexecuted checks decay into aspiration.
* **Drift is the terminal failure mode** — a corpus the code contradicts is worse than no
  corpus: agents (**0001**) would confidently cite records that are false.
* **Mixed predicate types** — Confirmations span mechanical checks ("no literal tokens")
  and judgment checks ("stories cover meaningful states", **0042**); the mechanism must
  handle both.
* **Supersede, don't drift** — when code legitimately outgrows a decision, the answer is
  a superseding record (**0001**), and something must *trigger* that, with evidence.

## Considered Options

* A scheduled AI audit that evaluates each accepted record's Confirmation against the
  repository and produces a drift report; human disposition follows
* Human-only periodic review of Confirmations
* Encode every Confirmation as a bespoke lint/CI script — fully mechanical enforcement

## Decision Outcome

Chosen option: "scheduled AI audit with human disposition", because it is the only option
that executes *all* Confirmations — mechanical and judgment alike — at a sustainable
cost. On a schedule (and on demand before acceptance milestones), an AI audit pass walks
every **accepted** record, evaluates its Confirmation section against the actual
repository state, and produces a report: per record, *confirmed* / *drifted* (with
evidence) / *unverifiable* (with reason). Disposition is human and binary, per **0001**:
either the code is fixed to match the record, or a superseding record is opened — never a
silent edit of the accepted record. Two boundaries: mechanical predicates should
*graduate* into standing lint/CI checks opportunistically (the audit then verifies the
check exists rather than re-deriving the predicate); and the audit gains its purpose only
as records reach `accepted` — with the corpus now fully accepted, the Confirmation-writing
convention it rewards is the live contract it verifies.

### Consequences

* Good, because Confirmation sections become living contracts — the corpus's promise
  ("decisions before code depends on them") gets a verification loop closing it.
* Good, because supersession becomes evidence-triggered rather than accidental: drift
  reports are exactly the "we learned Y" input **0001**'s lifecycle expects.
* Good, because agents can trust citations: a green drift report means recorded decisions
  describe the actual system (**0001**'s agentic-efficiency driver, protected over time).
* Bad, because scheduled whole-repo AI audits cost tokens proportional to corpus and repo
  size — scoping (changed-records-only between full passes) will be needed as both grow.
* Bad, because judgment predicates can produce false drift claims; the human disposition
  step is mandatory, not optional, and mis-calibrated audits could erode trust in the
  mechanism itself.

### Confirmation

A scheduled workflow or skill exists that runs the audit; it produces a per-accepted-record
report with confirmed/drifted/unverifiable verdicts and evidence; dispositions for drifted
records are traceable (a fix commit or a superseding ADR); mechanical predicates
demonstrably graduate to CI checks over time (the report lists which). Self-referentially:
this record's own Confirmation is subject to the audit once accepted.

## Pros and Cons of the Options

### Scheduled AI audit with human disposition (chosen)

* Good, because it covers judgment predicates no script can encode, and mechanical ones
  without writing N bespoke scripts up front.
* Good, because the report format makes drift visible, dated, and attributable.
* Neutral, because audit quality tracks Confirmation quality — which pressures future
  records to keep Confirmations concrete and checkable, a healthy feedback loop.
* Bad, because it is probabilistic on the judgment subset and costs per run.

### Human-only periodic review

* Good, because zero tooling and maximal judgment quality per record reviewed.
* Bad, because reviewing 40+ Confirmations against a growing repo is exactly the
  unsustainable toil (**0001**'s cost argument) that quietly stops happening; in practice
  drift would be discovered by incident, not review.

### Bespoke lint/CI script per Confirmation

* Good, because deterministic, fast, and running on every PR rather than a schedule.
* Bad, because judgment predicates ("meaningful states", "stories assert intent") cannot
  be scripted, so coverage is structurally partial.
* Bad, because N scripts are N maintenance surfaces; the chosen option still captures
  this value where it is cheap, via graduation of mechanical predicates.

## More Information

Completes the tooling triad of **0001**: `adr-audit` (corpus integrity), `adr-coverage`
(decision gaps), and this record (code/decision drift). Operates only on `accepted`
records — now that the baseline is fully accepted, it covers the whole corpus. Cited as the
verification backstop by **0049** (quarantine rot), **0053** (absence-of-machinery
confirmation), and **0056** (whole-repo complement to diff-scoped checks). Falls under
the agent role of **0046**; disposition authority under **0047**. Revisit scoping
strategy when audit cost becomes material.

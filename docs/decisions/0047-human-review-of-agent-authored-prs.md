---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Every PR requires human approval; AI review is a first pass, never a substitute

## Context and Problem Statement

The git workflow (**0011**) assumes PR review and **0010** leaves branch protection as a
human-configured setting, but no record states *whose* approval a pull request needs —
in particular whether a PR authored by the AI agent (**0046**) requires a human approver,
and whether an automated AI review (**0048**) may count as that approval. With the agent
as primary implementer, review is the main human control point; leaving its policy
unrecorded means the strictest-sounding setting gets configured by default rather than by
decision, and the question of "can the agent approve its own work?" stays open to
re-litigation.

## Decision Drivers

* **A single accountable gate** — exactly one unambiguous human decision point between
  authored code and the integration branch (**0011**).
* **Concentration of invariants** — the crown-jewel rules (RLS as the authorization
  boundary **0013**, the secret fence **0018**) are cheap to violate in code and expensive
  to discover later; bootstrap stage means no incident history to calibrate looser policies.
* **Review throughput** — the agent produces code faster than humans review it; policy
  should acknowledge the bottleneck rather than pretend it away.
* **No self-approval** — the author (human or agent) must not be the approving authority.

## Considered Options

* Mandatory human approval for every PR; AI review (**0048**) is a first pass that informs
  but never substitutes
* Tiered review — AI-review-only merges for designated low-risk classes (docs, stories),
  human approval for the rest
* No recorded policy — rely on default repository settings

## Decision Outcome

Chosen option: "mandatory human approval for every PR", because at bootstrap the project
has no incident or throughput data with which to draw a defensible low-risk tier, and the
invariants the review protects are concentrated and severe. Branch protection (**0010**)
requires at least one human approval on every PR into the integration branch; the
approver is never the PR's author; agent-authored PRs are reviewed
by a human like any other. The AI review check (**0048**) runs *before* human review and
its findings inform the reviewer, but it satisfies no approval requirement. A future
tiered model is explicitly anticipated: once real review-load data exists, a superseding
record may carve out mechanically-verifiable low-risk classes.

### Consequences

* Good, because there is exactly one unambiguous rule with no judgment calls about what
  "counts" as low-risk — cheap to configure, impossible to misread.
* Good, because every change crossing into integration has a human accountable for it,
  which is also the posture **0043** chose for visual baselines (human approval in the UI).
* Bad, because human review remains the throughput bottleneck for agent-authored work —
  the cost is accepted consciously rather than hidden.
* Bad, because some genuinely low-risk classes (typo fixes, story additions) pay full
  review price; the tiering that would relieve this is deferred, not rejected.

### Confirmation

Branch protection on the integration branch requires ≥1 approving review and dismisses
stale approvals; merged PRs show an approver distinct from the author; agent-authored PRs
show a human approver. The **0048** check is not listed among required status checks for
approval purposes. Verified in repository settings and by sampling merge history.

## Pros and Cons of the Options

### Mandatory human approval for every PR (chosen)

* Good, because it is unambiguous, mechanically enforceable via branch protection, and
  needs no risk-classification machinery.
* Good, because it preserves a human accountability chain over agent output while the
  project has no data to justify anything weaker.
* Neutral, because it treats human- and agent-authored PRs identically, which simplifies
  process at the cost of nuance.
* Bad, because it spends scarce human attention on low-risk diffs.

### Tiered review with AI-only merges for low-risk classes

* Good, because it directs human attention where risk concentrates and relieves the
  bottleneck.
* Bad, because defining "low-risk" *before any code exists* is guesswork; a wrong tier
  boundary silently waives the only human gate.
* Bad, because tier policing itself needs machinery (path rules, labels, exceptions) that
  the bootstrap stage does not yet justify. Deferred, not rejected — a superseding record
  with throughput data is the expected path.

### No recorded policy

* Good, because zero process cost now.
* Bad, because the de-facto policy then lives in unversioned repository settings, invisible
  to the corpus — and the agent-self-approval question remains formally open.

## More Information

Builds on **0011** (the PR flow this gates), **0010** (branch protection as the
enforcement point), **0046** (agent role; PR attribution deliberately left to the project). **0048** defines the AI first
pass this record explicitly subordinates to human approval. Revisit with a superseding
record when review-throughput data exists to support a tiered model, or if team size
changes the review economics.

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# AI code review as an advisory PR check grounded in the ADR corpus

## Context and Problem Statement

The CI gate (**0010**) enforces the *mechanical* layer: types (**0003**), lint/format
(**0006**), build, tests and coverage (**0008**). But most of the corpus's conventions are
*semantic* and currently enforced only by human review: server state must not be mirrored
into Zustand (**0026**), data access goes through RLS-scoped clients and never a privileged
client in request paths (**0013**), Zod is the single validation authority (**0017**),
stories are CSF 3 only (**0036**), optimistic UI is the default unless objectively excluded
(**0025**). The corpus philosophy (**0003**) is to put the cheapest feedback loop first.
Between the compiler and the human reviewer there is an unoccupied middle layer: a reviewer
that reads the diff *against the recorded decisions*. Should the project add an AI review
pass to CI, and if so with what authority?

## Decision Drivers

* **Cheapest-feedback-first** — semantic convention violations should surface before human
  review, not during it (**0003**'s reasoning extended one layer up).
* **The corpus as normative base** — the accepted records of explicit, citable conventions are
  exactly the grounding an AI reviewer needs to produce precise, non-generic findings.
* **The gate must stay deterministic** — **0010**'s required checks are reproducible;
  a probabilistic check that can false-positive must not block merges.
* **Human review remains the gate** — per **0047**, nothing substitutes for human approval.
* **Reviewer attention** — pre-flagging convention violations lets the human spend judgment
  on design and intent rather than rule-checking.

## Considered Options

* An advisory (non-blocking) AI review job in CI that comments on PRs, instructed to check
  the diff against the ADR corpus and cite record numbers
* A blocking AI review gate among required status checks
* No CI AI review — IDE-level AI assistance only

## Decision Outcome

Chosen option: "advisory AI review job grounded in the ADR corpus", because it adds the
missing semantic feedback layer at the right authority level: visible, early, and citable,
but unable to block a merge on a false positive. A CI job (an AI review action via the
provider-agnostic client of **0075**) runs on pull requests, receives the diff plus the ADR index, and posts a review
comment. Findings must **cite the violated record by number** ("privileged Supabase client
in a request path — see **0013**") — uncitable findings are styled as questions, not
violations. The job is **not** a required status check; the human reviewer (**0047**)
weighs its output. Prompting is tuned for precision over recall: a quiet check that is
right builds trust, a noisy one gets ignored.

### Consequences

* Good, because convention violations surface minutes after push with a pointer to the
  governing record, before any human reads the diff.
* Good, because the corpus becomes *operational* — every recorded decision now has a
  reviewer that has actually read it, increasing the return on ADR authoring.
* Good, because human review time shifts from rule-checking toward design judgment.
* Bad, because each PR run costs tokens and minutes, and the job depends on an external
  model API — an availability and pricing surface CI did not previously have.
* Bad, because false positives are inevitable; if precision is not actively maintained the
  comments become noise reviewers learn to skip (mitigated by advisory status and the
  citation requirement).
* Bad, because the model needs the corpus in context — as the corpus grows, the job needs a
  retrieval/summarization strategy, which is maintenance.

### Confirmation

The CI workflow contains the AI review job triggered on PRs; it is absent from the required
status checks in branch protection (**0010**, **0047**); sampled PR comments show findings
citing ADR numbers; the API credential is supplied by env-reference per **0044**/**0018**,
never committed.

## Pros and Cons of the Options

### Advisory AI review job grounded in the corpus (chosen)

* Good, because semantic feedback arrives early, cheaply, and with normative citations.
* Good, because advisory status makes false positives an annoyance, not an outage.
* Neutral, because its value tracks the quality of the corpus — which this project already
  invests in heavily.
* Bad, because it adds an external-API dependency and a recurring cost to CI.

### Blocking AI review gate

* Good, because violations could not be merged even if the human reviewer misses them.
* Bad, because a probabilistic check among required checks makes merges hostage to false
  positives and model drift — breaking **0010**'s local/CI parity and determinism.
* Bad, because override machinery (waiver labels, force paths) would grow around it,
  adding process for marginal gain over advisory + human gate.

### No CI AI review (IDE-only assistance)

* Good, because zero CI cost and no new dependency.
* Bad, because feedback quality then depends on each contributor's local setup — nothing
  guarantees the diff was ever checked against the corpus before human review.
* Bad, because it leaves the semantic layer entirely on the human reviewer, the scarcest
  resource.

## More Information

Subordinate to **0047** (human approval is the gate); builds on **0010** (the CI it runs
in), **0044** (credential handling), **0046** (the agent context this reviews), and the
convention records it enforces (**0013**, **0017**, **0025**, **0026**, **0036**, among
others). Related: **0049** applies AI to CI *failures*; **0054** applies the same
corpus-grounded checking to the whole repo on a schedule. Revisit if precision proves
unmaintainable or if cost grows disproportionate to caught issues.

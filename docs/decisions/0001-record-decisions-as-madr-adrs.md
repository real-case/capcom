---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Record architectural decisions as MADR-format ADRs under docs/decisions/

## Context and Problem Statement

The project is at its bootstrap stage: no application code exists yet, and much of the
building is done by an AI coding agent rather than only by humans. For that work to stay
coherent, architectural decisions need to be captured *before* code comes to depend on
them, in a form an agent can reliably retrieve and cite later.

Without such a record, the rationale behind a decision lives only in commit messages, PR
descriptions, or prose that mutates over time — so an agent (or a human returning months
later) re-litigates settled questions, silently contradicts past choices, or re-explores
options that were already considered and rejected. How should this project record its
architectural decisions so that the *reasoning* — not just the outcome — is durable,
referenceable, and auditable?

## Decision Drivers

* **Agentic coding efficiency** — an AI agent needs stable, referenceable context (e.g.
  "per ADR-NNNN") and an explicit record of the roads not taken, so it does not
  re-propose rejected options or contradict prior decisions.
* **Decisions captured before code locks them in** — the record must exist at decision
  time, not be reconstructed after implementation.
* **Auditable reasoning, not just outcomes** — the *why*, the alternatives, and the
  trade-offs matter as much as the choice itself.
* **Low-friction, tooling-backed workflow** — numbering and indexing should be
  scriptable so the practice is cheap enough to actually sustain.

## Considered Options

* No formal records — rationale lives in commit messages, PR descriptions, and `CLAUDE.md` prose
* A single running design-doc / wiki page
* Nygard-style lightweight ADRs (context, decision, status, consequences)
* MADR full template, one numbered file per decision under `docs/decisions/`

## Decision Outcome

Chosen option: "MADR full template, one numbered file per decision under
`docs/decisions/`", because it is the only option that forces the *trade-off* context an
agent needs — at least two options with per-option pros and cons plus consequences — and
backs each decision with a permanent numeric ID for stable cross-reference. It is a
recognized standard, ships with the conventional `docs/decisions/` path, and the
project's `adr` skill, `adr.py` script, and review command already implement it, keeping
the per-decision cost low.

### Consequences

* Good, because the *reasoning* behind every decision — including the rejected
  alternatives — is durable and retrievable, which is precisely the context that keeps
  agentic coding efficient.
* Good, because permanent zero-padded IDs (`0001`, `0002`, …) give commits, PRs, and
  other ADRs a stable thing to reference that never changes, even under supersession.
* Good, because the supersede-don't-edit rule preserves the trail of "we believed X,
  then learned Y and changed course," which is often more valuable than either decision
  alone.
* Bad, because each decision carries authoring overhead — the full template is heavier
  than a minimal one and asks for options, pros/cons, and consequences every time.
* Bad, because the practice requires discipline to apply only to decisions that are
  costly to reverse; an ADR per trivial choice would bury the records that matter.

### Confirmation

Compliance is largely mechanized by the bundled `adr` tooling:

* `python .claude/skills/adr/scripts/adr.py next` enforces sequential, zero-padded IDs.
* `python .claude/skills/adr/scripts/adr.py index` regenerates `docs/decisions/README.md`
  from each record's frontmatter, so the index never drifts from the actual files.
* `python .claude/skills/adr/scripts/adr.py lint` (the `adr-audit` skill) checks
  numbering, references, required sections, and index freshness across the corpus.
* The `app.adr-review` command validates a record against the MADR full template and
  auto-applies structural corrections; it never sets `accepted` — that transition is
  human-confirmed via the `adr-accept` skill.
* Reversals are confirmed structurally via paired `supersedes NNNN` / `superseded by
  NNNN` links rather than in-place edits, so the immutable trail is observable.

## Pros and Cons of the Options

### No formal records — rationale in commits / PRs / CLAUDE.md prose

* Good, because it has zero process overhead and nothing new to learn.
* Neutral, because some rationale does survive in commit and PR history.
* Bad, because the reasoning is scattered across many artifacts with no stable
  per-decision anchor, so an agent cannot reliably retrieve "why we chose X."
* Bad, because `CLAUDE.md` prose is mutable and gets rewritten, erasing the original
  rationale instead of preserving a superseding trail.

### A single running design-doc / wiki page

* Good, because everything lives in one place that is easy to skim.
* Neutral, because it imposes some structure, but no enforced per-decision shape.
* Bad, because a single mutable document has no permanent IDs to cite and no record of
  what changed when, so an agent cannot trust that a given rationale still holds.
* Bad, because it becomes a merge and churn bottleneck as decisions accumulate.

### Nygard-style lightweight ADRs

* Good, because it is low-overhead and still gives one immutable, numbered file per
  decision.
* Good, because it captures context, decision, status, and consequences.
* Bad, because it omits an explicit per-option pros/cons comparison — the very
  "roads not taken" context that stops an agent from re-proposing a rejected option.

### MADR full template under docs/decisions/ (chosen)

* Good, because it forces ≥2 considered options with per-option pros and cons, making the
  trade-offs auditable rather than implicit.
* Good, because permanent numeric IDs and the supersede-don't-edit lifecycle give stable,
  referenceable, immutable records.
* Good, because it is a recognized standard with a conventional path and is already
  backed by this project's `adr` skill, `adr.py` script, and review command.
* Bad, because the richer template is more work to author per decision than a minimal
  one.

## More Information

This is a self-referential, foundational decision: it records the project's adoption of
ADRs as the practice for capturing architectural decisions, the MADR full-template format,
and the `docs/decisions/` location. The governing process is summarized in the
"ADR Process" section of `CLAUDE.md`, and the mechanics live in the `adr` skill
(`.claude/skills/adr/`) and its sibling skills (`adr-accept`, `adr-audit`,
`adr-coverage`, `adr-supersede`, `adr-sync-claude-md`). Externally fixed,
client-mandated stack choices are recorded not as ADRs but as `CON-00x` rows in
`docs/decisions/constraints.md`. The decision should be revisited if the authoring
overhead of the full template proves to outweigh its value in practice — in which case a
superseding ADR (for example, adopting the MADR minimal template) would record the change
rather than an in-place edit of this record.

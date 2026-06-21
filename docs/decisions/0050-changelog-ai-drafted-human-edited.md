---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Release notes: AI-drafted changelog from merge history, human-edited before release

## Context and Problem Statement

The git workflow (**0011**) promotes `dev` to `main` for production releases, but the
corpus records no release-notes or changelog process — a gap, since nothing currently
turns a release into a human-readable account of what changed. The classic mechanical
answer (Conventional Commits feeding a changelog generator) presupposes a commit-message
convention that no record mandates, and much of the history is agent-authored (**0046**)
with PR descriptions of varying granularity. How does this project produce a changelog?

## Decision Drivers

* **A changelog should exist** — releases to `main` (**0011**) need an auditable,
  readable record of what shipped, for the same reasons decisions need ADRs (**0001**).
* **No retroactive discipline** — a process that requires every past and future commit to
  follow a message grammar is fragile at bootstrap and unenforced by any record.
* **Cheap to sustain** — per **0001**'s reasoning, a practice survives only if its
  per-use cost is low; release-notes authoring is exactly the kind of toil that gets
  skipped under pressure.
* **Human voice for human readers** — release notes are outward-facing prose; the final
  text needs an accountable editor.

## Considered Options

* AI-drafted changelog generated from the `dev → main` merge history (commits + PR
  descriptions), human-edited and committed before release
* Conventional Commits convention plus a mechanical changelog generator
* Manually authored changelog
* No changelog

## Decision Outcome

Chosen option: "AI-drafted, human-edited changelog", because it produces release notes
from the history that actually exists — without first legislating a commit grammar — and
keeps a human accountable for the published text. At release time (promotion of `dev` to
`main`, **0011**), an AI pass reads the merge history and PR descriptions since the last
release and drafts a categorized changelog entry (features, fixes, breaking changes,
dependencies); a human edits and commits it to `CHANGELOG.md` as part of the release PR.
This record does **not** preclude a later ADR adopting Conventional Commits — such a
convention would *sharpen* the draft's raw material, not replace this process.

### Consequences

* Good, because releases get readable notes at near-zero marginal authoring cost, so the
  practice will actually be sustained.
* Good, because no new authoring discipline is imposed on commits — agent and human
  history as-is is sufficient input.
* Good, because the human edit step keeps an accountable voice on outward-facing text
  (consistent with the human gates in **0046**/**0047**).
* Bad, because draft quality is bounded by commit/PR description quality — sloppy history
  in, vague notes out; the edit step absorbs the variance.
* Bad, because it is one more AI invocation in the release path, with the same external-API
  dependency noted in **0048**.

### Confirmation

At the first `dev → main` release, `CHANGELOG.md` is created and thereafter gains an entry with
every release PR; the entry is part of the reviewed release PR (human-edited per **0047**);
drafting tooling (`scripts/ai/changelog.mjs`) reads history rather than requiring
annotated commits.

## Pros and Cons of the Options

### AI-drafted, human-edited changelog (chosen)

* Good, because it works on unstructured history and costs minutes per release.
* Good, because the human editor catches misclassifications and tunes the audience voice.
* Neutral, because quality tracks PR-description hygiene, which review (**0047**) already
  encourages.
* Bad, because it is non-deterministic — two runs draft differently; the committed, edited
  text is the canonical artifact, not the draft.

### Conventional Commits + mechanical generator

* Good, because deterministic, tooling-rich, and zero-AI-cost per release.
* Bad, because it mandates a commit grammar no record currently requires, adds lint
  machinery for messages, and misfits agent-authored histories where the PR — not the
  commit — is the meaningful unit.
* Bad, because mechanical output is notoriously reader-hostile without editing anyway —
  the human step does not disappear.

### Manually authored changelog

* Good, because maximal editorial control.
* Bad, because it is recurring toil with no draft to start from — the kind of practice
  that silently stops happening (**0001**'s sustainability argument).

### No changelog

* Good, because zero cost.
* Bad, because "what shipped when" then lives only in git archaeology, failing the
  auditability standard the corpus applies everywhere else.

## More Information

Builds on **0011** (the release flow this documents) and **0046**/**0047** (the agent role
and the human edit gate). A future Conventional Commits ADR would feed this process, not
supersede it. Revisit if release cadence or audience (public users vs. internal) changes
the editorial requirements materially.

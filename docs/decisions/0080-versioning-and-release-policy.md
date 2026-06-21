---
status: "accepted"
date: 2026-06-21
decision-makers: Yurii Anichkin
---

# Versioning and release policy: template-adapted SemVer with dev→main tagged releases

## Context and Problem Statement

The corpus records the branch and promotion flow (**0011**) and the changelog process
(**0050**), but nothing fixes what a version *number* means, when a release is cut, or
how it is tagged. This matters now because the project is being prepared for a public
release and needs an auditable, referenceable notion of "what shipped, and when".

Two facts complicate the obvious answer. First, this is a **template**, not a library or
an application: it is `"private": true`, never published to npm, and consumers adopt it by
cloning / "Use this template" / `degit` rather than by depending on it as a package — so
SemVer's dependency-API contract has no direct analogue here. Second, at public launch the
git history will be **squashed to a single commit** with `dev` and `main` identical and no
prior tags, so the genesis release cannot be machine-derived from merge history (**0050**'s
AI draft would have nothing to read). What versioning scheme, what bump semantics, and what
release ritual should this project use — including the cold-start case?

## Decision Drivers

* **Auditability** — a release needs an identifiable, referenceable point, for the same
  reason decisions need ADRs (**0001**).
* **Honest signal to adopters who track upstream** — with no npm semver-range to protect a
  consumer, the version number itself must communicate how much migration work pulling an
  upgrade implies.
* **Map to the project's native unit of change** — the corpus already treats the ADR, and
  in particular a *superseding* ADR (**0001**), as the atom of architectural change; the
  version policy should ride that rather than invent a parallel taxonomy.
* **Cheap to sustain** — per the sustainability argument in **0001**/**0050**, the release
  ritual must reuse the existing `dev → main` + AI-changelog machinery and add no heavy
  tooling, or it will be skipped under pressure.
* **Cold-start correctness** — the policy must define the genesis release after the history
  squash, not assume a populated history.
* **Human accountability for outward-facing artifacts** — release notes and tags are public
  prose; a human edits and approves them (**0046**/**0047**/**0050**).

## Considered Options

* Template-adapted SemVer (ADR-mapped bump semantics) + `dev → main` tagged releases
* Plain SemVer with standard library/dependency semantics
* CalVer (e.g. `2026.06`)
* No formal versioning — rely on git SHAs / a moving `main`

## Decision Outcome

Chosen option: **template-adapted SemVer with `dev → main` tagged releases**, because it
gives adopters a meaningful migration-cost signal without pretending to a dependency
contract the template does not have, derives bump decisions from the ADR records the
project already keeps, and reuses the existing promotion and changelog machinery so the
per-release cost stays low.

**Format and axis.** Versions are `MAJOR.MINOR.PATCH`. Because there is no programmatic API
and no npm consumer, the axis is redefined as **migration cost for an adopter who tracks
upstream**:

* **MAJOR** — a change that would force migration work in an existing fork: the reversal of
  an accepted decision (expressed as a *superseding* ADR, **0001**), a structural
  restructuring, the removal or rename of a gate / npm script / skill, or dropping a Node or
  Next.js major. *Heuristic: a superseding ADR is a MAJOR by default.*
* **MINOR** — an additive, backward-compatible capability: a new accepted ADR that adds a
  gate / skill / script, a new component kit, a new locale.
* **PATCH** — no contract change: dependency bumps within range, documentation fixes, a gate
  bugfix, a typo.

**Pre-stability.** The project stays on `0.x` until the governance surface (the ADR corpus,
the gates, the scripts, the skills) is stable enough to commit to documenting migrations
between majors; `1.0.0` is cut at that point. Genesis ships `0.1.0`.

**Release flow** (rides **0011**): a `dev → main` release PR bumps `version` in
`package.json`, carries the CHANGELOG entry drafted per **0050**, and is human-merged
(**0046**). After the merge, `main` HEAD is tagged with an **annotated** `vX.Y.Z`, and a
GitHub Release is published with that CHANGELOG section as its body. The git tag + GitHub
Release + CHANGELOG entry are the release artifacts; `"private": true` is retained
permanently and nothing is published to npm.

**Genesis exception.** At public launch the history is squashed to one commit, `dev` equals
`main`, and there are no prior tags. The first CHANGELOG entry (`0.1.0`) is therefore
**hand-authored** as a baseline description of what the template ships — it is *not*
machine-derived, because the **0050** AI draft has no merge history to read; this is exactly
the human-edited path that record anticipated. The `v0.1.0` tag is placed on the genesis
commit.

### Consequences

* Good, because the version number carries real meaning for adopters (migration cost)
  despite the absence of an npm contract.
* Good, because the bump decision is near-mechanical: it tracks whether the release's ADRs
  are additive (MINOR) or superseding/structural (MAJOR), which the corpus already records.
* Good, because it reuses **0011** and **0050** and adds no mandatory tooling, so the ritual
  is cheap enough to be sustained.
* Good, because the genesis case is defined, so the history squash does not leave the first
  release undefined.
* Bad, because the MAJOR/MINOR call is a judgment ("does this force migration?") that needs a
  human at the release PR; the supersede-is-MAJOR heuristic absorbs most of the variance.
* Bad, because redefining SemVer's axes departs from a reader's default expectation; this is
  mitigated by stating the redefinition here, in `RELEASING.md`, and atop `CHANGELOG.md`.
* Bad, because tagging is a manual human step today with no automation; a future ADR may add
  a release workflow, which would inherit the SHA-pinning constraint (**0070**).

### Confirmation

* `package.json`'s `version` is bumped in every `dev → main` release PR and matches both the
  published annotated tag `vX.Y.Z` and the top entry of `CHANGELOG.md`.
* Every release after genesis has an annotated tag and a GitHub Release whose body is the
  corresponding CHANGELOG section.
* The genesis release is `v0.1.0`, tagged on the single squashed commit, with a hand-authored
  CHANGELOG baseline entry rather than a **0050** AI draft.
* Promotion and tagging remain human actions (**0046**). This record adds no automated fitness
  function — compliance is checked at the human-reviewed release PR (**0047**); a
  CHANGELOG-presence / version-tag-match gate may graduate into a check later if release
  cadence justifies it.

## Pros and Cons of the Options

### Template-adapted SemVer + `dev → main` tagged releases (chosen)

* Good, because it keeps the familiar `MAJOR.MINOR.PATCH` shape while honestly redefining the
  axis for a fork-adopted template.
* Good, because bump semantics are anchored to the ADR lifecycle (especially supersession),
  so the version follows from records that already exist.
* Good, because it layers onto the existing promotion (**0011**) and changelog (**0050**)
  flow instead of adding a parallel process.
* Neutral, because it still requires a human judgment for the MAJOR/MINOR boundary —
  acceptable given the human release gate (**0046**/**0047**) is already mandatory.
* Bad, because the redefined axis must be documented or it will be misread as standard SemVer.

### Plain SemVer with standard library/dependency semantics

* Good, because it is the most widely understood scheme and needs no explanation.
* Bad, because its core promise ("a non-breaking change is safe to auto-upgrade within a
  range") is meaningless for a template nobody installs as a dependency — it would imply a
  contract that does not exist.
* Bad, because "breaking change" has no programmatic referent here, so the bump rule would be
  vague exactly where the chosen option is concrete (forces-a-fork-migration / superseding
  ADR).

### CalVer (e.g. `2026.06`)

* Good, because dates are unambiguous and trivially ordered, and suit time-boxed snapshot
  distributions.
* Bad, because the version then says *when* a snapshot was cut but nothing about *how
  disruptive* upgrading is — which is the single most useful signal for an upstream-tracking
  adopter.
* Bad, because it does not connect to the ADR unit of change, losing the near-mechanical bump
  rule the chosen option gains.

### No formal versioning (git SHAs / moving `main`)

* Good, because it is zero-cost and zero-ceremony.
* Bad, because "what shipped when" then lives only in git archaeology, failing the
  auditability standard the corpus applies everywhere else (**0001**) — the same objection
  **0050** raised against having no changelog.
* Bad, because adopters have no stable point to pin to or to describe in an issue report.

## More Information

Builds on **0009** (production deploys from `main`, preview per PR), **0011** (the
`dev → main` promotion and protected branches this release flow rides), **0050** (the
AI-drafted, human-edited `CHANGELOG.md` whose genesis path this record makes explicit),
**0046**/**0047** (the human promotion and review gates), **0072** (Conventional Commits,
which sharpen the **0050** draft for post-genesis releases), and **0001** (supersession as
the change atom, and the sustainability argument for a low-cost ritual).

`CHANGELOG.md` follows the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format;
tags are annotated `vX.Y.Z`.

Revisit this decision when: cutting `1.0.0`; if the template is ever distributed as an npm
package (which would restore standard SemVer semantics and supersede this record); or if
release cadence justifies automating the tag / GitHub Release step (a release-workflow ADR,
subject to the **0070** SHA-pinning constraint).

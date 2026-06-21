---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Enforce Conventional Commits with commitlint

## Context and Problem Statement

The repository already writes Conventional Commits by **convention** — the history is
`feat(scope): …` / `fix` / `chore` / `docs(ci): …`, and the `git-commit` skill drafts that
format. But nothing **enforces** it: the git-workflow record (**0011**) fixes the branch
model, not the message format, and commit/PR attribution conventions are explicitly left to
the consuming project (**0046**). The AI-drafted changelog (**0050**) parses merge history
and assumes the format; an unconventional message degrades it silently. The format is a
load-bearing, unenforced assumption.

## Decision Drivers

* **Machine-readable history** — Conventional Commits is the contract the changelog (0050)
  and any future release automation depend on.
* **Consistency without friction** — enforce shape (`type(scope): subject`), not prose
  quality.
* **Enforce on the PR, not rewrite history** — lint only the incoming commit range; never
  touch merge commits or past history.
* **No new runtime surface** — a dev-only tool, like the other quality gates.

## Considered Options

* **commitlint** (`@commitlint/cli` + `@commitlint/config-conventional`) over the PR's
  commit range in CI.
* **A bespoke regex CI check** on commit subjects.
* **None** — keep the convention unenforced.

## Decision Outcome

Chosen option: "commitlint with config-conventional", because it is the standard, precise
implementation of the exact grammar the changelog assumes, far more robust than a regex. A
`commitlint.config.mjs` extends `@commitlint/config-conventional`; CI lints the PR's commit
range (`--from <base> --to HEAD`), failing on a malformed message. Merge commits are ignored
(config-conventional's default), so PR-merge commits never trip it. It is a **blocking** CI
step but scoped to *new* commits only — history is never rewritten. This records, at last,
the commit format that 0050 already relies on.

### Consequences

* Good, because the changelog (0050) and any future semantic-release / automation get a
  guaranteed-parseable history.
* Good, because contributors (human or agent) get an immediate, precise failure on a
  malformed message instead of silent downstream degradation.
* Bad, because it adds two devDependencies and can reject a hasty message — mitigated by the
  `git-commit` skill already producing conforming messages.
* Bad, because squash-merge subjects are authored at merge time in the GitHub UI (outside
  this PR-range lint); enforcing those is a separate 👤 repo setting, noted not solved here.

### Confirmation

`commitlint.config.mjs` + the `@commitlint/*` devDependencies exist; a CI step lints the
PR's commit range and fails on a non-conforming message; the current branch history
conforms. Squash-merge title enforcement is acknowledged as a separate branch-protection
setting.

## Pros and Cons of the Options

### commitlint + config-conventional (chosen)

* Good, because it is the canonical, exact implementation of the grammar 0050 assumes.
* Good, because range-scoped and merge-aware — no history rewrites, no merge-commit noise.
* Bad, because two devDependencies and a possible rejected message on a typo.

### Bespoke regex check

* Good, because zero dependencies.
* Bad, because re-deriving the Conventional Commits grammar (scopes, breaking-change `!`,
  footers) in regex is fragile and will diverge from what the changelog parser expects.

### None

* Good, because nothing to maintain.
* Bad, because the format stays an unenforced assumption that the changelog (0050) silently
  depends on.

## More Information

Records the commit format assumed by the changelog automation (**0050**); complements the
git workflow of **0011** (branch model) and the project-owned attribution stance of
**0046** (this gates *shape*, not attribution). Squash-merge title enforcement is a 👤
branch-protection follow-up.

---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Claude Code hooks as the edit-time enforcement layer

## Context and Problem Statement

The repository's defense-in-depth model (`AI-GUARDRAILS.md`) names three layers — structural
(recall), deterministic (CI, precision), and human judgment. But there is a fire-point closer
to the keystroke than any of them: the instant the agent *writes a file*. Many rules the agent
must obey are "never edit X", "X is human-only", or "after editing Y, regenerate Z" — encoded
as CLAUDE.md prose. Prose relies on the agent remembering the rule mid-edit, and a violation
(editing an accepted ADR, writing a secret, introducing a raw token value) is otherwise caught
only minutes later in CI, or never if no gate covers it.

This record decides whether edit-time rules are enforced **mechanically at the write**, and by
what mechanism. The hooks already ship under `scripts/hooks/`; until now they ran without a
covering record.

## Decision Drivers

* **Shorten the loop** — catch a violation the moment it is written, not in CI, so the agent
  self-corrects before moving on.
* **Make "human-only" / "immutable" deterministic** — turn honor-system prose (**0001** / **0046**)
  into a block the agent cannot talk itself past.
* **Fail open** — a buggy or mis-fed hook must never brick the session; the cost of a missed
  block is one CI cycle, the cost of a wedged session is the whole loop.
* **Do not duplicate CI** — hooks shorten the loop; the CI gate (**0010**) stays the guarantee.

## Considered Options

* **Claude Code hooks** — a PreToolUse guard plus a PostToolUse checker, registered in
  `.claude/settings.json`
* **CLAUDE.md prose + CI only** — no edit-time mechanism; rely on the agent reading rules and
  the CI backstop
* **A git pre-commit hook only** — enforce at commit time rather than at the edit

## Decision Outcome

Chosen option: "Claude Code hooks", because they are the only mechanism that fires *inside the
agent's edit loop* — early enough to redirect the next action, not just fail the PR. Two hooks:

* **PreToolUse — `scripts/hooks/guard-protected-files.mjs`** (matches `Write|Edit|NotebookEdit|Bash`).
  Exits 2 with a reason (block) or 0 (allow). Blocks: in-place edits to an **accepted** ADR
  (**0001**), `constraints.md` (**0046**), real secrets files (**0018**), `tailwind.config.*`
  (**0032**), snapshot baselines and `vitest -u` (**0040**). It carries a documented, out-of-band
  **template-maintenance waiver** for the accepted-ADR clause only (a git-ignored `.adr-edit-waiver`
  sentinel or `CLAUDE_ADR_EDIT_WAIVER=1`), so this template's own maintainer can fix an accepted
  record in place rather than supersede it over a typo; the shipped default blocks, every bypass
  is logged, and the waiver relaxes no other clause.
* **PostToolUse — `scripts/hooks/post-edit-checks.mjs`** (matches `Write|Edit`). Runs
  `prettier --write`, then for `src/components/**` runs the scoped token ESLint gate (**0058**)
  and exits 2 on a violation; emits non-blocking `gen:tokens` / `gen:types` drift nudges and a
  scoped `check:design-intent` (**0062**) hint where a red mid-scaffold is expected.

Both hooks **fail open** on any unexpected error.

### Consequences

* Good, because a forbidden write or a raw-token violation is caught at the keystroke, with a
  message the agent acts on immediately.
* Good, because immutability and human-only rules become a mechanical block, not a request the
  agent is trusted to honor.
* Good, because the post-edit token gate runs the *same* ESLint rule CI runs, so green-here
  trends toward green-in-CI.
* Bad, because hooks are Claude-Code-specific — a different harness runs none of them, so CI
  must remain the portable guarantee, never these hooks.
* Bad, because a hook bug could interfere with editing; mitigated by the fail-open contract and
  the narrow, tested matchers.

### Confirmation

`.claude/settings.json` registers both hooks. `guard-protected-files.mjs` blocks a planted
forbidden write (e.g. an Edit to an accepted ADR with no waiver → exit 2) and allows an ordinary
file; with the waiver present it allows the accepted-ADR edit, logs the bypass, and still blocks
`constraints.md`. `post-edit-checks.mjs` exits 2 on a component edit that introduces a raw hex
value and is a no-op on a clean edit. Both exit 0 on a malformed payload (fail-open). These
behaviors are self-testable by piping a sample hook payload to each script.

## Pros and Cons of the Options

### Claude Code hooks (chosen)

* Good, because they fire inside the edit loop — the earliest point a rule can redirect the agent.
* Good, because they reuse the existing `check:*` / ESLint machinery rather than a second engine.
* Neutral, because they are harness-specific; CI carries the portable guarantee regardless.
* Bad, because a hook defect can disrupt edits if it does not fail open.

### CLAUDE.md prose + CI only

* Good, because it is zero extra machinery and fully portable.
* Bad, because "never edit an accepted ADR" stays honor-system at edit time, and feedback on a
  token violation arrives a full CI cycle later — the slow, skippable loop the hooks close.

### Git pre-commit hook only

* Good, because it is harness-independent and catches issues before they are committed.
* Bad, because it fires after a whole batch of edits, not per write, and the agent often never
  reaches a commit in a single loop — too late and too coarse to redirect the next action.

## More Information

This is the **edit-time** layer of `AI-GUARDRAILS.md` §3/§5. The rules the hooks enforce are
owned by other records — **0001** (ADR immutability), **0018** (secrets), **0032** (no Tailwind
config), **0040** (snapshot baselines), **0046** (human-only actions), **0058** (the token gate),
**0062** (design-intent) — this record decides only that they are enforced *at the write, by
hooks*. The CI gate (**0010**) remains the guarantee; the hooks only shorten the loop. The
edit-in-place waiver this hook implements is the template-maintenance complement to **0001**'s
immutability rule.

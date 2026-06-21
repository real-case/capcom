---
name: adr-sync-claude-md
description: >-
  Regenerate the CLAUDE.md Stack / Commands / Conventions / Restrictions sections
  from the ACCEPTED ADRs, so project memory tracks the decision record instead of
  drifting from it. Use at the Phase-3 bootstrap transition, after a batch of ADRs
  is accepted, or when CLAUDE.md and the decisions disagree.
disable-model-invocation: true
---

# Sync CLAUDE.md from the ADRs

`CLAUDE.md` marks its **Stack / Commands / Conventions / Restrictions** sections
as *Phase-3 placeholders* to be filled "after project initialization" — and the
ADRs are the source those sections must be derived from. This skill performs that
derivation so the project's operating memory stays faithful to the decisions. It
writes `CLAUDE.md`, so it is user-invocable only and always shows a diff before
saving.

## The cardinal rule: accepted only

Only **accepted** ADRs are binding. Proposed records are still provisional and
must **not** drive CLAUDE.md. During bootstrap most records are still `proposed`,
so the synthesized sections will be intentionally sparse — that is correct, not a
bug. State plainly which decisions were skipped because they are not yet accepted.

## Workflow

1. **List accepted records:**

   ```bash
   grep -L 'status: "accepted"' /dev/null; \
   for f in docs/decisions/[0-9]*.md; do \
     grep -q 'status: "accepted"' "$f" && echo "$f"; done
   ```

   (Run `adr-audit` first; refuse to proceed if the corpus has errors.)
2. **Extract the decided constraint** from each accepted record's
   `# title` and `## Decision Outcome` — the tool/version chosen and any rule it
   implies. Cite the ADR number for every line you add.
3. **Synthesize into the four sections:**
   - **Stack** — chosen libraries/platforms/runtimes (e.g. framework, language
     mode, datastore, hosting), each tagged with its ADR number.
   - **Commands** — concrete commands implied by tooling ADRs (test, lint,
     migrate, dev), only where an accepted ADR fixes them.
   - **Conventions** — defaults the records establish (e.g. rendering default,
     validation source of truth, styling approach).
   - **Restrictions** — prohibitions the records imply (e.g. disallowed escape
     hatches, runtime patterns ruled out, scope boundaries).
4. **Never invent.** If a section has no accepted decisions yet, leave it with a
   one-line "No accepted decision yet — see proposed ADRs NNNN, MMMM." rather than
   guessing a stack.
5. **Show the diff and confirm** with the user before writing `CLAUDE.md`. Do not
   touch the authoritative `ADR Process` section or the bootstrap preamble.

## Report

List which ADRs fed each section, and which were skipped as still-proposed, so the
user knows exactly how complete the synthesis is and what accepting more records
would add.

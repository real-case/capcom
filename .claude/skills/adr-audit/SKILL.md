---
name: adr-audit
description: >-
  Audit the whole docs/decisions ADR corpus for integrity — dangling ADR/CON
  cross-references, a stale index, numbering gaps or duplicates, broken supersede
  links, unfilled template placeholders, and invalid status values. Read-only:
  reports errors and warnings, changes nothing. Use whenever asked to "check the
  ADRs", "audit/lint the decision records", "are the ADR cross-references valid",
  or as a pre-flight before accepting or superseding a record.
---

# Audit the ADR corpus

`app.adr-review` reviews **one** record in depth. This skill is the complement: a
fast, deterministic sweep of the **whole** `docs/decisions/` graph, which matters
here because the corpus is densely cross-linked (hundreds of `**NNNN**` and
`CON-00x` references) and a single rename or typo can silently orphan a reference.

It is **read-only** — it never edits a record. All checks live in `adr.py` so they
cannot drift from the files on disk.

## Run it

```bash
python .claude/skills/adr/scripts/adr.py lint
```

Exit code `0` means no errors (warnings may still print); exit code `1` means at
least one error. The check set:

**Errors (must fix before the corpus is healthy):**
- a `**NNNN**` / `ADR-NNNN` / markdown-link reference to a number with no record
- a `CON-00x` reference not defined in `constraints.md`
- a back-link in `constraints.md` pointing at a non-existent ADR
- numbering gap or duplicate in the sequence
- missing or placeholder `status`, or a status outside the vocabulary
  (`proposed | accepted | rejected | deprecated | superseded`)
- a missing required MADR section (`Context and Problem Statement`,
  `Considered Options`, `Decision Outcome`)
- an unfilled `{…}` template placeholder left in the body
- a `superseded` record whose `superseded by NNNN` link is missing or dangling
- `README.md` index missing or stale (out of sync with the records)

**Warnings (advisory — surface, don't block):**
- a `constraints.md` back-link whose target ADR doesn't cite that constraint back
- a `superseded by NNNN` link the target record doesn't reciprocate with
  `supersedes`

## Report

Summarise the run: the error/warning counts, then each finding grouped as
**must-fix** (errors) vs **advisory** (warnings), each with the offending file.
For a stale index, the fix is one command — `python
.claude/skills/adr/scripts/adr.py index`; offer to run it. Do **not** auto-fix
record *content* here; that is the job of `app.adr-review` (one record) or the
human. This skill only reports.

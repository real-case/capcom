---
name: adr-supersede
description: >-
  Reverse a previously accepted decision the correct way — create a new ADR that
  argues the change, then wire paired supersedes / superseded-by links and flip
  the old record to superseded, regenerating the index. Never edits the old
  decision in place. Use when a settled (accepted) decision needs to be
  overturned, replaced, or revised, or the user says "supersede ADR NNNN".
disable-model-invocation: true
---

# Supersede an ADR (reverse, don't edit)

ADR **0001** establishes the rule: ADRs are an immutable trail. To overturn an
accepted decision you write a **new** record and link the two — you never rewrite
the original, because "we believed X, then learned Y and changed course" is itself
valuable history. This skill performs that link-flip safely. It is user-invocable
only, because it mutates an already-ratified record.

## Workflow

1. **Write the superseding record.** Use the `adr` skill / `app.adr-create` to
   create the new ADR. Its Context should state that it reverses ADR `NNNN` and
   why; it cites the old number.
2. **Review and accept the new record.** Run `app.adr-review MMMM`, then
   `adr-accept MMMM`. The supersede links are only valid once the replacement is
   itself accepted.
3. **Flip the old record and wire the links:**

   ```bash
   python .claude/skills/adr/scripts/adr.py supersede --old NNNN --new MMMM
   ```

   This sets the old record's status to `superseded by ADR-MMMM`, adds
   `supersedes: "ADR-NNNN"` to the new record, and regenerates the index. It
   **refuses** unless the new record is `accepted` — pass `--force` only if you
   have a deliberate reason to link to a still-proposed record.
4. **Verify:** run `adr-audit` — the paired links should resolve with no errors.

## Notes

- Both numbers are permanent IDs; superseding never renumbers anything.
- If the superseded constraint had a `constraints.md` back-link, point the
  registry's `Residual-choice ADR(s)` column at the new record by hand and re-run
  `adr-audit`.
- Report the two changed files and the regenerated index path.

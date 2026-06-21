---
name: adr-accept
description: >-
  Ratify a reviewed, proposed ADR — set its status to accepted, stamp today's
  date, and regenerate the index. This is the human acceptance gate that
  app.adr-review and CLAUDE.md deliberately refuse to perform automatically.
  Use only when a human explicitly decides to accept a specific ADR.
disable-model-invocation: true
---

# Accept an ADR (the human gate)

Per `CLAUDE.md` and `app.adr-review`, the `proposed → accepted` transition is
**human-confirmed** and is never made by an agent on its own. This skill exists so
that, once a human has decided, the mechanical change is applied consistently —
status, date, and index in one step. It is user-invocable only.

## Preconditions

Before accepting, confirm:
1. The record has been reviewed — `app.adr-review NNNN` returned
   `READY_FOR_ACCEPTANCE`.
2. The corpus is clean — `python .claude/skills/adr/scripts/adr.py lint` shows no
   errors.
3. The human invoking this skill actually intends to ratify **this** record.

## Run it

```bash
python .claude/skills/adr/scripts/adr.py accept NNNN --date "$(date +%F)"
```

The command enforces a readiness gate before it writes anything and **refuses**
(non-zero exit) if the record:
- is not currently `proposed` (already accepted → no-op; superseded/deprecated →
  refused),
- has a missing/placeholder/invalid status,
- is missing a required MADR section,
- still contains an unfilled `{…}` placeholder, or
- carries a dangling ADR/`CON` reference.

On success it sets `status: "accepted"`, sets `date`, and regenerates
`README.md`.

## After accepting

- If this ADR resolves a constraint's **residual choice**, fill its number into
  the `Residual-choice ADR(s)` column for that `CON-00x` row in
  `constraints.md` (the registry back-link is maintained by hand). Re-run
  `adr-audit` to confirm.
- If this ADR was written to **reverse** an earlier accepted decision, accepting
  it is the precondition for `adr-supersede` — run that next to flip the old
  record and wire the paired links.

Report the new status, date, and the regenerated index path.

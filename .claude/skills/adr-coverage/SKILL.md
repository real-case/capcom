---
name: adr-coverage
description: >-
  Compare the recorded ADRs against the project's adopted/planned stack and
  surface decisions not yet captured — explicitly deferred follow-ups, scope
  boundaries awaiting their own record, and gaps implied by an adopted tool.
  Read-only: produces a ranked, rationale-backed list of candidate ADRs; creates
  nothing. Use to answer "what decisions are we still missing?".
---

# ADR coverage / gap analysis

A decisions-first project benefits from knowing what has **not** been decided yet,
before code commits to an unrecorded default. This skill reads the corpus and the
constraints and proposes the ADRs that are most likely missing. It is read-only —
it recommends, it does not create records (use `app.adr-create` for that).

## Workflow

1. **Read the landscape.** Skim every record's `# title` and `## Decision
   Outcome`, plus `constraints.md`. Build a mental map of what is already decided.
2. **Harvest explicit deferrals.** Records frequently name their own follow-ups —
   find them:

   ```bash
   grep -rniE 'superseding ADR|revisit|deferred|out of scope|until a|when a concrete|baseline only|not yet|future ADR' docs/decisions/[0-9]*.md
   ```

   Each hit is a candidate: the record itself signals a decision left open.
3. **Infer adjacent gaps from adopted tools.** For each accepted/planned tool, ask
   what neighbouring decision it implies but no record covers — for example:
   - payments adopted → tax/VAT handling, refund/dunning policy
   - logging decided → observability / tracing / alerting
   - i18n library chosen → message extraction / TMS workflow
   - auth adopted → authorization roles / permission model
   - database + RLS → backup / data-retention / PII policy
   Only flag a gap when **no** existing record already covers it.
4. **Rank and explain.** Output a list, most-warranted first. Each item:
   - a proposed ADR title,
   - one line of rationale,
   - the record or tool that implies it (cite the number).

## Report

Present the ranked candidate list and a one-line summary ("N likely-missing
decisions, M of them explicitly deferred by existing records"). Do not create
ADRs; offer to start one with `app.adr-create` if the user picks any.

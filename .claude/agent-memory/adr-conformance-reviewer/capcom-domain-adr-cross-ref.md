---
name: capcom-domain-adr-cross-ref
description: CAPCOM convention — sibling ADRs proposed together in one PR cross-reference each other by descriptive phrase, not by number, until they are accepted.
metadata:
  type: project
---

In CAPCOM's domain-ADR PRs (e.g. PR-1: 0084 aggregation, 0085 ingestion, 0086 charting,
all building on accepted 0083), records proposed together in the same PR deliberately
cite each other by **descriptive phrase** ("the aggregation-strategy record", "the
ingestion-contract record", "the charting record") rather than by number.

**Why:** the `check:citations` gate requires every numeric `ADR NNNN` citation to resolve
to an existing record. A still-proposed sibling is a real file, so a numeric cite would
technically resolve — but the author's convention is to reserve numeric cites for records
that are accepted / stable, and use phrases for in-flight siblings. This keeps the corpus
honest about what is settled vs. still proposed.

**How to apply:** when reviewing a multi-ADR PR, do NOT flag a descriptive-phrase
cross-reference to a sibling as a defect — it is intentional. DO flag any numeric citation
to a record number that does not exist on disk (a true dangling reference). A record citing
its **own** number (e.g. 0084 referencing "**0084**") is a cosmetic blemish, not a gate
failure — note it as optional polish only.

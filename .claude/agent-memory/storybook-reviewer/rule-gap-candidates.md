---
name: rule-gap-candidates
description: proposed Defect Log entries where a review finding traces to a missing/ambiguous RULE, not just this diff (ADR 0064)
metadata:
  type: project
---

Candidate Defect Log entries (ADR 0064 — invariants graduate into Stage-1 checks on first
violation). Propose next free DL-NNN; a human files. Format: `docs/design-system/defect-log.md`.

**Why:** The keyboard-path gap and the keyboard-claim mismatch (see
[[antipattern-play-no-keyboard-path]], [[antipattern-keyboard-claim-vs-play]]) appeared across
nearly every interactive component in PR-12 — a pattern seen many times in one diff is a rule gap,
not a coincidence.

**How to apply:** Raise these in a story review when the same finding recurs 2+ times:

1. **Keyboard-path assertion for interactive plays.** A play on an interactive archetype
   (`interactiveArchetypes` in `scripts/check-design-intent.mjs`) should assert at least one keyboard
   interaction (`userEvent.keyboard`/`.tab`). Currently only play *presence* is gated (fitness #5).
   Candidate: extend fitness #5 to also require a keyboard event token in ≥1 play of an interactive
   archetype, OR a per-component documented rationale. Note: a linter can check token presence, not
   semantic correctness — still narrows the gap.

2. **demoRationale ↔ cited-play honesty.** When a `demoRationale` names a play and the word
   "keyboard", the cited play must contain a keyboard event. Cheap static check: parse the story name
   out of the rationale, grep that play block for `keyboard(`/`.tab(`. Falsifiable, deterministic.

**First-violation evidence:** PR-12 feat/premium-primitive-kit (2026-07-04) — combobox, tabs,
tooltip, calendar all matched both patterns.

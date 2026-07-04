---
name: antipattern-play-no-keyboard-path
description: interactive-archetype plays assert pointer (click/hover) behavior but never exercise the keyboard path axe cannot verify (ADR 0039/0052)
metadata:
  type: feedback
---

Interactive-archetype plays (`disclosure`/`navigation`/`selection-control`/`collection`) frequently
assert only the pointer path (click to open, click to select) and skip the keyboard path —
Tab-to-focus, Enter/Space to activate, Escape to dismiss + focus-return, arrow-key roving. axe
cannot see a broken keyboard path (ADR 0039/0052), so the play is the only automated proof, and its
absence is exactly the kind of "green but weak" the ADR 0042/0051 judgment pass owns.

**Why:** `check:design-intent` fitness #5 only checks play *presence* (regex `/\bplay\s*:/`), never
play *content*. So keyboard coverage is 100% a review concern, never gated.

**How to apply:** For each interactive component, read the `behavior.focusManagement` string in its
design-intent — it enumerates the keyboard contract the component promises (Escape-to-close, roving
arrows, return-focus). Then check whether ANY play asserts it. The Popover `Toggle` play is the
reference implementation: click open → assert presence → `{Escape}` → `waitFor` removal →
`toHaveFocus()` on trigger. Recommend that shape for dialog/dropdown/tooltip/tabs/combobox.

Also watch for a story COMMENT that promises keyboard behavior the play skips (dialog `WithTrigger`
comment said "Escape closes it and returns focus" but the play only opened + asserted presence).

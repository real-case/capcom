---
name: antipattern-keyboard-claim-vs-play
description: demoRationale asserting a keyboard interaction ("exercised by the X play (keyboard)") that the cited play does not actually perform (it uses click/hover)
metadata:
  type: feedback
---

Recurring anti-pattern in `*.design-intent.ts`: a `focus-visible` (or similar) state is marked
`applicable:true` with a `demoRationale` claiming the ring is "exercised by the **X** play
(keyboard …)", but play **X** uses `userEvent.click`/`.hover` only — no `Tab`/`{Enter}`/`{Escape}`/
arrow keys.

**Why:** The demoRationale is a spec record (ADR 0062). Mis-crediting a play as keyboard evidence
is dishonest about *which* artifact proves the state. The underlying component usually DOES support
the keyboard path (Radix/cmdk/react-day-picker wire it), so it is not Blocking (the state is real
and reachable) — but it is a rubber-stamp-adjacent Judgment finding, and it reliably co-occurs with
a real coverage gap (see [[antipattern-play-no-keyboard-path]]).

**How to apply:** When a demoRationale names a play AND says "keyboard", open that play and check it
actually presses keys. Grep quickly: `grep -n "keyboard" *.design-intent.ts` then diff against
`userEvent.keyboard/.tab` usage in the matching `.stories.tsx`.

**Seen (PR-12 feat/premium-primitive-kit, 2026-07-04):** combobox (Select play clicks), tabs
(Switch play clicks, rationale claims "arrow navigation"), tooltip (Reveal play hovers, rationale
claims "keyboard focus … reveals"), calendar (Interact play clicks, rationale describes arrow-key
roving). Popover was the honest exception — its Toggle play genuinely uses `{Escape}` + asserts
`toHaveFocus`.

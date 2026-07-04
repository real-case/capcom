---
name: shadcn-transitive-deps-need-adr
description: ADR 0034 authorizes the shadcn-over-Radix copy-in model but not arbitrary non-Radix runtime deps; cmdk/sonner/react-day-picker/date-fns need a decision.
metadata:
  type: project
---

When a shadcn primitive drags in a **non-Radix** third-party runtime library (e.g. `cmdk` for command/combobox, `react-day-picker` + `date-fns` for calendar/date pickers, `sonner` for toasts), that library is NOT blanket-authorized by ADR 0034.

**Why:** ADR 0034 settles the shadcn *copy-in model* and repeatedly grounds accessibility in "Radix, which shadcn wraps" — its Decision Outcome authorizes shadcn-over-Radix, and its Consequences say "No packaged component-library runtime is present." It never contemplates independent runtime deps like cmdk/sonner/react-day-picker. So whether the copy-in model implicitly blesses whatever npm packages an official shadcn block needs is a genuine interpretive question.

**How to apply:** Per CLAUDE.md ("a decision no ADR covers → record the ADR first, then implement"), flag new non-Radix runtime deps in a shadcn-kit PR under "Needs a decision first" — either a small ADR extending 0034's scope to name the sanctioned libraries, or a CON row. Do NOT treat a green gate suite as authorization: none of the check:* gates inspect package.json for un-ADR'd dependencies. Radix-backed additions (@radix-ui/*) are covered by 0034; non-Radix ones are the gap.

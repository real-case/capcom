---
name: debt-scan
description: >-
  Inventory the project's technical debt — specifically the ADR-sanctioned escape
  hatches used without their required justification. Runs check:debt: every
  eslint-disable (ADR 0003/0006), "use no memo" (ADR 0029), a11y opt-out in stories
  (ADR 0039), applicable:false design-intent state (ADR 0062), and quarantined/skipped
  test (ADR 0049) is found, checked for its mandated reason, and quarantine time-boxes
  are checked for expiry. Use before a release, during maintenance, when asked to
  "scan tech debt", "find unjustified eslint-disable", "any expired test quarantines",
  "check the escape hatches", or "/debt-scan". Plain TODO/FIXME markers are reported,
  never failed.
---

# Scan technical debt (sanctioned-escape-hatch inventory)

The ADRs don't ban every shortcut — they **allow a few, each conditional on a recorded
justification**. Debt in this project is those allowances used without their condition:
an `eslint-disable` with no `-- reason`, a `"use no memo"` with no explanation, an
`applicable:false` state with no `rationale`, a quarantined test with no tracked issue or a
**passed** time-box. This scan turns "controlled exceptions" into a managed list instead of
a silent accumulation, and feeds the Defect Log (ADR 0064).

## Run it

```bash
npm run check:debt            # report needs-attention items + a per-category summary
npm run check:debt -- --all   # also list every justified hatch and TODO/FIXME marker
npm run check:debt -- --json  # machine-readable findings
```

Exit `0` = no escape hatch is missing its justification and no quarantine has expired.
Exit `1` = at least one **unjustified** hatch or **expired** time-box — those violate the
ADR's own terms (plain markers never fail the run). Scans `src`, `app`, `e2e`, `supabase`;
skips generated files and snapshots.

## What it inventories, and the condition each ADR attaches

| Escape hatch | ADR | Required justification it checks for |
| --- | --- | --- |
| `eslint-disable` (`no-explicit-any` and general) | 0003 / 0006 | an eslint `-- reason` on the directive |
| `"use no memo"` | 0029 | a nearby comment — the compiler opt-out must be rare + documented |
| `@ts-expect-error` / `@ts-ignore` | — | a description after the directive (bare suppression is worst) |
| a11y opt-out in `*.stories.tsx` | 0039 | a stated reason beside the per-story `a11y` parameter |
| `applicable: false` in `*.design-intent.ts` | 0062 | a `rationale` on/next to the state (the P8 masked-omission) |
| `it.skip` / `describe.skip` / `.todo` (quarantine) | 0049 | a tracked issue (`#123`/URL) **and** a time-box date still in the future |

## Acting on the output

- **NEEDS** — add the missing reason/rationale/issue, or remove the escape hatch.
- **EXPIRED** — a quarantine's time-box has passed (ADR 0049: no blind retries, no
  open-ended skips); un-quarantine the test or re-justify with a new, tracked time-box.
- **info markers** (TODO/FIXME/HACK) — not a failure; triage them into the Defect Log or an
  issue when they accumulate.

A recurring unjustified pattern is a Defect Log candidate (ADR 0064) — that is how a
one-off exception graduates into a Stage-1 check.

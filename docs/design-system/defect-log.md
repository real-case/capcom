# Design-System Defect Log (ADR 0064)

A journal of **infrastructure failures** — _missing or ambiguous rules_ — not a bug
tracker of every defect. Each entry names what the rule set **did not anticipate**, so
rule decay (problem P6) is itself the tracked artifact and every gap has a defined path
back into the gates. Filling this log is a **mandatory action of the review/escalation
phase** (ADR 0064), and each wave _begins_ with a review of the accumulated entries.

## How to use

- Record an entry when a real failure traces to the **rules**, not the code: a rule that
  was never written, a rule that exists in CI but never reached the agent, a rule too
  ambiguous to apply, or a real violation no automated check catches.
- Classify the **root cause** — it determines the fix:
  - `rule-absent` → write the rule.
  - `didnt-reach-agent` → surface it in the agent rules / a skill.
  - `ambiguous` → sharpen the registry / ADR.
  - `not-auto-caught` → the rule exists (as an ADR Confirmation enforced by review) but
    nothing enforces it — **graduate** it into an executable Stage-1 check (ADR 0054).
- **Reactive growth (ADR 0064/0054):** a new invariant starts as an ADR Confirmation
  enforced by review; on its **first violation** it earns an executable check and rises
  into the Stage-1 deterministic layer. The gate set grows from evidence, not guesswork.
- "defect → rule/skill/registry" is an **owned, assigned** step, never "someday".

## Entry format

| Field           | Meaning                                                  |
| --------------- | -------------------------------------------------------- |
| ID              | `DL-NNN`, sequential.                                    |
| Area            | component / script / registry / graph.                   |
| Symptom         | what shipped (or would have) behind a green gate.        |
| Root cause      | one of the four classes above.                           |
| Fix type        | rule / skill / registry / graph-hygiene.                 |
| Graduated check | the Stage-1 check it became, if any.                     |
| Status          | `open` (tracked, time-boxed per ADR 0049) / `converted`. |

---

## Entries

_No entries yet._ This template ships an **empty journal**. Record the first entry when a
real failure traces to a **missing or ambiguous rule** (not the code), using the format
above; on its first violation an invariant graduates from a review-enforced ADR
Confirmation into an executable Stage-1 check (ADR 0064/0054).

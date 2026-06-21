---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Skills and review-subagents as the structural (recall) layer

## Context and Problem Statement

`AI-GUARDRAILS.md` §2 describes a **structural** layer whose job is *recall* — lowering the
frequency of violations inside the agent loop, as opposed to the deterministic gates that provide
*precision* and the human gates that provide *judgment*. In this repository that layer is
concrete: `.claude/skills/*` encode recurring workflows (creating an ADR, scaffolding a component,
deriving a story matrix, checking token usage, finding a duplicate component, surfacing mandatory
states, scanning tech debt, auditing the Claude infra), and `.claude/agents/*` are read-only
**review subagents** (code review, security, RLS, Storybook, ADR conformance, ADR drift) that
give a change an independent second pass.

Specific advisory *jobs* are recorded (**0048**–**0057**), and **0001** names the ADR skills in
passing, but the **layer as architecture** — that workflows are encoded as skills and independent
review as subagents, and how their authority is bounded — has no covering record. A gate
(`check:claude`) already exists to catch drift in this layer's cross-references, yet the layer it
guards has no founding ADR.

## Decision Drivers

* **Recall in the loop** — surface the right rule, mandatory state set, or duplicate-check *while
  the agent is deciding*, before it writes, so fewer violations ever reach the deterministic gates.
* **Independent review** — a subagent with fresh context catches what the author, anchored to
  their own change, misses.
* **Advisory, never authoritative** — a skill or subagent informs; it is never the source of truth
  a gate enforces (that is generated, **0058**) nor a substitute for the human gate (**0047**).
  Recall, not precision, not judgment.
* **Self-consistent references** — every ADR number, script path, and cross-reference a skill or
  agent cites must resolve, or the layer rots into confident-but-wrong guidance.

## Considered Options

* **Skills + review-subagents as a governed structural layer** under `.claude/`
* **Everything in CLAUDE.md prose** — one large brief, no skills or subagents
* **Deterministic gates + human review only** — no structural layer at all

## Decision Outcome

Chosen option: "skills + review-subagents as a governed structural layer", because recall and
precision are different guarantees and conflating them weakens both. Recurring workflows are
encoded as `.claude/skills/*` (each a `SKILL.md` with triggering frontmatter); they may run the
repo's scripts but are **advisory** and never become the source of truth a gate reads. Independent
review is encoded as `.claude/agents/*` review subagents that **report** and cite ADR numbers —
they never approve a PR or a visual baseline (the human gate, **0047**/**0063**). The layer is
single-sourced and drift-checked: **`check:claude`** verifies that every ADR number, `scripts/*`
path, and agent/skill cross-reference cited under `.claude/**` resolves to a real, accepted record
— the same reference-integrity discipline **0067** applies to operative config surfaces, turned
inward on the agent's own tooling.

### Consequences

* Good, because tribal knowledge becomes a runnable, triggerable workflow instead of prose the
  agent may not recall at the right moment.
* Good, because an independent review pass raises recall on exactly the issues a self-review is
  blind to.
* Good, because bounding skills/agents to *advisory* keeps a single source of truth — the
  generated artifacts and the human gate — undiluted.
* Bad, because skills and subagents are Claude-Code-specific; a different harness loses this layer
  entirely, so it must never hold a guarantee CI doesn't also hold.
* Bad, because the layer is more surface to keep consistent; mitigated by `check:claude`.

### Confirmation

`.claude/skills/*` and `.claude/agents/*` exist and are exercised in the workflow. `check:claude`
resolves every ADR/script/cross-reference cited under `.claude/**` and fails on a planted dead
reference (its `--self-test`, **0078**). No deterministic gate reads a skill as its source of
truth — the gates read generated artifacts and registries (grep finds no gate importing
`.claude/skills`). Review subagents carry no authority to approve: the single approval remains a
human's (**0047**).

## Pros and Cons of the Options

### Skills + review-subagents (chosen)

* Good, because it raises recall in the loop and adds an independent review pass, both grounded in
  the ADR corpus.
* Good, because `check:claude` keeps the layer's references honest.
* Neutral, because it is harness-specific; CI and the human gate remain the portable guarantees.
* Bad, because it is more tooling to maintain and keep cited-correctly.

### Everything in CLAUDE.md prose

* Good, because it is one file and fully portable.
* Bad, because a monolithic brief is poor at *recall* — the agent cannot trigger the right workflow
  at the right step, and an independent review pass is impossible without a separate agent.

### Deterministic gates + human review only

* Good, because it is the smallest trusted base — only precision and judgment.
* Bad, because every violation then has to reach a gate or a human to be caught; the cheap,
  high-frequency mistakes the structural layer prevents in the loop all survive to CI or review.

## More Information

This is the **structural** layer of `AI-GUARDRAILS.md` §2. It hosts the specific advisory passes
commissioned elsewhere — story matrices and play drafts (**0051**), the semantic a11y pass
(**0052**) — and is the loop-side cousin of the CI advisory jobs (**0048**–**0057**). Its
authority is bounded by **0046** (agent role) and **0047** (the human is the only approver); its
references are kept honest by `check:claude`, part of the reference-integrity family alongside
**0067** and the meta-integrity gates of **0078**.

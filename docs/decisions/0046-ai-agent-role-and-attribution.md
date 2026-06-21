---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# AI agent role: primary implementer with enumerated human-only gates

## Context and Problem Statement

The corpus is built around agentic development — **0001** names "agentic coding efficiency"
as a founding driver, **0003** and **0015** justify strictness by "an AI agent writes much
of the code", and **CON-003**/**0044** equip the agent with a mandated MCP toolchain. Yet
the rules governing the agent _itself_ are scattered crumbs: **0001** says an agent never
sets `accepted`, **0044** bounds the toolchain's trust surface, and `CLAUDE.md` carries
process prose. No single record answers: what may the agent do autonomously, and which
actions are reserved to humans? Without that record, the boundary is re-derived per
conversation — exactly the re-litigation **0001** exists to prevent.

A related question — _how_ agent-authored work is attributed in history (commit trailers,
PR labels, or nothing at all) — is deliberately **out of scope as a template mandate**
here. This repository is a reusable starter template, and the attribution convention is a
per-project, per-team choice the template should not hard-code.

## Decision Drivers

- **One citable boundary** — the agent (and humans) need a stable "per ADR-0046" reference
  for what is and is not agent territory, consistent with the corpus's agent-legibility
  principle (**0002**).
- **Safety of irreversible and outward-facing actions** — production state, repository
  settings, secrets, and accepted decisions must not change without a human in the loop.
- **Agent throughput** — gates that do not protect something irreversible are friction; the
  human-only list must stay short and justified.
- **Template neutrality on convention** — provenance is valuable, but the _mechanism_ of
  attribution (trailer, label, or none) is a project-specific convention; a template that
  hard-codes one imposes a decision that belongs to the consuming project.

## Considered Options

- A single governing ADR — agent as primary implementer and an enumerated human-only gate
  list, with the attribution convention left to the consuming project
- The same, but also **mandate a fixed attribution mechanism** in the template (e.g. a
  `Co-Authored-By` trailer plus an agent-PR label, enforced by a check)
- No explicit policy — conventions accrete per-record and in mutable `CLAUDE.md` prose

## Decision Outcome

Chosen option: "single governing ADR with enumerated gates, attribution left to the
project", because it makes the boundary durable and citable instead of implicit, keeps the
gate list short enough not to strangle the agent throughput the corpus is designed for,
and does **not** impose an attribution convention that each consuming project should own.
The agent is the **primary implementer**: it writes application code, tests, stories,
migrations, configuration, documentation, and _drafts_ of ADRs. The following actions are
**human-only**:

1. Setting an ADR's status to `accepted` (restates **0001**).
2. Repository and branch-protection settings (**0010** already notes these are
   human-configured).
3. Production promotion and rollback decisions on the hosting platform (**0009**).
4. Provisioning, rotating, or revealing secrets (**0018**, **0044**).
5. Changing the constraint registry (`constraints.md`) — constraints are external mandates
   by definition.
6. Merging to the integration and production branches (**0011**) — merge follows the
   review policy in **0047**.

**Attribution is not mandated by this template.** Whether agent-authored commits carry a
`Co-Authored-By` trailer, whether agent PRs are labeled, or whether provenance is tracked
some other way is left to the consuming project to decide and record in its own ADR. The
template ships no required trailer, no agent-PR label requirement, and no attribution check.

### Consequences

- Good, because the agent's authority is one referenceable record, not folklore — new
  contributors and new agent sessions inherit the same boundary.
- Good, because the human-only list protects exactly the irreversible surfaces and nothing
  else, preserving throughput.
- Good, because the template stays neutral on attribution convention — a consuming project
  adopts the trailer/label policy that fits its team rather than inheriting one.
- Bad, because the gate list must be maintained as tooling evolves — a new irreversible
  surface (e.g. a payments provider) needs this record superseded or extended via a new ADR.
- Bad, because provenance is not guaranteed by the template; a project that wants auditable
  agent attribution must opt in and enforce it itself.

### Confirmation

`CLAUDE.md` (post `adr-sync-claude-md`) lists the human-only gates. Repository-settings
changes appear only in the audit log under human identities. The template carries no
attribution check; a consuming project that adopts an attribution convention records and
enforces it separately.

## Pros and Cons of the Options

### Single governing ADR with enumerated gates, attribution left to the project (chosen)

- Good, because it is durable and citable — the corpus's own standard applied to the agent
  itself — without dictating a convention that belongs to the consuming project.
- Good, because the enumerated list is reviewable: each gate must justify itself against
  the throughput driver.
- Neutral, because the list will need extension as the project grows — but extension via
  ADR is the normal process.
- Bad, because a project that wants enforced provenance must add that policy itself.

### Also mandate a fixed attribution mechanism in the template

- Good, because provenance would be queryable from history alone, with a mechanical check.
- Bad, because it hard-codes a team-specific convention into a reusable template — exactly
  the decision this template should leave to each consuming project.

### No explicit policy

- Good, because zero authoring cost now.
- Bad, because the boundary lives in mutable prose and per-session judgment — the exact
  failure mode (re-litigation, silent contradiction) that **0001** documents.

## More Information

This is the governance keystone for the AI-process records that follow: review of
agent-authored PRs (**0047**), the advisory AI review check (**0048**), CI triage
(**0049**), and the drift audit (**0054**) all assume the agent role defined here. Builds
on **0001** (acceptance gate), **0009**/**0010** (deploy and repo-settings ownership),
**0018**/**0044** (secret fence and toolchain trust), and **0011** (branch model). A
consuming project that wants to mandate commit/PR attribution should record that as its own
ADR. Revisit via superseding record when a new irreversible surface appears.

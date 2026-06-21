---
name: state-coverage
description: >-
  Surface the mandatory state set for a component's archetype (ADR 0061/0062,
  problem P8) so state coverage is built by subtraction and never silently
  skipped — empty/overflow/loading/disabled/error. Use when adding or authoring
  stories for a component, drafting its design-intent.ts, or when asked "which
  states does this need", "what states am I missing", "state coverage", "did I
  cover loading/empty". Reads the ratified registry in src/design-system/states.ts.
---

# Archetype state coverage (run when authoring states / stories)

Problem P8 is incomplete state coverage — the empty, overflow, loading, disabled, or
error states quietly skipped. The defense is **coverage by subtraction** (ADR 0062):
you don't choose which states to cover, you start from the archetype's *mandatory*
set and justify every omission. This skill prints that set so you can't miss one.
Advisory (Stage 2); the blocking version (rejecting a rationale-less omission) is the
Stage-3 `design-intent.ts` fitness function.

> Node 24 is required (`engines.node >=24 <25`). If `node -v` is not v24.x, prepend your
> Node 24 (the newest `~/.nvm/versions/node/v24.*/bin`) to `PATH` before `npm run ds:states`
> below (see `.nvmrc`) — it imports a `.ts` registry and crashes on Node 22 with
> `ERR_UNKNOWN_FILE_EXTENSION`.

## Run it

```bash
npm run ds:states                 # every archetype + its mandatory-axis summary
npm run ds:states -- container    # full checklist for one archetype
npm run ds:states -- --id card    # resolve the archetype from the composition graph
```

The registry is [`src/design-system/states.ts`](../../../src/design-system/states.ts)
(`STATE_AXES` + `ARCHETYPE_STATES`) — the ratified, human-authored source of truth
(ADR 0061). The script reads it directly, so there is no second copy to drift.

## How to use the output

1. **Classify** the component by archetype (`src/design-system/archetypes.ts`).
2. Take the **mandatory axes** (and any **conditional axes** whose condition holds —
   e.g. `process` only for an async component) and the archetype-specific states.
3. In `design-intent.ts` (ADR 0062), mark each state `applicable` true/false. A
   **`false` requires a `rationale`** — a skipped state is then a visible, justified
   omission, never silent.
4. Each **applicable** state needs a story case (ADR 0036/0042) that runs through axe
   (ADR 0039) and Chromatic (ADR 0043) — render correctness, not just presence.

## Boundaries

- **Simultaneity** (disabled+loading, invalid+read-only, hover-over-selected) is *not*
  here — it resolves via the
  [state-precedence matrix](../../../src/design-system/state-precedence.ts) (decided
  once, system-wide).
- A component fitting **no archetype** (`archetype: null`) has no mandatory set and is
  a **👤 human escalation** — a new archetype is a design-system decision (ADR 0061),
  never an agent default. The tool says so for such a node.

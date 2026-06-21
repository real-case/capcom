---
name: claude-audit
description: >-
  Audit the Claude infrastructure itself for drift — the same single-source
  discipline the project applies to code (AI-GUARDRAILS.md §7), turned inward on
  `.claude/`. Runs check:claude (every ADR number, npm script, scripts/* path, and
  agent cross-reference cited in skills/agents/commands still resolves; non-accepted
  citations surfaced) and check:claude-md (CLAUDE.md ↔ accepted-ADR citation
  reconciliation, both directions). Use before committing changes to skills/agents/
  commands, after accepting or superseding an ADR, after renaming an npm script or a
  scripts/* file, or when asked to "check skill drift", "audit the claude infra",
  "do the skill references still resolve", or "/claude-audit".
---

# Audit the Claude infrastructure (skill/agent drift gate)

The project prevents code drift with single-sourced, drift-checked artifacts (ADR
0058's `gen:tokens`, `gen:types`) and gates that test themselves (`check:gates`, P6).
The `.claude/` tree — skills, agents, commands — had no such guard, yet it hard-codes
~200 ADR numbers and dozens of npm-script and `scripts/` file references. When an ADR
is superseded or a script is renamed, those instructions rot **silently**. This skill
is the structural-layer convenience around that integrity gate; the guarantee belongs in
CI (run the same two scripts there).

## Run it

```bash
npm run check:claude         # references in .claude/{skills,agents,commands} resolve
npm run check:claude-md      # CLAUDE.md citations ↔ the accepted ADR corpus
```

Exit `0` = clean. Non-zero = a load-bearing reference has drifted (printed with the
file and the broken reference).

## What check:claude proves (scripts/check-claude-infra.mjs)

- **npm-script references resolve** — every npm-script reference (the `check:`, `gen:`,
  `ds:` namespaces) cited in a skill/agent/command is a real key in `package.json`
  (**ERROR** if not — the classic "renamed the gate, the skill still calls the old name").
- **scripts/* paths resolve** — every `scripts/*.mjs|.py` reference exists on disk,
  resolved from the repo root *or* relative to the citing doc (**ERROR** if missing).
- **ADR references resolve** — an explicit `ADR NNNN` / `(NNNN)` that names no record is
  an **ERROR**; a citation that resolves but is not `accepted` is a **WARNING** (a skill
  built on a still-`proposed` decision, ADR 0001 — record acceptance is a 👤 gate, ADR 0046).
- **agent cross-references resolve** — ``the `x-reviewer` agent`` must name a real file in
  `.claude/agents/` (**WARNING** if not).
- **Self-test (P6):** `npm run check:claude -- --self-test` plants synthetic violators
  (a bogus script name and a dangling ADR number) and asserts the gate still catches
  them — the same "test the test" guarantee as `check:gates`.

## What check:claude-md proves (scripts/check-claude-md.mjs)

`CLAUDE.md` is synthesised from the ADRs by the `adr-sync-claude-md` skill (agent-authored
prose), so it can't be byte-diffed like a generated file. Instead the **citation contract**
is checked, deterministically, both ways:

- every ADR/`CON-00x` cited in CLAUDE.md resolves (**ERROR** if dangling);
- a citation that is not `accepted` is flagged (CLAUDE.md must derive from accepted records
  only — the sync skill's cardinal rule) — **WARNING**;
- **coverage:** every `accepted` ADR is reflected somewhere in CLAUDE.md — a missing one is
  the "decided but never synced into memory" signal (**WARNING**; `--strict` makes it an error).

## Acting on the output

- **Errors** are real drift — fix the reference (rename to the current script/path) or, if
  an ADR was genuinely removed, correct the citation.
- **Non-accepted-citation warnings** are a governance signal, not always a bug: a skill that
  cites a `proposed` ADR is fine *if* the dependency is intended — but it means that tooling
  rests on a decision the human acceptance gate (ADR 0046) hasn't ratified. Surface it.
- **Coverage warnings** mean newly-accepted ADRs aren't in CLAUDE.md yet — run
  `adr-sync-claude-md` to fold them in.

This is the reactive-growth idea of ADR 0064 applied to the Claude infra: when a new drift
class appears, add a check here so it can never recur silently.

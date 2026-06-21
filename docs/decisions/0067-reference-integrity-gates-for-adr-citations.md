---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Reference-integrity gates for ADR/CON citations across operative surfaces

## Context and Problem Statement

Files all over this repo cite decisions by number — `ADR 0044`, `(0058)`, `CON-003`. Two
deterministic gates already patrol some of them: `check:claude`
(`scripts/check-claude-infra.mjs`) resolves every ADR/CON/script/path/agent reference in
`.claude/**`, and `check:claude-md` (`scripts/check-claude-md.mjs`) reconciles `CLAUDE.md`
against the accepted corpus. Both reuse the shared resolver in `scripts/lib/adr-corpus.mjs`
and ship a P6 self-test. But **operative non-doc surfaces that also hard-code ADR numbers
are unguarded** — specifically `.github/workflows/ci.yml` (every step name and rationale
comment cites the ADR it enforces) and `.env.example` (each secret cites the ADR that
governs it). When the corpus was renumbered (commit `009af13`, "renumber decision corpus
to optimal order"), `adr.py lint` and `check:claude` stayed green while ci.yml and
.env.example silently kept ~25 stale numbers — `gitleaks` labelled "ADR 0055" (localization)
instead of 0056, the coverage gate "ADR 0031" (SEO) instead of 0008, secrets citing 0042
(story coverage) instead of 0044. A CI step that names the wrong ADR is a false map for the
next agent that reads it. Separately, the two existing gates were introduced noting they
"do not yet have their own ratifying ADR" — so the decision to run reference-integrity
checks at all is itself unrecorded.

## Decision Drivers

* **Citations are a contract, not decoration** — a number that resolves to the wrong record
  (or none) misleads exactly the agent the corpus exists to inform (**0001**, **0046**).
* **The drift net has a hole the renumber walked straight through** — the gap is empirically
  demonstrated, not hypothetical.
* **Single source already exists** — `scripts/lib/adr-corpus.mjs` is the one resolver;
  extending coverage must reuse it, never fork the parsing (**0058**'s codegen discipline,
  AI-GUARDRAILS §7).
* **Mechanical predicate, deterministic answer** — "does this number resolve to a record?"
  needs no judgment, so it belongs in CI on every PR, not in the scheduled AI drift audit
  (**0054**).
* **Ratify what already runs** — the existing `check:claude` / `check:claude-md` gates need
  a home record before they can be treated as permanent required checks.

## Considered Options

* **A unified reference-integrity gate family** — record the discipline once, ratifying the
  existing `.claude/**` + `CLAUDE.md` gates and extending the same deterministic
  citation-resolution to the operative surfaces `ci.yml` and `.env.example` (and any future
  surface that cites decisions), all over the shared `adr-corpus.mjs` resolver.
* **Leave ci.yml / .env.example uncovered** — rely on the renumber procedure plus human PR
  review to keep their ADR numbers current.
* **Ban ADR/CON numbers from operative config files** — cite decisions only from prose under
  `docs/` and `.claude/`, removing the surface that can drift.

## Decision Outcome

Chosen option: "a unified reference-integrity gate family", because it is the only option
that closes the demonstrated hole without losing the traceability that citing ADRs in CI
steps and env templates buys. A deterministic gate resolves every `ADR NNNN` / `(NNNN)` /
`CON-00x` citation found in a **configured, explicit list of operative surfaces** —
beginning with `.github/workflows/*.yml` and `.env.example` — against the corpus loaded by
`scripts/lib/adr-corpus.mjs`. It follows the severity model the sibling gates already use:
**ERROR** when an explicit citation resolves to no record, **WARN** when it resolves to a
non-`accepted` record (a template may keep decisions `proposed` deliberately, so this stays
a warning, not a failure). It ships a P6 `--self-test` that proves it rejects a synthetic
dangling citation, and it runs in the `claude-infra` CI job beside its siblings. The same
record ratifies the pre-existing `check:claude` / `check:claude-md` gates, which until now
ran without one. The surface list is the gate's single source of truth — adding a new
file that cites decisions means adding it to that list, not writing a second parser. The
gate runs in the `claude-infra` CI job beside its sibling `check:*` gates as a required,
merge-blocking check.

### Consequences

* Good, because a renumber (or a typo) can no longer leave a CI step or an env template
  pointing at the wrong decision — the next PR fails until the citation is fixed.
* Good, because the existing reference-integrity gates finally have a ratifying record, so
  they can be promoted to required checks without an orphaned-governance caveat.
* Good, because coverage extends by configuration, not by new code — the marginal cost of
  guarding the next surface is one list entry.
* Bad, because numbers embedded in CI/env now have a hard gate: a deliberate forward
  reference to a not-yet-created ADR is a build break, not a TODO (mitigated — unresolved
  explicit citations are the error, non-accepted ones are only warned).
* Bad, because it adds one more required check to keep green; the P6 self-test is the
  guard against the gate itself silently breaking.

### Confirmation

A deterministic gate (e.g. `npm run check:citations`) exists and runs in CI; it loads the
corpus via `scripts/lib/adr-corpus.mjs`, resolves every ADR/CON citation in its configured
surface list (at minimum `.github/workflows/ci.yml` and `.env.example`), ERRORs on an
unresolved explicit citation and WARNs on a non-accepted one; it ships a passing
`--self-test` (P6) that rejects a planted dangling citation; the surface list is declared
in one place. Self-referentially, the ADR numbers this record cites are themselves subject
to the gate once it ships. Confirmed today by the absence of stale citations in ci.yml and
.env.example after the corpus renumber (the drift this record prevents recurring).

## Pros and Cons of the Options

### A unified reference-integrity gate family (chosen)

* Good, because it reuses the one resolver — zero new parsing surface, consistent severity
  model with `check:claude` / `check:claude-md`.
* Good, because it both ratifies running gates and closes the new gap in a single decision.
* Good, because it is deterministic and per-PR — drift is caught at authoring time, not by a
  later scheduled audit (**0054**) or by a human noticing.
* Neutral, because it pressures authors to keep operative citations exact — a healthy
  constraint that mirrors the token/codegen discipline (**0058**).
* Bad, because it is one more required check and one more self-test to maintain.

### Leave ci.yml / .env.example uncovered

* Good, because zero tooling.
* Bad, because the renumber already proved human review and procedure miss these surfaces;
  the failure mode is silent and recurs on every future renumber or supersession.

### Ban ADR/CON numbers from operative config files

* Good, because the surface that can drift simply ceases to exist.
* Bad, because the inline traceability ("this CI step enforces ADR 0008", "this secret is
  governed by ADR 0044") is genuinely useful to the agent reading the file, and is exactly
  the kind of grounding **0046** wants; removing it trades a fixable drift for a permanent
  loss of context.

## More Information

Extends the deterministic half of the **0054** drift-audit posture to operative surfaces,
and completes the reference-integrity family alongside `check:claude` (`.claude/**`) and
`check:claude-md` (`CLAUDE.md`). Reuses `scripts/lib/adr-corpus.mjs` (single resolver) and
the P6 self-test convention shared with `check:gates` (**0058**/**0059**/**0060**). Falls
under the agent role and human-only acceptance gate of **0046**. The gate runs in the
`claude-infra` CI job as a required check, ratifying the pre-existing reference-integrity
gates that until now ran without one. Revisit the surface list whenever
a new file begins citing decisions by number (e.g. `README.md`, were its prose citations
ever to warrant hard enforcement).

---
description: Review one proposed ADR — validate against the template, assess soundness, auto-fix formal defects, and report a verdict (never sets accepted)
argument-hint: "[path to ADR file — optional; defaults to newest proposed record]"
allowed-tools: Read, Edit, Bash, Glob, Grep
---

# Review an Architecture Decision Record

Review **exactly one** ADR that is in `proposed` status. Verify its formal validity against
the template, assess the soundness of the decision itself, then either apply *deterministic
formal corrections* to the target file or report what a human must change. You **never**
move a record to `accepted` — that transition is a human's to make.

Operate on one record per invocation. Confine all writes to the target file (Axis 1
corrections) and — only if an auto-fix changes a filename — the generated index
(`docs/decisions/README.md`, via `adr.py index`, which is generated metadata, not a
record). Do not touch any other record, any code, or any configuration.

## Step 0 — Resolve the target record

Records live in `docs/decisions/` (this project's ADR home; the index is `README.md` and is
not a record).

- If an argument is given (`$ARGUMENTS`), that path is the target. If it does not exist or is
  not under `docs/decisions/`, stop and report the error.
- If no argument is given, pick the **most recently modified** record whose status is
  `proposed`. List candidates newest-first and read each one's status in order; the first
  `proposed` record wins:

  ```bash
  # Newest-first record file names (basenames; prepend docs/decisions/). The grep keeps only
  # NNNN-*.md records, excludes README.md, and avoids shell-glob "no matches" errors under zsh.
  ls -t docs/decisions 2>/dev/null | grep -E '^[0-9]{4}-.*\.md$'
  ```

  If `docs/decisions/` is missing or holds no `proposed` record, stop and report that there
  is nothing to review.

Read the **status** robustly, because the two templates store it differently:
- **MADR** keeps it in YAML frontmatter: `status: "proposed"` (strip surrounding quotes).
- **Nygard** keeps it under a `## Status` heading: the first non-empty line below it.

The expected entry status is `proposed`. If the resolved target is in any other status, stop
and report it — this command reviews and may auto-correct only `proposed` records, and must
never alter an accepted/superseded one.

## Step 1 — Determine the template (stop if you can't)

1. If `CLAUDE.md` (root or `.claude/CLAUDE.md`) **pins** an ADR template, that pin is
   authoritative. A record whose structure does not match the pinned template is a **formal
   defect** (Axis 1), not a reason to switch templates.
2. Otherwise infer from the section structure:
   - **MADR** — has `Context and Problem Statement`, `Considered Options`, and
     `Decision Outcome`.
   - **Nygard** — has `Context`, `Decision`, and `Consequences` (and lacks the MADR-specific
     headings above).
3. If the structure matches neither and nothing is pinned, **stop and report the ambiguity**.
   Do not guess a template.

## Step 2 — Axis 1: Formal validation (deterministic; safe auto-fixes allowed)

Run each check; record pass/fail with the offending location. The valid status vocabulary is
`{proposed, accepted, rejected, deprecated, superseded}` (treat `superseded by ADR-NNNN` as a
well-formed `superseded`).

1. **Required sections present** for the detected/pinned template
   (MADR: `Context and Problem Statement`, `Considered Options`, `Decision Outcome` —
   Nygard: `Context`, `Decision`, `Consequences`).
2. **Status field** — present, a single value from the vocabulary above, and `proposed` on
   entry. An unfilled placeholder (e.g. `{proposed | accepted | …}`) is a failure.
3. **File name and number** — matches `NNNN-kebab-case-title.md`; the number is unique across
   `docs/decisions/` and leaves no gap in the sequence; the kebab title in the file name
   corresponds to the record's `#` title. Use the skill's numbering source of truth:

   ```bash
   python .claude/skills/adr/scripts/adr.py next   # highest existing number + 1, zero-padded
   ```

4. **Date and metadata** — present if the template requires them (today is `date +%F`).
5. **Cross-reference integrity** — every `supersedes`, `superseded by`, and `relates to`
   reference resolves to an existing record number in `docs/decisions/`.

**Auto-fix policy.** You may directly correct defects that are *reversible, unambiguous, and
confined to the target file*: renaming the file to the canonical form, reassigning a colliding
number to the next free one (`adr.py next`), repairing a malformed reference **whose intended
target is unambiguous**, and normalizing a malformed `proposed` value (e.g. casing/whitespace).
After any fix that changes the **filename**, regenerate the index:

```bash
python .claude/skills/adr/scripts/adr.py index
```

**Auto-fix safety rails** — never cross these:
- Never invent content: a reference pointing at a *non-existent* number is reported, not
  guessed; an unfilled status placeholder is reported, not filled.
- Never set `Status: accepted` (or any status other than normalizing an existing `proposed`).
- If a rename or renumber would orphan a reference held in **another** record, apply the fix to
  the target and report the sibling reference as a **pending manual fix** — do not edit the
  other record.
- Do not alter decision content under this axis.

List every correction you applied in the report.

## Step 3 — Axis 2: Substantive review (judgment; report only — never auto-apply)

Assess the decision. Produce findings keyed to the section they occur in, each with a one-line
rationale. Make **no** content edits and **no** status change here.

1. **Alternative completeness** — `Considered Options` weighs genuine alternatives, not one
   choice plus straw men. Flag an obviously missing candidate (e.g. a package-manager ADR
   listing only npm/yarn while omitting pnpm and bun).
2. **Criteria-to-outcome traceability** — `Decision Outcome` follows from the stated
   `Decision Drivers`. Flag drivers named but unused, or an outcome resting on unstated grounds.
3. **Justification** — claims rest on verifiable facts or *explicitly labeled* assumptions, not
   bare assertion. Flag evaluative claims with no basis.
4. **Conflict with accepted records** — the record contradicts no `accepted` ADR. On conflict,
   determine whether an earlier record *should* move to `superseded`, and report it — do **not**
   perform the transition.
5. **Scope and reversibility** — the decision's weight meets the project's ADR threshold, and
   consequences (including the negative ones) are recorded.
6. **Context sufficiency for agentic coding** — the record is self-contained enough that an
   agent can derive the resulting constraint from it without consulting external sources.

## Step 4 — Lifecycle (recommend, do not enact)

- **Acceptance.** Do not transition `proposed → accepted`. Emit a recommendation only:
  `READY_FOR_ACCEPTANCE` or `CHANGES_REQUIRED`, leaving status untouched for a human.
- **Supersession.** When a conflict with an `accepted` record warrants replacement, report the
  paired links (`supersedes NNNN` on this record / `superseded by NNNN` on the older one) and
  the target status change. Because the record under review is still `proposed`, these links may
  **not** be written yet — report them as **pending**, to be applied only after a human accepts
  this record.

**Verdict rule.** `CHANGES_REQUIRED` if any formal check still fails after auto-fixes, or if any
substantive finding is material (blocks a confident accept). Otherwise `READY_FOR_ACCEPTANCE`.
Advisory/cosmetic substantive notes do not by themselves block acceptance — state which findings
are blocking.

## Step 5 — Output: a single report

1. **Summary** — target file, detected/pinned template, overall verdict
   (`READY_FOR_ACCEPTANCE` | `CHANGES_REQUIRED`).
2. **Formal validation** — each check with pass/fail and location; the list of corrections
   auto-applied (and the index regeneration, if it ran).
3. **Substantive findings** — each defect keyed to its record section, with a one-line rationale.
4. **Lifecycle notes** — detected conflicts, pending supersession links, and the
   status-transition recommendation.

---
description: Run a guided interview, then create a numbered MADR ADR via the adr skill
argument-hint: "[decision topic — optional]"
allowed-tools: AskUserQuestion, Skill, Bash, Read, Write, Edit, Glob, Grep
---

# Create an Architecture Decision Record (guided)

You are running an **interview** to capture one architectural decision, then handing the
gathered material to the `adr` skill — which owns the mechanical parts (sequential
numbering, the MADR full template, and the auto-maintained index). Your job in this
command is to make sure the *substance* is real before anything gets written. A
fabricated rationale is worse than an honest gap, because it misleads the next reader.

Decision topic seed (may be empty): **$ARGUMENTS**

If the seed above is non-empty, treat it as the decision the user wants to record and
open the interview around it. If it is empty, start by asking — in one line — what
decision they want to capture.

Do **not** create any file until the interview is complete and the user has confirmed
the summary in Step 3. First pull whatever you can from the current conversation and the
codebase, and only ask about what is genuinely missing — don't make the user repeat
things you already know.

## Step 1 — Quick facts (structured)

Use the **AskUserQuestion** tool to collect the skeleton facts in a single batch. These
map directly onto the ADR frontmatter and title, so they are fixed-choice by design (the
user can always pick "Other" to free-type):

- **Status** — `proposed` (not yet ratified) or `accepted` (already settled).
- **Decision-makers** — who owns this call (e.g. "just me", "me + the team"); the
  "Other" field takes names.
- **Decision area** — roughly what the decision concerns (datastore / infrastructure,
  auth / security, API / integration, tooling / dependency, …). This only helps you
  frame follow-ups and choose a good filename slug; it is not stored verbatim.

## Step 2 — Probe for substance (conversational)

Now go deep, conversationally — a few questions at a time, chasing follow-ups based on
what the user says. This is the part that decides whether the ADR is worth keeping. The
full MADR template needs every one of these, so keep probing until you genuinely have
them.

<!-- ┌─────────────────────────────────────────────────────────────────────────────┐
     │ TODO(you): write the core probing questions below. These ARE the command —    │
     │ they determine what every ADR it produces will capture. Use the MADR full     │
     │ template as your checklist: Context/Problem, Decision Drivers, Considered      │
     │ Options (≥2), chosen option + justification, Consequences (good AND bad),      │
     │ Confirmation. Aim for ~5–7 questions. At least one MUST force the user to name │
     │ more than one option and say why the chosen one beat the rest — a decision     │
     │ with a single option isn't a decision, and the rejected alternatives are what  │
     │ make the record defensible later. One example below sets the format.          │
     └─────────────────────────────────────────────────────────────────────────────┘ -->

1. **Context / problem** — "What forced this decision right now? What constraints or
   forces are in play, and what's the scope — which components or systems does it touch?"

<!-- Add the remaining probing questions here. -->

## Step 3 — Confirm before writing

Play back a tight summary: the one-line decision (this becomes the title), the options
considered, the chosen option and why, and the key consequences. Ask the user to confirm
or correct it. Explicitly flag anything you had to assume or that is still thin.

## Step 4 — Hand off to the adr skill

Once confirmed, **use the `adr` skill** to create the record. Tell it the substance is
already gathered (so it does not re-interview the user) and have it:

- pick the next number with `python .claude/skills/adr/scripts/adr.py next`;
- copy `assets/adr-template.md` to `docs/decisions/NNNN-<short-kebab-slug>.md` and fill
  every section from the interview — replace all `{…}` placeholders, delete the
  `<!-- … -->` authoring comments, and populate the per-option pros and cons;
- regenerate the index with `python .claude/skills/adr/scripts/adr.py index`.

## Step 5 — Report back

Give the user the new ADR's path and number, and restate anything you assumed or left
thin, so they know exactly where to look if they want to revise.

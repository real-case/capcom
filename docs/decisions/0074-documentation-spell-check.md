---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Documentation spell-check with cspell

## Context and Problem Statement

The value of this template is disproportionately in its prose — the ADR corpus, the
guardrails documents, and the README are what teach the guardrails to a human and an agent.
Typos in that prose quietly erode trust in documentation that asks to be treated as
authoritative. Nothing checks spelling, so errors accrete unnoticed.

## Decision Drivers

* **Docs quality** — the template's prose is its product; spelling is part of its
  credibility.
* **Low noise** — a project dictionary for the deliberate jargon (Supabase, nuqs, Zustand,
  Storybook, RLS, …) so the gate flags real typos, not vocabulary.
* **Deterministic, offline** — a fixed dictionary gives the same result every run.
* **Scoped** — start with Markdown; code-comment/identifier checking can follow once it
  earns its keep.

## Considered Options

* **`cspell` (dev dependency)** over the docs with a committed project dictionary.
* **`codespell`** (Python).
* **None** — rely on author/review diligence.

## Decision Outcome

Chosen option: "`cspell` over the docs", because it is the JS-ecosystem-native checker (no
new language runtime — Node is already the toolchain, 0004/0005), deterministic, and
configured by a committed `cspell.json` plus a project-words dictionary that absorbs the
domain vocabulary. `check:spelling` runs cspell over the Markdown surface (`**/*.md` minus
generated/vendored paths) and the top-level docs; CI runs it as a blocking step. The project
dictionary is the single source for accepted jargon — adding a word is a one-line, reviewed
change. Scope starts at Markdown; widening to `src/**` comments is a later, separate call.

### Consequences

* Good, because the documentation that the template sells stays typo-free, deterministically.
* Good, because the project dictionary keeps the gate low-noise and makes accepted jargon
  explicit and auditable.
* Bad, because the dictionary needs occasional curation as new domain terms appear (a
  one-line edit per term).
* Bad, because it adds one devDependency (dev-only, not shipped).

### Confirmation

`cspell.json` + a committed project dictionary + the `check:spelling` npm script exist; CI
runs cspell over the documentation surface and fails on an unknown word; the current docs
pass (dictionary seeded with the project's deliberate vocabulary).

## Pros and Cons of the Options

### cspell (chosen)

* Good, because Node-native (no new runtime), deterministic, well-supported dictionaries.
* Good, because the committed dictionary makes the accepted vocabulary explicit.
* Bad, because dictionary curation is ongoing (small, per-term).

### codespell

* Good, because a widely-used, fast typo finder with a curated common-misspellings list.
* Bad, because it introduces a Python toolchain dependency into an otherwise Node-only
  project (0004/0005) for marginal benefit.

### None

* Good, because zero effort.
* Bad, because typos accrete in the exact prose the template asks readers to trust.

## More Information

Sits with the documentation link-integrity gate (**0073**) as the docs-hygiene pair;
Node-native per **0004/0005**. Dictionary edits are a reviewed action in the spirit of
**0046**. Widening scope to source-code comments/identifiers is a deliberate later decision.

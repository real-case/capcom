---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Localization workflow: AI-drafted translations with human review, source locale canonical

## Context and Problem Statement

**0030** adopted next-intl with locale-prefixed routing, which gives the project the
*machinery* of internationalization but no *workflow*: nothing records how message
catalogs in non-source locales get produced, kept in parity with the source locale, or
quality-controlled. The classic answers — a translation-management service (TMS) with
professional translators, or developers hand-translating — sit at opposite ends of cost
and quality. At bootstrap scale, with catalogs living in-repo as JSON and an AI agent
already in the workflow (**0046**), the question is what the leanest defensible
translation pipeline looks like.

## Decision Drivers

* **Parity, mechanically enforced** — a missing or orphaned key in any locale is a
  defect detectable by structure alone; that class belongs in the CI gate (**0010**), not
  in review judgment.
* **Translations must keep pace** — locale catalogs that lag the source locale block
  releases or ship broken UI; the workflow must have near-zero marginal cost per string.
* **One canonical locale** — divergence about which text is authoritative mirrors the
  token problem **0045** solved: there must be a single direction of truth.
* **Human voice for human readers** — machine translation quality is high but tone,
  idiom, and domain terms need an accountable reviewer per locale (same editorial logic
  as **0050**).

## Considered Options

* AI-drafted translations of the source-locale catalog, human-reviewed in PR; source
  locale canonical; parity checked mechanically in CI
* A translation-management service with professional translators
* Developers hand-translate as they build

## Decision Outcome

Chosen option: "AI-drafted, human-reviewed, source-canonical", because it is the only
option whose marginal cost per string is compatible with translations keeping pace at
bootstrap, while review and CI keep quality and parity accountable. The **source locale
catalog is canonical**: developers and the agent author user-facing strings there only.
When source strings change, the agent drafts the corresponding entries for every other
locale, preserving ICU MessageFormat structure (placeholders, plurals, selects) exactly.
Drafted translations land in the same PR as the source change and are reviewed under
**0047** — with locale-competent review (native or fluent) required for tone-sensitive
surfaces, and accepted as-drafted for mechanical strings. CI (**0010**) enforces the
mechanical layer: key parity across locales (no missing, no orphaned keys) and ICU syntax
validity. A TMS is explicitly the revisit path when locale count or content volume
outgrows in-repo review.

### Consequences

* Good, because translations ship in the same PR as the strings they translate — no
  lagging-catalog state exists, and locale-prefixed routes (**0030**) never render
  missing-key fallbacks in production.
* Good, because the mechanical failure class (parity, ICU validity) is gated
  deterministically, leaving review only the judgment class (tone, idiom) — the corpus's
  standard division (**0039**/**0052**).
* Good, because source-canonical direction-of-truth prevents the bilingual-drift problem
  by construction (**0045**'s reasoning applied to strings).
* Bad, because AI translation quality varies by language and domain; without disciplined
  locale-competent review, fluent-sounding but wrong translations ship — the known risk
  of machine translation's confidence.
* Bad, because review burden scales with locale count; each added locale adds a reviewer
  requirement, which is the trigger toward the TMS path.

### Confirmation

CI contains a catalog parity + ICU validity check and it is in the required gate
(**0010**); PRs changing source strings contain the corresponding drafted entries for all
locales; sampled translation PRs show human review; no string authoring happens directly
in non-source catalogs (drift audit **0054** can verify the convention).

## Pros and Cons of the Options

### AI-drafted, human-reviewed, source-canonical (chosen)

* Good, because near-zero marginal cost keeps catalogs in lockstep with development.
* Good, because ICU-structure preservation is exactly the kind of constraint an agent
  follows reliably and a parity check verifies mechanically.
* Neutral, because quality ceiling is set by reviewer fluency — adequate at bootstrap,
  the known limit that triggers the TMS revisit.
* Bad, because plausible-but-wrong translations require genuinely fluent review to catch.

### Translation-management service with professional translators

* Good, because professional quality and translator tooling (memory, glossaries) at any
  scale.
* Bad, because it adds an external platform, a sync pipeline against in-repo catalogs
  (the brittle-pipeline shape **0045** avoids), cost per word, and turnaround latency
  incompatible with same-PR translation at bootstrap scale.

### Developers hand-translate

* Good, because no new process or dependency.
* Bad, because it assumes fluency the team may not have per locale, and the per-string
  cost guarantees catalogs lag — the failure mode the parity gate would then merely
  document.

## More Information

Supplies the workflow **0030** presupposed. Direction-of-truth reasoning follows
**0045**; editorial human-gate reasoning follows **0050**; the mechanical/judgment split
follows **0039**/**0052**. Agent drafting falls under **0046**, review under **0047**,
parity enforcement under **0010**. Revisit toward a TMS when locale count, content
volume, or quality requirements exceed in-repo review capacity — a superseding record,
per **0001**.

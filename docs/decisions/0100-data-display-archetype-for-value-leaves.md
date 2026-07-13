---
status: "proposed"
date: 2026-07-13
decision-makers: Yurii Anichkin
consulted: design-system governance (ADR 0061/0062/0064), ADR 0099 console re-skin
informed: CAPCOM contributors
---

# Add a `data-display` component archetype for value/metric leaves

## Context and Problem Statement

**0061** established a **closed** component-archetype dictionary (`archetypes.ts`: ten classes —
`action-trigger`, `text-input`, `selection-control`, `categorical-indicator`, `collection`,
`container`, `feedback`, `navigation`, `media`, `disclosure`) and ruled that **a component fitting no
archetype is a 👤 escalation — a new archetype is a design-system decision, never an agent default**,
while "adding an entry is trivial" (unlike a rename/merge/split, which needs the **0064** migration
owner).

The **0099** console re-skin introduced two presentational **value leaves** — `MetricHero` (a large
KPI value) and `MonoData` (an inline tabular value) — that fit **none** of the ten classes. They
shipped in Phase A (PR #33) under the interim **`archetype: null`** presentational-leaf exception (the
`skeleton` / `label` / `sonner` precedent), explicitly flagged for 👤 confirmation. `archetype: null`
carries **no mandatory state set**, so a value leaf's `contentBounds` coverage is ungoverned — the
exact silent-gap risk **0061/0062**'s coverage-by-subtraction exists to prevent.

The question: do these value leaves get a dedicated archetype (bringing them under governed state
coverage), stay `archetype: null`, or reuse an existing class?

## Decision Drivers

* **Governed state coverage (0061/0062).** Coverage-by-subtraction needs a mandatory state set; `null`
  supplies none, so a value leaf's `contentBounds` states are not checked — a silent gap.
* **A genuine recurring class.** The console + curated Overview (0099/0090) are metric-dense; value
  renderers recur across widgets, so this is a real structural distinction, not the "too-fine" noise
  0061 warns against.
* **Honest leaf/widget boundary.** The DATA's absence / loading / error belongs to the composing
  **widget** (it owns the fetch and the empty/Skeleton swap — FSD + 0084), not the leaf; the class must
  therefore **not** mandate the `data`/`process` axes.
* **Don't over-extend.** A purely structural rule (`Hairline`) renders no value and must stay `null`;
  the new class is for value renderers only.
* **0061's sanctioned path.** "Adding an entry is trivial"; a no-archetype component escalates to a
  human. This decision is that escalation resolved.

## Considered Options

* **A — Add a `data-display` archetype** (mandating only `contentBounds`) and reclassify `MetricHero` /
  `MonoData`; `Hairline` stays `null`.
* **B — Keep `archetype: null`** for the value leaves (the `skeleton` / `label` presentational-leaf
  exception).
* **C — Reuse an existing archetype** (e.g. `categorical-indicator` or `container`) for the value
  leaves.

## Decision Outcome

Chosen option: **A — add a `data-display` archetype**, because it is the only option that brings the
value leaves under **governed** state coverage while keeping the leaf/widget boundary honest. The class
**mandates only the `contentBounds` axis** — how a *present* value renders across min/max width and
script — and deliberately mandates no `data`/`process` axis, because a metric's empty/loading/error is
the composing widget's job. `MetricHero` + `MonoData` are reclassified `null → data-display` with their
`contentBounds` coverage filled by subtraction; **`Hairline` stays `null` (confirmed)** — a rule
renders no value, so it fits no archetype. This is an **additive extension** of 0061's vocabulary via
its sanctioned "adding an entry is trivial" path — **not** a rename/merge/split, so it needs no 0064
migration owner; it does not supersede any record.

The decision fixes:

* **`archetypes.ts`** gains `data-display` (dated 👤 extension note).
* **`states.ts`** `ARCHETYPE_STATES` gains `data-display` = `mandatoryAxes: ["contentBounds"]`, with a
  note that data absence/loading/error is the widget's responsibility. The `Record<Archetype, …>` type
  **forces** this entry — omitting it fails `tsc`.
* **`MetricHero` / `MonoData`** `design-intent.ts` set `archetype: "data-display"` and cover the six
  `contentBounds` states (by subtraction); their values render `whitespace-nowrap` so the
  `line-wrap: applicable:false` claim is honest; the graph nodes match.

### Consequences

* Good — the value leaves gain governed `contentBounds` coverage; a skipped state is now a visible,
  justified omission, not a silent gap (0062).
* Good — the leaf/widget boundary is explicit: the leaf owns only render-of-present-value; widgets own
  empty/loading/error (no data/process axis on the class).
* Good — a cheap, additive vocabulary extension (0061-sanctioned); no migration, no superseded record.
* Bad — the archetype set is no longer the verbatim "ratified baseline (2026-06-11)"; it is now a
  documented extension that tooling and future readers must track.
* Bad — a new class is ongoing human-maintained vocabulary (0061's stated liability) and could be
  over-applied to things that should stay `null` (mitigated: it is for value renderers only, and
  `Hairline` staying `null` marks the boundary).

### Confirmation

* **Typed vocabulary (0061).** `tsc` fails if the `Record<Archetype, ArchetypeStateSpec>` in
  `states.ts` lacks the new key, and any story / `design-intent.ts` naming an unknown archetype fails
  typecheck.
* **`check:design-intent` (0062).** Reconciles each spec's `meta.archetype` against the composition
  graph and the archetype's mandatory state set (coverage by subtraction) — `MetricHero` / `MonoData`
  must cover `contentBounds`, each `applicable:false` carrying a rationale.
* **`check:graph` (0059/0060).** The graph archetype matches the design-intent archetype.
* Implemented in PR #34 with all gates green (`tsc` · `check:design-intent` 20 specs · `check:graph` 20
  nodes · `check:tokens` · unit 411 · axe over the changed stories · `check:design-system`).

## Pros and Cons of the Options

### A — Add a `data-display` archetype

* Good — value leaves come under governed coverage-by-subtraction; no silent `contentBounds` gap.
* Good — mandating only `contentBounds` encodes the honest leaf/widget boundary (data states are the
  widget's).
* Good — additive and cheap; uses 0061's sanctioned "adding an entry is trivial" path; no 0064
  migration, no supersession.
* Neutral — dark-vs-light and tenant/density are token concerns, untouched by this classification.
* Bad — grows the human-maintained vocabulary; a new class to keep well-calibrated (0061's liability).

### B — Keep `archetype: null`

* Good — zero governance change; matches the `skeleton` / `label` / `sonner` precedent for pure leaves.
* Bad — `null` carries no mandatory state set, so the value leaves' `contentBounds` coverage stays
  **ungoverned** — a silent-gap risk exactly where 0061/0062 want governance.
* Bad — treats a genuine, recurring value-display class as an unclassifiable exception, which the
  metric-dense console will repeat many times.

### C — Reuse an existing archetype (`categorical-indicator` / `container`)

* Good — no vocabulary change.
* Bad — a category label (`categorical-indicator`) is a *closed set of categories*, not an open value;
  the semantics and usage roles don't match (a false classification that would mislead dedup and API
  derivation, 0061 P3/0062).
* Bad — `container` mandates content-holding semantics a value leaf doesn't have; forcing the fit
  corrupts the class's meaning for the components that genuinely are containers.

## More Information

* **Extends 0061** — adds one vocabulary entry via its sanctioned additive path; it is **not** a
  rename/merge/split, so no 0064 migration owner is required. It resolves the 0061 rule that "a
  component fitting no archetype is a 👤 escalation."
* **Serves 0099** — the mission-control console value leaves; consumed by the curated Overview home
  (kept distinct from 0090 user dashboards, Phase D) and the events-explorer re-skin (Phase C).
* The interim `archetype: null` classification (the `skeleton` / `label` / `sonner` presentational-leaf
  exception) was the Phase-A holding pattern (PR #33); this record replaces that holding pattern for
  the two value leaves. `Hairline` remains `null` — a structural rule, not a value display.
* Implemented in PR #34 (`chore/ds-data-display-archetype`).

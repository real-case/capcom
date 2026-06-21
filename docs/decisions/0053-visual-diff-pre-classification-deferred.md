---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Visual-diff AI pre-classification: defer; rely on determinism discipline and platform evolution

## Context and Problem Statement

**0043** adopted Chromatic for visual regression and recorded two standing costs: visual
diffs are noisy (fonts, animation, dynamic content) and baseline approval adds review
friction. An obvious AI application suggests itself — pre-classify each diff as *noise*,
*expected token-wide change* (**0033**), or *suspected real regression* before a human
approves baselines. The question is whether to build such a classifier now, wait for the
platform to provide one, or rule the idea out. Unlike the sibling records (**0048**,
**0049**, **0052**), the friction here is *predicted, not yet observed* — no code, no
stories, and no baseline-approval history exist yet.

## Decision Drivers

* **No measured pain yet** — the friction this would relieve is anticipated from
  **0043**'s analysis, not demonstrated; building relief for unmeasured pain is premature
  optimization of process.
* **Avoid brittle pipelines** — a custom classifier must consume a hosted SaaS's diff
  artifacts; **0045** already establishes the corpus's aversion to maintaining pipelines
  against external tools when a leaner posture works.
* **Platform trajectory** — Chromatic (and the visual-testing market generally) is
  actively shipping AI triage features; a native feature would obsolete a custom build.
* **First-line defenses already decided** — **0043** mandates deterministic stories
  (frozen time/animations, mocked data) and TurboSnap scoping; both attack the same noise
  at its source.

## Considered Options

* Defer: enforce **0043**'s determinism discipline, watch platform-native AI triage,
  revisit on evidence of sustained approval load
* Build a custom AI diff-classification pass now (export Chromatic diffs, classify,
  comment on the PR)
* Reject the idea permanently — manual baseline approval as the enduring model

## Decision Outcome

Chosen option: "defer with recorded revisit triggers", because every driver points the
same way: the pain is unmeasured, the custom build would be a maintenance pipeline
against a SaaS's artifacts, and the platform is likelier to ship native triage than the
project is to need a bespoke one first. The project relies on the already-decided noise
controls (deterministic stories, TurboSnap, **0043**) and keeps baseline approval fully
human (**0043**, consistent with **0047**'s single-gate posture). This record exists so
the idea is *settled, not forgotten*: it names explicit revisit triggers rather than
leaving the question to be re-raised ad hoc — the anti-re-litigation function of
**0001**.

Revisit triggers (any one suffices):

1. Sustained baseline-approval load — e.g. visual review demonstrably dominating PR
   turnaround across multiple releases.
2. Chromatic ships a native AI triage/classification feature (adopting it would be a
   small superseding record, not a build).
3. Diff noise persists *despite* **0043**'s determinism discipline being verifiably
   applied.

### Consequences

* Good, because no machinery is built against an external SaaS for a problem not yet
  observed — zero maintenance, zero coupling added.
* Good, because the decision is recorded with explicit triggers, so neither agent nor
  human re-litigates it each time visual review feels slow (**0001**).
* Bad, because if the friction does materialize, relief arrives only after a trigger
  fires and a superseding record lands — the cost of deferral is paid in review minutes
  during that window.
* Bad, because "watch the platform" is a passive posture; someone must actually notice
  trigger 2 (the dependency-update triage of **0057** naturally surfaces platform
  changelogs).

### Confirmation

No custom diff-classification code or workflow exists in the repository; baseline
approval remains human-only in the Chromatic UI (**0043**); this record's triggers are
the cited basis when the topic resurfaces. Compliance is the *absence* of unmandated
machinery — checkable by the drift audit (**0054**).

## Pros and Cons of the Options

### Defer with recorded revisit triggers (chosen)

* Good, because it spends nothing on unmeasured pain and keeps the corpus's
  lean-pipeline posture (**0045**).
* Good, because the recorded triggers convert "we'll see" into an auditable decision.
* Neutral, because deferral is reversible by design — the superseding path is cheap.
* Bad, because relief lags need if the need does materialize.

### Build a custom AI diff classifier now

* Good, because review friction would be addressed from day one, and diffs would arrive
  pre-sorted.
* Bad, because it couples the project to Chromatic's artifact formats and API — a brittle
  pipeline against a SaaS, the exact shape **0045** rejected for tokens.
* Bad, because the platform shipping native triage would strand the build; probability of
  that within the project's horizon is high.
* Bad, because classifier errors on the *approval* path are dangerous: a "noise" verdict
  on a real regression invites rubber-stamped baseline acceptance.

### Reject permanently

* Good, because maximal simplicity, forever.
* Bad, because it forecloses a cheap future win (a native platform feature) for no
  benefit — deferral dominates rejection at no extra cost.

## More Information

Direct follow-up to **0043** (whose noise and friction consequences motivate the
question), shaped by **0045**'s anti-brittle-pipeline driver and **0047**'s human-gate
posture. The drift audit (**0054**) can verify the "absence of machinery" confirmation;
dependency triage (**0057**) is the natural channel through which trigger 2 gets noticed.
Supersede — do not edit — when a trigger fires.

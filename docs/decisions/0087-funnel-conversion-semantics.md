---
status: "accepted"
date: 2026-06-26
decision-makers: Yurii Anichkin
---

# Funnel conversion semantics: ordered, first-touch, total conversion window

## Context and Problem Statement

PR-5 adds the second flagship aggregation surface: **funnels** — "how many tracked users
progressed through an ordered sequence of events, and where did they drop off?". **0084** already
fixes *where* this runs (an in-database `SECURITY INVOKER` set-returning function, RLS inherited
from **0083**) and names the shape as "ordered-step funnel conversion **with a window**". What
**0084** deliberately does *not* fix is the **conversion semantics** — and a funnel has several
genuinely independent semantic choices, each of which changes the SQL and the numbers a user
sees:

1. **Counting unit** — distinct tracked users (`distinct_id`) vs. raw event occurrences.
2. **Entry anchoring** — which step-1 occurrence starts a user's funnel attempt.
3. **Ordering** — must step *i* occur *after* step *i−1* (ordered), or may they occur in any
   order (unordered)? If ordered, must step *i* be the *immediately next* event (strict) or just
   *some later* event (non-strict)?
4. **Conversion window** — bounded how? A single window measured from the first step (total), or
   a fresh window between each consecutive pair (per-step)? Unbounded?
5. **Step matching** — are steps identified by `event_name` alone, or also by property filters?

Trends (**0084**, PR-4) needed no semantics ADR — "count one event per time bucket" has no
degrees of freedom worth recording. A funnel does: two reasonable engineers will produce
different, both-defensible numbers from the same events unless these choices are written down.
The roadmap anticipated exactly this ("**ADR 0087** precedes it only if the step semantics
warrant a recorded decision"). They do. This record fixes the semantics **before** the
`fn_funnel` migration is written, so the SQL has a contract to implement and the e2e assertions
have a definition to prove.

Scope: this record decides the *meaning* of a funnel computation, not the mechanism (**0084**),
the chart (**0086** — visx, token-only), or the URL-state encoding (**0027** — nuqs). It governs
the PR-5 `fn_funnel` function and the `funnel-builder` slice that calls it.

## Decision Drivers

* **Predictability over cleverness.** A demo whose thesis is "real SQL over real data" must
  produce numbers a reviewer can reason about and reproduce by hand on the seed. The semantics
  should match what mainstream product-analytics tools (Amplitude, Mixpanel, PostHog) call a
  funnel, so the result meets expectation rather than surprising it.
* **Tractable, indexable SQL.** The chosen semantics must reduce to set-based SQL over the PR-3
  indexes (`events(project_id, event_name)`, `(project_id, distinct_id)`), not a row-by-row
  procedural scan, and stay inside the **0084** in-database posture.
* **Maps cleanly to URL-state (0027).** The parameters a user changes — the ordered step list,
  the entry window, the conversion window — must each be a simple, shareable nuqs value.
* **Monotonic by construction.** Step counts must be non-increasing down the funnel for *any*
  input, so the chart can never render a later step taller than an earlier one (a class of bug
  eliminated by definition, not by validation).
* **Honest scope boundaries.** Where a real product would offer more (property filters per step,
  breakdowns, multiple attempts per user), the demo states the boundary rather than half-building
  it — and the boundary must be one that can later be widened *without reopening these
  semantics*.
* **Inherited isolation (0083/0084).** Whatever the semantics, the computation reads `events`
  under the caller's RLS; the definition must not require any cross-tenant or service-role read.

## Considered Options

* **A — Ordered, non-strict, first-touch entry, single total conversion window from step 1**,
  counting distinct users, steps matched by `event_name`. (Amplitude/PostHog default shape.)
* **B — Ordered, non-strict, per-step conversion window** (a fresh window between each
  consecutive pair) instead of one total window from step 1.
* **C — Strict ordering** — step *i* must be the *immediately following* event after step *i−1*
  (no other events in between).
* **D — Unordered set membership** — a user "converts" by having performed all step events at
  least once in the window, regardless of order.

## Decision Outcome

Chosen option: **A — ordered, non-strict, first-touch entry, single total conversion window from
step 1**, because it is the semantics mainstream analytics tools default to (so the demo's
numbers meet a reviewer's expectation), it reduces to tractable set-based SQL over the existing
indexes, every parameter maps to one nuqs value, and step counts are non-increasing by
construction. B, C, and D are each defensible in narrower contexts but either complicate the SQL,
contradict expectation, or under-constrain the result (see below).

The semantics this record fixes — the contract the `fn_funnel` migration implements:

* **A funnel is an ordered list of 2..N `event_name` steps.** Steps are identified by event name
  only; per-step property filters are **out of scope** for this first cut (a stated boundary,
  below). N is bounded (cap 10) to keep the recursive walk small and the URL short.
* **The counting unit is the distinct tracked user (`distinct_id`).** Each step's value is the
  number of distinct users who *reached* that step. Raw event volume is never the funnel number.
* **First-touch entry.** A user enters the funnel at the **earliest** occurrence of step 1 whose
  `ts` falls in the query entry window `[from, to)`. That timestamp, `t₁`, anchors the attempt;
  one attempt per user (re-entry is **not** counted — a stated boundary).
* **Ordered, non-strict, at-or-after.** A user reaches step *i* (i ≥ 2) iff there exists an
  occurrence of step *i*'s event with `ts ≥ tᵢ₋₁` (the timestamp at which the user matched the
  previous step); the matched timestamp `tᵢ` is the **earliest** such occurrence. Events that are
  not funnel steps may freely occur between steps ("non-strict" / "any events in between"). Steps
  must occur in order, but need not be adjacent.
* **Single total conversion window from step 1.** The whole sequence must complete within one
  window `W` measured from `t₁`: every matched `tᵢ ≤ t₁ + W`. `W` is a function parameter (a
  positive interval); the entry window `[from, to)` bounds only step 1, so later steps may land
  after `to` provided they fall inside `t₁ + W`.
* **Output is one row per step**, `(step_index, step_event, users)`, ordered by `step_index`,
  with `users` non-increasing. **Conversion rates are presentation, not aggregation**: the widget
  derives step-over-step and overall percentages from the two adjacent counts (a ratio of
  already-reduced numbers is display formatting, not event reduction — it stays out of SQL and
  does *not* violate the **0084** "no reduction in application code" rule, which is about reducing
  the event stream).
* **`SECURITY INVOKER`, `search_path` pinned, `EXECUTE` to `authenticated` only** — identical
  posture to the **0084** trend functions, so RLS (**0083**) scopes the read and a non-member's
  call reduces over nothing (zero rows, no error).

Stated scope boundaries (consciously OUT, widenable later without reopening these semantics):
per-step property filters; a property breakdown of the funnel; counting multiple attempts per
user; time-to-convert distributions. Each is an additive parameter or a sibling function, not a
change to the definition above.

### Consequences

* Good, because the numbers match what Amplitude/Mixpanel/PostHog users already expect from a
  "funnel", so the demo reads as product-grade rather than idiosyncratic.
* Good, because step counts are non-increasing **by construction** (each step's users are a
  subset of the previous step's), eliminating an entire class of chart bug without a runtime
  check.
* Good, because every parameter (ordered steps, entry window, conversion window) is a single
  nuqs-encodable value, so a funnel is a shareable, bookmarkable link (**0027**) exactly like a
  trend.
* Good, because it reduces to a recursive walk over the step index with a lateral `min(ts)`
  lookup per step — set-based SQL served by the `(project_id, event_name)` index, well inside the
  **0084** posture and trivial at seeded-demo volume.
* Good, because isolation is inherited unchanged from **0083/0084** — no new policy, no
  service-role path.
* Bad, because the "total window from step 1" can under-count long funnels where a genuine but
  slow conversion exceeds `W` after an early fast step — accepted, and exactly what the
  user-tunable `W` exists to explore; the alternative (per-step windows, B) trades this for a
  harder-to-explain definition.
* Bad, because steps keyed by `event_name` only cannot express "viewed **pricing** page" vs
  "viewed **docs** page" as distinct steps — a real-product feature deferred as a stated boundary;
  the seed's event vocabulary (`page_view → sign_up → feature_used → purchase`) is designed to
  make a meaningful funnel without per-step filters.
* Bad, because counting one attempt per user hides users who abandon then re-convert later — an
  acceptable simplification for a demo, and a boundary that a future `p_count_mode` parameter
  could widen without changing the core walk.

### Confirmation

* The `fn_funnel` migration ships an **e2e SQL test** (`e2e/funnels.spec.ts`, the **0084**
  seeded-fixture discipline) proving on the pinned-anchor seed: (1) **monotonic non-increase** —
  every step's `users` ≤ the previous step's; (2) **ordering** — a user counted at step *i* has
  step *i*'s event at-or-after step *i−1*'s; (3) **window** — shrinking `W` never *increases* any
  step's count and widening it never *decreases* one; (4) **distinct-user counting** — the step-1
  value equals the distinct users with step 1 in the entry window, not the event count; (5)
  **cross-tenant isolation inherited** — a non-member's call returns zero rows with `error == null`
  (never another tenant's funnel).
* The function is **`SECURITY INVOKER`** with a pinned `search_path`; `supabase-rls-reviewer`
  confirms it reads `events` under the caller's RLS and adds no privilege-escalating path —
  identical to the **0084** confirmation.
* `gen:types` regenerates the `fn_funnel` RPC signature; CI fails on drift, so the typed call
  surface (**0015**) stays in lockstep with the SQL.
* The diff-scoped reviewer confirms **no funnel reduction leaked into application code**: the
  widget consumes `(step_index, step_event, users)` rows and computes only display percentages
  from them (**0084/0086**).

## Pros and Cons of the Options

### A — Ordered, non-strict, first-touch, single total window from step 1

The mainstream product-analytics funnel: distinct users, entered at their first step-1 event,
each later step the earliest at-or-after occurrence, the whole path inside one window from entry.

* Good, because it is what the dominant tools mean by "funnel" — the result meets expectation.
* Good, because counts are non-increasing by construction (subset relation down the steps).
* Good, because each parameter is a single nuqs value; the funnel is a shareable link.
* Good, because it reduces to indexed set-based SQL (a recursive step walk + lateral `min(ts)`).
* Neutral, because "non-strict" admits unrelated events between steps — correct for product
  funnels, where users do many things between the steps you care about.
* Bad, because a single total window can miss slow-but-real conversions; mitigated by exposing
  `W` to the user.

### B — Ordered, non-strict, per-step conversion window

Same as A, but a fresh window `W` applies between *each* consecutive pair rather than once from
step 1.

* Good, because it tolerates funnels with one naturally slow stage without inflating the whole
  budget.
* Neutral, because it is still ordered/non-strict/distinct-user — only the window accounting
  differs.
* Bad, because "convert within W of the *previous* step, repeated" is materially harder to
  explain and to reason about on the seed than "complete within W of entry".
* Bad, because the recursive walk must thread a per-step deadline, and the user-facing meaning of
  a single `W` control becomes ambiguous (window of what, exactly?).

### C — Strict ordering (immediately-next event)

Step *i* must be the very next event the user emits after step *i−1*, with nothing in between.

* Good, because it captures tight, scripted flows (a checkout wizard) precisely.
* Bad, because real users emit many incidental events (`page_view`, `search`) between meaningful
  steps, so a strict funnel on the seed would collapse to near-zero — wrong for the demo and for
  most products.
* Bad, because it contradicts the mainstream "funnel" expectation this demo wants to meet.

### D — Unordered set membership

A user converts by having performed *all* step events at least once in the window, order
irrelevant.

* Good, because it is the simplest possible SQL (one grouped `count` with a `having`).
* Bad, because it is not a funnel — it answers "who did all of these?", discarding the sequence
  and drop-off that are the entire point of the surface.
* Bad, because it cannot produce a per-step drop-off curve, so the **0086** funnel chart would
  have nothing meaningful to render.

## More Information

This record refines **0084** (it fixes the funnel semantics **0084** left open) and is consumed
by the PR-5 `fn_funnel` migration, the `funnel-builder` feature/widget slice, and
`e2e/funnels.spec.ts`. It builds on the **0083** event shape (`event_name`, `distinct_id`, `ts`)
and isolation model, encodes its parameters via **0027** (nuqs) like the PR-4 trends slice
(**0084/0086**), and renders through the **0086** visx token-only primitives. The seed generator
(`scripts/seed-events.mjs`, **0085**) emits an acquisition → activation → revenue sequence
(`page_view → sign_up → feature_used → purchase`) chosen so this funnel has real drop-off to
show. The decision should be revisited only if the demo needs per-step property filters or a
funnel breakdown — both additive (a new parameter / sibling function) and neither reopening the
core definition fixed here.

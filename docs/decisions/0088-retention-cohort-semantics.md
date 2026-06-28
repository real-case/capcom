---
status: "accepted"
date: 2026-06-28
decision-makers: Yurii Anichkin
---

# Retention cohort semantics: acquisition cohorts, calendar periods, active-in-period

## Context and Problem Statement

PR-6 adds the third flagship aggregation surface: **retention** — "of the users who first
appeared in a given period, how many came back in each later period?". **0084** already fixes
*where* this runs (an in-database `SECURITY INVOKER` set-returning function, RLS inherited from
**0083**) and names retention as one of its in-database aggregations. What **0084** deliberately
does *not* fix is the **retention semantics** — and, exactly as with funnels (**0087**), a
cohort grid has several genuinely independent semantic choices, each of which changes the SQL and
the numbers a user sees:

1. **Cohort basis** — group users by their *acquisition* period (first time ever seen), or by the
   period in which they performed some anchor event?
2. **Period alignment** — are periods *calendar-aligned* (the cohort week is a real Mon–Sun week)
   or *rolling per user* ("week N since this user's signup", offset from each user individually)?
3. **What "retained in period N" means** — active *in that exact period* (the classic retention
   triangle, where a user may skip period 1 and reappear in period 2), or active *in period N or
   any later period* (a monotonic survival curve)?
4. **Granularity** — daily, weekly, or monthly cohorts/periods?
5. **Return activity** — does *any* event count as "came back", or only a specific return event?

Trends (**0084**, PR-4) needed no semantics ADR; funnels did (**0087**) because two reasonable
engineers produce different, both-defensible numbers without a written contract. Retention is the
same: "retention" is one of the most-overloaded words in product analytics, and the difference
between *classic*, *rolling*, and *bounded* retention is exactly the kind of choice that must be
written down before the SQL is written. This record fixes the semantics **before** the
`fn_retention` migration, so the SQL has a contract to implement and the e2e assertions have a
definition to prove.

Scope: this record decides the *meaning* of a retention computation, not the mechanism (**0084**),
the heatmap (**0086** — visx, token-only, the sequential data-viz palette of **0081**), or the
URL-state encoding (**0027** — nuqs). It governs the PR-6 `fn_retention` function and the
`retention-grid` widget slice that calls it.

## Decision Drivers

* **Predictability over cleverness.** A demo whose thesis is "real SQL over real data" must
  produce numbers a reviewer can reason about and reproduce by hand on the seed. The semantics
  should match the **retention triangle** that mainstream product-analytics tools (Amplitude,
  Mixpanel, PostHog) show by default, so the result meets expectation rather than surprising it.
* **Tractable, indexable SQL.** The chosen semantics must reduce to set-based SQL over the PR-3
  indexes (`events(project_id, ts)`, `(project_id, distinct_id)`), not a row-by-row procedural
  scan, and stay inside the **0084** in-database posture.
* **Maps cleanly to URL-state (0027).** The parameters a user changes — the analysis range and
  the cohort/period granularity — must each be a simple, shareable nuqs value.
* **Renders directly as a heatmap (0086).** The output shape must be a dense, *triangular*,
  zero-filled grid (cohort × period-offset) that the **0086** visx widget can paint with the
  **0081** sequential palette without gap special-casing — the densest infographic in the demo.
* **Honest scope boundaries.** Where a real product would offer more (rolling retention, a
  specific return event, breakdowns), the demo states the boundary rather than half-building it —
  and the boundary must be one that can later be widened *without reopening these semantics*.
* **Inherited isolation (0083/0084).** Whatever the semantics, the computation reads `events`
  under the caller's RLS; the definition must not require any cross-tenant or service-role read.

## Considered Options

* **A — Acquisition cohorts, calendar-aligned periods, classic "active-in-period N" retention**,
  counting distinct users, any event as return activity. (The default retention triangle of
  Amplitude/Mixpanel/PostHog.)
* **B — Rolling "retained-through-N"** — same cohorts, but a user is retained in period N iff
  active in period N *or any later period*. Monotonic non-increasing by construction (a survival
  curve), like the funnel.
* **C — Rolling-window periods anchored per user** — "period N since *this* user's first event"
  rather than a calendar grid (Mixpanel's "N-day retention" form).
* **D — Bounded retention against a specific return event** — retained = returned *and* performed
  a named event (e.g. `feature_used`), instead of any event.

## Decision Outcome

Chosen option: **A — acquisition cohorts, calendar-aligned periods, classic "active-in-period N"
retention**, counting distinct users, any event as return activity — because it is the retention
triangle mainstream tools show by default (so the demo's numbers meet a reviewer's expectation),
it reduces to tractable set-based SQL over the existing indexes, every parameter maps to one nuqs
value, and it yields the dense triangular grid the **0086** heatmap is built to render. B, C, and
D are each defensible in narrower contexts but either change the visual story, complicate the SQL,
or narrow the result (see below).

The semantics this record fixes — the contract the `fn_retention` migration implements:

* **Acquisition cohorts.** A user's cohort is the calendar period containing their **first event
  ever** in the project (their global first-touch, `min(ts)`), and a user is included only if that
  first-touch falls in the analysis range `[from, to)`. Pre-existing users (first seen before
  `from`) are **not** re-counted as new — the cohort is genuinely "users acquired in this period".
* **The counting unit is the distinct tracked user (`distinct_id`).** Each cell's value is a count
  of distinct users; raw event volume is never the retention number.
* **Calendar-aligned periods.** Periods are `date_trunc(period, ts)` buckets — real calendar weeks
  or months, the same alignment the **0084** trend functions use. Granularity is a function
  parameter: **`week` or `month`** (the widget offers both, defaulting to `week`); daily is a
  stated boundary.
* **Period offset N** is the whole number of calendar periods between a user's cohort period and an
  activity period (`N ≥ 0`). Offset 0 is the cohort period itself.
* **Retained in period N = active *in that exact period*** (classic). A user is retained in period
  N iff they emitted ≥ 1 event whose period equals `cohort_period + N`. Reappearance is allowed: a
  user absent in period 1 and active in period 2 counts toward period 2, **not** period 1.
* **Offset 0 retention equals the cohort size** (100%) by construction — every cohort member has
  their first event in the cohort period.
* **Output is one row per (cohort, offset)** within the window:
  `(cohort_period timestamptz, cohort_size bigint, period_offset int, retained_users bigint)`.
  The grid is **triangular and zero-filled**: each cohort emits offsets `0..maxOffset`, where
  `maxOffset` is the number of whole periods between the cohort and the last period in range, and
  a (cohort, offset) with no returning users emits an explicit `retained_users = 0` row (mirroring
  the **0084** trend zero-fill) so the heatmap needs no gap handling.
* **Retention rates are presentation, not aggregation**: the widget derives each cell's percentage
  as `retained_users / cohort_size` (a ratio of two already-reduced counts is display formatting,
  not event reduction — it stays out of SQL and does *not* violate the **0084** "no reduction in
  application code" rule, exactly as **0087** established for funnel conversion rates).
* **`SECURITY INVOKER`, `search_path` pinned, `EXECUTE` to `authenticated` only** — identical
  posture to the **0084** / **0087** functions, so RLS (**0083**) scopes the read and a
  non-member's call reduces over nothing.

Stated scope boundaries (consciously OUT, widenable later without reopening these semantics):
rolling "through-N" retention (option B, an additive `p_mode`); rolling-window per-user periods
(option C); a specific return event or per-event retention (option D, an additive `p_return_event`);
a property breakdown of cohorts; cohorting by a custom anchor event; daily granularity. Each is an
additive parameter or sibling function, not a change to the definition above.

### Consequences

* Good, because the numbers match the retention triangle Amplitude/Mixpanel/PostHog users already
  expect, so the demo reads as product-grade rather than idiosyncratic.
* Good, because the output is a dense, triangular, zero-filled cohort × offset grid — exactly the
  shape the **0086** heatmap paints with the **0081** sequential palette, with no gap special-casing.
* Good, because every parameter (range, period granularity) is a single nuqs-encodable value, so a
  cohort grid is a shareable, bookmarkable link (**0027**) exactly like a trend or funnel.
* Good, because it reduces to set-based SQL — a per-user `min(ts)` for the cohort, a distinct
  (user, active-period) set, and a generated offset spine — served by the
  `(project_id, ts)` / `(project_id, distinct_id)` indexes, well inside the **0084** posture and
  trivial at seeded-demo volume.
* Good, because isolation is inherited unchanged from **0083/0084** — no new policy, no
  service-role path; a non-member simply has no cohorts.
* Neutral, because classic retention is **not** monotonic across N (a user may skip a period and
  return), so a cohort's curve can rise after a dip — the recognizable "leaky bucket" shape. This
  is correct for active-in-period retention and is the deliberate difference from the funnel's
  by-construction monotonicity; the only guaranteed bound is `retained_users ≤ cohort_size`.
* Bad, because a single fixed grid can't express "rolling N-day-since-signup" retention that some
  teams prefer (option C) — deferred as a stated boundary behind a future parameter.
* Bad, because counting *any* event as a return hides feature-specific retention ("came back and
  actually used the product", option D) — an acceptable simplification for a demo whose seed has
  every active user emit ordinary events, and a boundary a future `p_return_event` could widen
  without changing the core grid.

### Confirmation

* The `fn_retention` migration ships an **e2e SQL test** (`e2e/retention.spec.ts`, the **0084**
  seeded-fixture discipline) proving on the pinned-anchor seed: (1) **baseline** — every cohort's
  `period_offset = 0` row has `retained_users = cohort_size` (the 100% column); (2) **subset
  bound** — `retained_users ≤ cohort_size` for every cell; (3) **triangular shape** — each
  cohort's max offset fits within the window, and the most-recent cohort has fewer offsets than the
  oldest; (4) **distinct-user cohorting** — a cohort's size equals the distinct users whose
  *first* event falls in that period, not the event volume, and a pre-existing user is not
  re-counted; (5) **granularity guard** — `week` and `month` both compute and any other period
  value is rejected; (6) **cross-tenant isolation inherited** — a non-member's call returns zero
  rows (no cohorts) with `error == null`, never another tenant's retention.
* The function is **`SECURITY INVOKER`** with a pinned `search_path`; `supabase-rls-reviewer`
  confirms it reads `events` under the caller's RLS and adds no privilege-escalating path —
  identical to the **0084** / **0087** confirmation.
* `gen:types` regenerates the `fn_retention` RPC signature; CI fails on drift, so the typed call
  surface (**0015**) stays in lockstep with the SQL.
* The diff-scoped reviewer confirms **no retention reduction leaked into application code**: the
  widget consumes `(cohort_period, cohort_size, period_offset, retained_users)` rows and computes
  only the display percentage from them (**0084/0086**).

## Pros and Cons of the Options

### A — Acquisition cohorts, calendar periods, classic active-in-period retention

The mainstream product-analytics retention triangle: users grouped by acquisition period, a real
calendar grid, retained = active in that exact period, distinct users, any event as a return.

* Good, because it is what the dominant tools mean by a "retention cohort grid" — the result meets
  expectation.
* Good, because the output is a dense triangular grid that maps one-to-one onto the **0086**
  heatmap with the **0081** sequential scale.
* Good, because each parameter is a single nuqs value; the grid is a shareable link.
* Good, because it reduces to indexed set-based SQL (per-user `min(ts)` + distinct activity periods
  + a generated offset spine).
* Neutral, because the curve is not monotonic — correct for active-in-period retention, and
  visually the honest "leaky bucket".
* Bad, because it can't express rolling or feature-specific retention without an additive
  parameter — deferred as stated boundaries.

### B — Rolling "retained-through-N"

Same cohorts, but retained in period N iff active in period N or any later period.

* Good, because it is monotonic by construction (a clean survival curve) and never rises after a
  dip.
* Neutral, because it is still acquisition-cohort / calendar / distinct-user — only the retention
  predicate differs.
* Bad, because it is *not* the default retention triangle a reviewer expects to see, and it hides
  the period-by-period reappearance that the classic grid is built to show.
* Bad, because "through-N" overstates engagement relative to the tools the demo is benchmarked
  against — surprising rather than expectation-meeting.

### C — Rolling-window periods anchored per user

Offsets measured as "N periods since *this* user's first event" rather than a shared calendar grid.

* Good, because it aligns every cohort to its own day-0, which some teams prefer for early-life
  retention.
* Bad, because it abandons the calendar alignment the **0084** trend functions use, so retention
  and trends would bucket time differently — an inconsistency in one demo.
* Bad, because per-user windows complicate the SQL (no shared `date_trunc` grid) and the heatmap's
  column meaning ("days since signup" vs a calendar period) for marginal demo benefit.

### D — Bounded retention against a specific return event

Retained = returned *and* performed a named event, instead of any event.

* Good, because "came back and actually used feature X" is a sharper engagement signal for a real
  product.
* Bad, because it needs an extra parameter and a curated return-event vocabulary to be meaningful,
  and on the seed (every active user emits ordinary events) it would mostly track the any-event
  curve — complexity without a demo payoff.
* Bad, because it narrows the headline "retention" number to one event, which is a per-product
  tuning decision, not the default a cohort grid should show first.

## More Information

This record refines **0084** (it fixes the retention semantics **0084** left open) and is consumed
by the PR-6 `fn_retention` migration, the `retention-grid` widget slice, and
`e2e/retention.spec.ts`. It builds on the **0083** event shape (`event_name`, `distinct_id`, `ts`)
and isolation model, encodes its parameters via **0027** (nuqs) like the PR-4 trends and PR-5
funnel slices (**0084/0086/0087**), and renders through the **0086** visx token-only primitives
with the **0081** sequential data-viz palette. The seed generator (`scripts/seed-events.mjs`,
**0085**) gives each user a first-seen day in the trailing 90 days and a run of return visits over
subsequent days, so weekly cohorts have a real decay curve to show. The decision should be
revisited only if the demo needs rolling retention, a specific return event, or a cohort
breakdown — all additive (a new parameter / sibling function) and none reopening the core
definition fixed here.

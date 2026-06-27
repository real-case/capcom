---
status: "accepted"
date: 2026-06-27
decision-makers: Yurii Anichkin
---

# Segment-definition model: bounded predicate grammar, AND-composition, in-database evaluation

## Context and Problem Statement

PR-7 adds the fourth flagship aggregation surface: **segmentation** — "define a sub-population of
tracked users by their attributes and behaviour, then see how many they are and how they break
down". **0084** already fixes *where* this runs (an in-database `SECURITY INVOKER` set-returning
function, RLS inherited from **0083**) and names "segment distributions" as one of its
in-database aggregations. **0083** fixes the *raw material*: tracked users are `profiles` (keyed
by `distinct_id`, carrying `traits jsonb`) and their behaviour is the `events` stream
(`event_name`, `distinct_id`, `properties jsonb`, `ts`).

What **0084** deliberately does *not* fix is the **segment-definition model** — and, unlike a
trend or a cohort grid (which reduce a *fixed* shape), a segment is itself a *user-authored
predicate over the data*. That raises decisions no prior aggregation faced:

1. **Expressiveness** — what predicates can a segment express? Attribute predicates over a
   profile's `traits` (`plan = pro`)? Behavioural predicates over the event stream (`performed
   purchase ≥ 1 time`, `never performed sign_up`)? Both?
2. **Composition** — how do predicates combine? A flat **AND** of conditions (all must hold), or
   a full boolean tree (`AND`/`OR`/`NOT`, nested groups)?
3. **Rule transport & evaluation** — a segment rule is *data of variable shape*. How does that
   data reach the database and get evaluated **without** building SQL strings from user input?
   A single `jsonb` argument interpreted by a closed function? Typed arrays decomposed in
   application code? Dynamic SQL?
4. **Output** — what does the surface compute? A segment **size** (how many users match) and a
   **distribution** (how the matched users break down across a chosen dimension)?
5. **Persistence** — is a segment a *saved, named resource* (a `segments` table + write path) in
   this PR, or an *ephemeral, shareable definition* (encoded in URL-state like every prior
   slice), with saving deferred?

Trends (**0084**, PR-4) needed no semantics ADR; funnels (**0087**) and retention (**0088**) each
did, because the *meaning* of the computation had defensible alternatives. Segmentation needs one
for a different reason: the computation takes a **user-authored rule** as input, so the *grammar
of that rule* — and how it is evaluated safely under RLS — is a contract that must be written
before the SQL and the widget are built. This record fixes that grammar and the evaluation
posture **before** the `create_segments`/`fn_segment_*` migration, so the SQL has a closed shape
to implement, the Zod `[segment]` schema (**0017**) has a definition to validate, and the e2e
assertions have a contract to prove.

Scope: this record decides the *segment-definition model* and *how it is evaluated*, not the
mechanism (**0084**), the chart (**0086** — visx, token-only), or the URL-state encoding
(**0027** — nuqs). It governs the PR-7 `fn_segment_size` / `fn_segment_distribution` functions
and the `segment-builder` widget slice that calls them.

## Decision Drivers

* **Closed, injection-safe evaluation under RLS (0083/0084).** The rule is user-authored data. It
  must be evaluated by a `SECURITY INVOKER` function reading `events`/`profiles` under the
  caller's RLS — with **no dynamic SQL built from rule text**. A bounded grammar the function
  interprets, not an arbitrary expression compiled to SQL, is the safety boundary.
* **Tractable, indexable SQL.** The chosen model must reduce to set-based SQL over the PR-3
  indexes (`profiles(project_id, distinct_id)`, `events(project_id, ts)`, `(project_id,
  event_name)`, `(project_id, distinct_id)`), not a row-by-row procedural scan, and stay inside
  the **0084** in-database posture.
* **Maps cleanly to URL-state (0027).** A segment is shareable: the whole rule must serialize to a
  single nuqs-encodable value so a segment definition is a bookmarkable link, exactly like a
  trend, funnel, or cohort grid.
* **Grounded in the real seed vocabulary (0085).** The grammar must express segments that are
  *meaningful on the seeded data* — `traits` of `plan`/`country`/`device`/`referrer` and events
  of `page_view`/`sign_up`/`search`/`feature_used`/`purchase` — not an abstract DSL with nothing
  to match.
* **Renders as a simple distribution (0086).** The output must be a small set of
  `(bucket, users)` rows a token-only visx bar/segment chart can paint, plus a scalar total.
* **Honest scope boundaries.** Where a real product offers more (OR/nested logic, per-predicate
  time windows, saved named segments, numeric/property predicates on events), the demo states the
  boundary rather than half-building it — and each boundary must be one that widens *additively*
  (a new predicate type, a `match: "any"`, a sibling table) **without reopening this model**.
* **Inherited isolation (0083/0084).** However a segment is evaluated, it reads `profiles`/`events`
  under the caller's RLS; the definition must not require any cross-tenant or service-role read.

## Considered Options

* **A — Bounded predicate grammar (attribute + behavioural predicates), AND-composition, a single
  `jsonb` rule evaluated by a `SECURITY INVOKER` function with a closed interpreter** (no dynamic
  SQL). A segment is evaluated live from a rule carried in URL-state; persistence is deferred.
* **B — Full boolean expression tree** (`AND`/`OR`/`NOT`, arbitrarily nested groups) over the same
  predicates, evaluated by a recursive `jsonb` interpreter in the function.
* **C — Application-side query builder** — parse the rule in TypeScript and either decompose it
  into typed scalar/array arguments to a static function, or assemble the predicate SQL in Node.
* **D — Dynamic SQL** — a function that builds a `WHERE` clause from the rule with `EXECUTE
  format(...)`.

## Decision Outcome

Chosen option: **A — a bounded predicate grammar (attribute predicates over `profiles.traits` +
behavioural predicates over `events`), combined by AND, carried as a single `jsonb` rule, and
evaluated by a closed `SECURITY INVOKER` interpreter** — because it is the only option that keeps
the rule a single nuqs-shareable value, evaluates user-authored data **without ever building SQL
from it** (the grammar is a fixed vocabulary the function interprets, values compared as `jsonb`/
parameters, never concatenated), reduces to indexed set-based SQL well inside the **0084**
posture, and matches the seed's real vocabulary. B, C, and D each buy expressiveness the demo
does not need at a cost it should not pay (a recursive evaluator, rule logic leaking into
application code, or an injection surface) — see below.

The model this record fixes — the contract the `fn_segment_*` migration and the `[segment]` Zod
schema implement:

* **A segment rule is a closed `jsonb` object** of the shape

  ```jsonc
  {
    "match": "all",                                   // AND-composition (fixed; see boundary)
    "attributes": [                                   // predicates over profiles.traits
      { "key": "plan", "op": "eq",  "value": "pro" },
      { "key": "country", "op": "in", "value": ["US", "GB"] }
    ],
    "behaviors": [                                    // predicates over the events stream
      { "event": "purchase",   "op": "at_least", "count": 1 },
      { "event": "sign_up",    "op": "at_most",  "count": 0 }   // "never signed up"
    ]
  }
  ```

  validated by a Zod `[segment]` schema (**0017**) on the client before the call. An empty rule
  (no predicates) matches every tracked user in the project.
* **Attribute predicates** test one `traits` key with a closed operator set **`eq | neq | in`**
  against a string (or string array, for `in`): `profiles.traits ->> key` compared to the
  literal carried in the rule. Trait keys are the seed's `plan | country | device | referrer`;
  the grammar does not restrict the key, but the builder offers those.
* **Behavioural predicates** test event frequency with a closed operator set **`at_least |
  at_most`** against a non-negative integer `count`, evaluated over the analysis window
  `[p_from, p_to)`: the user's count of `events` with that `event_name` in the window satisfies
  the threshold. `at_least 1` = "performed"; `at_most 0` = "never performed" — so absence is
  expressible without a separate negation operator.
* **Composition is AND only.** A user is in the segment iff they satisfy **every** predicate
  (`match: "all"`). The `match` field is recorded in the rule so a future `"any"` (OR) is an
  additive value, not a schema change — but `"all"` is the only value this record admits.
* **The counting unit is the distinct tracked user (`distinct_id`).** Segment size and every
  distribution bucket are distinct-user counts, never event volume.
* **Two outputs, both in-database:**
  * **Size** — `fn_segment_size(p_project_id, p_rule, p_from, p_to) → bigint`: the count of
    distinct users matching the rule in the window.
  * **Distribution** — `fn_segment_distribution(p_project_id, p_rule, p_dimension, p_from, p_to)
    → setof (bucket text, users bigint)`: the matched users grouped by one trait dimension
    (`p_dimension` ∈ the trait keys), ordered by `users` descending, with `null`/absent traits
    folded into a single `(unknown)` bucket so the chart needs no gap handling. Conversion to a
    **percentage of the segment** is presentation (a ratio of two already-reduced counts), derived
    in the widget — display, not SQL reduction, exactly as **0087**/**0088** established.
* **Closed interpreter, no dynamic SQL.** The functions walk `p_rule` with
  `jsonb_array_elements` and a fixed `case op` per predicate kind; rule **values** are compared as
  `jsonb`/`text` (e.g. `traits ->> (pred->>'key') = pred->>'value'`, `event_name = pred->>'event'`)
  and never interpolated into SQL text. There is no `EXECUTE`. The grammar's closure *is* the
  injection boundary.
* **`SECURITY INVOKER`, `search_path` pinned, `EXECUTE` to `authenticated` only** — identical
  posture to the **0084** / **0087** / **0088** functions, so RLS (**0083**) scopes the read and a
  non-member's call matches over nothing.

**Persistence is deferred to PR-8 (a deliberate boundary).** In PR-7 a segment is an *ephemeral,
shareable definition*: the rule is built in the widget, encoded in URL-state (**0027**), and
evaluated live — no `segments` table, no write policy, no Server Action. This keeps PR-7 a
read-only vertical slice consistent with PR-4/5/6, makes a segment a bookmarkable link, and lands
saved/named segments where they belong — **PR-8**, whose showcase *is* Server Actions with the
optimistic-mutation default (**0020/0025**). This refines the roadmap's indicative "migration
`create_segments` stores the rule JSON" line the same way prior PRs refined the roadmap (the
0088-vs-0089 numbering shift, the FSD single-widget reconciliation): the **rule JSON shape** is
fixed here and is exactly what a PR-8 `segments.definition jsonb` column will store, so deferring
the table costs nothing and reopens nothing.

Stated scope boundaries (consciously OUT, widenable later without reopening this model):
OR / negation / nested predicate groups (option B — an additive `match: "any"` and a `not` flag);
per-predicate time windows ("performed X in the *last 7* days" — an additive predicate field, the
window is currently the single `[from, to)`); numeric/`properties`-value predicates on events
(`purchase` where `amount > 50` — an additive behavioural-predicate field); a specific
distribution by an event property rather than a trait; saved, named, persisted segments + their
write path (**PR-8**, Server Actions). Each is an additive field, value, or sibling object — none
changes the grammar fixed above.

### Consequences

* Good, because a user-authored rule is evaluated with **no SQL built from user input** — the
  closed grammar plus `jsonb`/parameter comparison is the injection boundary, and the function
  stays `SECURITY INVOKER` under the caller's RLS (**0083/0084**) with no service-role path.
* Good, because the whole rule is one `jsonb` value, so a segment serializes to a single
  nuqs-encodable URL parameter — a segment definition is a shareable, bookmarkable link
  (**0027**) exactly like a trend, funnel, or cohort grid.
* Good, because AND-of-bounded-predicates reduces to indexed set-based SQL (a per-predicate
  matching-user set intersected; behavioural predicates served by the
  `(project_id, event_name)` / `(project_id, distinct_id)` indexes), trivial at seeded-demo
  volume and well inside the **0084** posture.
* Good, because the grammar is grounded in the real seed: `plan = pro AND country in (US, GB) AND
  purchased ≥ 1 AND never signed up` is a segment a reviewer can read, reproduce by hand on the
  seed, and see break down by plan or country.
* Good, because the output is a scalar total + a handful of `(bucket, users)` rows — a trivial,
  token-only visx distribution chart (**0086**), no new charting capability.
* Good, because deferring persistence keeps PR-7 a clean read-only slice and lands saved segments
  in PR-8 where Server Actions + optimistic mutations are the showcase — while the rule shape
  fixed here is exactly what PR-8 will persist, so nothing is reopened.
* Neutral, because behavioural predicates are evaluated over the single analysis window
  `[from, to)`, not a per-predicate window — sufficient for the demo and widenable additively.
* Bad, because AND-only composition cannot express `plan = pro OR plan = enterprise` as written —
  the user must use `plan in (pro, enterprise)` for that disjunction, and genuinely mixed
  AND/OR logic is deferred (option B) behind the recorded `match` field.
* Bad, because the grammar omits numeric `properties` predicates on events (`purchase.amount >
  50`) — an honest simplification for a demo whose headline segments are trait- and
  frequency-based, and an additive field when needed.

### Confirmation

* The `fn_segment_size` / `fn_segment_distribution` migration ships an **e2e SQL test**
  (`e2e/segments.spec.ts`, the **0084** seeded-fixture discipline) proving on the pinned-anchor
  seed (`SEED_EVENTS_ANCHOR=2026-06-24T12:00:00.000Z`): (1) an **empty rule** matches every
  project user (size == distinct `profiles`); (2) an **attribute predicate** narrows to exactly
  the users whose trait matches (`plan = pro` size == the distinct `pro` users), and `in` /
  `neq` behave as set operations; (3) a **behavioural predicate** narrows correctly
  (`purchase at_least 1` == distinct purchasers; `sign_up at_most 0` == users with no `sign_up`);
  (4) **AND-composition** is the intersection (a two-predicate rule == the set intersection of
  each predicate alone), monotonically non-increasing as predicates are added; (5) **distribution**
  sums to the size and folds absent traits into `(unknown)`; (6) **cross-tenant isolation
  inherited** — a non-member's call returns size 0 / zero rows with `error == null`, never another
  tenant's users; (7) an **injection probe** — a rule whose `value`/`event`/`key` carries SQL
  metacharacters is treated as a literal (matches nothing, raises nothing), proving the closed
  interpreter builds no SQL from rule text.
* The functions are **`SECURITY INVOKER`** with a pinned `search_path` and `EXECUTE` granted to
  `authenticated` only; `supabase-rls-reviewer` confirms they read `profiles`/`events` under the
  caller's RLS, add no privilege-escalating path, and contain no dynamic SQL — identical to the
  **0084** / **0087** / **0088** confirmation, plus the rule-injection probe above.
* `gen:types` regenerates the `fn_segment_size` / `fn_segment_distribution` RPC signatures; CI
  fails on drift, so the typed call surface (**0015**) stays in lockstep with the SQL, and the Zod
  `[segment]` rule schema (**0017**) is the single authority the client validates against before
  the call.
* The diff-scoped reviewer confirms **no segment evaluation leaked into application code**: the
  widget builds the rule and consumes `(bucket, users)` rows + the scalar size, deriving only the
  display percentage from them (**0084/0086**), and persists nothing (no `segments` table, no
  write path — that is PR-8).

## Pros and Cons of the Options

### A — Bounded predicate grammar, AND-composition, closed `jsonb` interpreter

Attribute + behavioural predicates, combined by AND, carried as one `jsonb` rule, evaluated by a
`SECURITY INVOKER` function with a fixed per-operator `case` and no dynamic SQL; live from
URL-state, persistence deferred.

* Good, because user-authored data is evaluated with **no SQL built from it** — the grammar's
  closure is the injection boundary, and the function stays under the caller's RLS.
* Good, because the rule is one `jsonb`/nuqs value — a segment is a shareable link.
* Good, because it reduces to indexed set-based SQL at the demo's volume, inside **0084**.
* Good, because it is grounded in the seed's real traits and events.
* Good, because the output is a scalar + small `(bucket, users)` set — a trivial visx chart.
* Neutral, because behavioural predicates share the single `[from, to)` window.
* Bad, because AND-only forces `in` for same-key disjunction and defers genuine OR — a stated
  boundary behind the recorded `match` field.

### B — Full boolean expression tree (AND/OR/NOT, nested groups)

The same predicates, but composed by an arbitrarily nested boolean tree, evaluated by a recursive
`jsonb` interpreter.

* Good, because it expresses any boolean segment (`(A or B) and not C`) a real product offers.
* Neutral, because it is still attribute/behavioural predicates over the same data — only the
  composition differs.
* Bad, because a recursive `jsonb` interpreter (or recursive CTE evaluator) is materially more
  SQL to write, test, and review for a demo whose seed segments are conjunctions.
* Bad, because the richer the tree, the larger the URL-state and the harder the builder UI — cost
  without a demo payoff. Deferred *additively* behind A's `match` field, so choosing A now does
  not foreclose it.

### C — Application-side query builder / decomposed arguments

Parse the rule in TypeScript; either decompose it into typed scalar/array function arguments
(like the funnel's `text[]` steps) or assemble predicate SQL in Node.

* Good, because the rule logic is ordinary, unit-testable TypeScript.
* Bad, because mixed predicate **kinds** (attribute vs behavioural, each with its own operator and
  operand) do not decompose into a tidy parallel-array signature the way ordered funnel steps do —
  the argument list explodes or smuggles structure back into a `jsonb`, at which point it *is*
  option A with the interpreter in the wrong tier.
* Bad, because assembling predicate SQL in Node re-establishes an aggregation/reduction
  responsibility in application code — the **0084** anti-pattern — and, if it builds SQL text, an
  injection surface outside the database's parameterization.

### D — Dynamic SQL (`EXECUTE format()`)

A function that compiles the rule into a `WHERE` clause string and `EXECUTE`s it.

* Good, because it is the most flexible — any predicate or composition is expressible.
* Bad, because it builds SQL from user-authored rule text — the canonical injection surface, the
  exact thing **0083**'s `search_path` pinning and the project's security posture exist to avoid.
* Bad, because it is the hardest to prove safe in review (every `format`/quoting path must be
  audited), for flexibility a seeded demo does not need. Rejected on the security driver alone.

## More Information

This record refines **0084** (it fixes the segment-definition model **0084** left open) and is
consumed by the PR-7 `fn_segment_size` / `fn_segment_distribution` migration, the `segment-builder`
widget slice, the Zod `[segment]` rule schema (**0017**), and `e2e/segments.spec.ts`. It builds on
the **0083** identity model (`profiles.traits`, the `events` shape, the membership-join isolation),
the **0085** seed vocabulary (the traits and events the grammar matches), encodes its rule via
**0027** (nuqs) like the PR-4/5/6 slices, and renders through the **0086** visx token-only
primitives. It sits beside the prior semantics records — **0087** (funnels) and **0088**
(retention) — as the third "what does this aggregation *mean*" contract under **0084**, and is the
first to take a **user-authored rule** as input, which is why its central concern is safe
evaluation rather than a fixed reduction. The deferred persistence (saved, named segments + a
`segments` table + Server Actions) lands in **PR-8** under **0020/0025**, storing exactly the rule
shape fixed here. The model should be revisited only if the demo needs genuine OR/nested logic
(option B, additive `match`), per-predicate windows, numeric `properties` predicates, or
event-property distributions — all additive (a new field, value, or sibling function) and none
reopening the grammar fixed here.

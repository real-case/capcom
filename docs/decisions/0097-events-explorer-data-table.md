---
status: "accepted"
date: 2026-07-08
decision-makers: Yurii Anichkin
consulted:
informed:
---

# Events explorer — a raw-event data-table surface on TanStack Table, additive to the visx charts

## Context and Problem Statement

The four flagship analytics surfaces (trends, funnels, retention, segments) are **aggregation**
views: each reads already-reduced rows from a `SECURITY INVOKER` RPC (ADR 0084) and draws them with
**visx** chart primitives (ADR 0086). CAPCOM has no surface for the **raw event stream** itself —
the append-only `events` facts (`event_name | distinct_id | properties jsonb | ts`, ADR 0083) a user
inspects to answer "what actually happened, to whom, just now". The premium-UI goal calls for an
**advanced data table**: a live, sortable, filterable, paginated grid of individual events with an
expandable per-event detail (properties / user / context / recent-activity timeline).

This is a different shape from the chart surfaces in three ways. **First**, it lists *rows*, not a
reduction — the visx primitives (ADR 0086) do not apply, and a table needs headless machinery
(column model, sort state, row selection, expansion) that neither visx nor the shadcn kit provides.
**Second**, its query is a **filtered, ordered, paginated SELECT over `events` under RLS**, not an
RPC call — closer to the entity's existing `fetchRecentEvents` (ADR 0013/0083) than to `fn_*`. Its
user-authored filter is exactly the injection surface ADR 0089 closed for segments: an **AND-only
predicate set** the client must never concatenate into SQL. **Third**, it introduces a **new client
dependency** for the table engine, which — like visx (0086) and Motion (0096) — must be a recorded
decision rather than an incidental import.

This record decides **whether to build the events explorer, which table engine to adopt, how its
raw-event read path and user-authored filter are bounded, and which invariants constrain it** so
tenant isolation (0083), the no-aggregation-in-app-code posture (0084), event immutability (0083),
token ownership (0058/0081), and FSD boundaries (0065/0066) all continue to hold. The surface is a
new **`src/widgets/events-explorer`** slice with a route at `/(app)/p/[projectId]/events`, consuming
an extended read fetcher on the existing `event` entity; it is delivered as a **series of PRs**, this
record covering the whole surface.

## Decision Drivers

* **Raw-event inspection** — a live, sortable, filterable, paginated table of individual events with
  an expandable detail is a product-goal requirement the chart surfaces do not cover.
* **Tenant isolation holds (0083)** — every row is read as the signed-in user under RLS scoped by the
  membership join; a non-member sees nothing; the client never supplies its own tenant id.
* **No aggregation in application code (0084)** — any summary that is a *reduction* (total events,
  distinct users, value sum) comes from a `SECURITY INVOKER` source, never a client-side reduce; the
  table only lists rows the database returned.
* **Event immutability (0083)** — events are append-only facts; the surface exposes **no delete or
  edit** write path, regardless of what a generic data-grid affords.
* **User-authored filter is a closed grammar (0089)** — the condition set is a bounded, Zod-validated
  AND-only predicate value, evaluated by parameterized query building, never string-concatenated SQL.
* **Shareable view state (0027)** — search, filter, sort, page, and density are URL-encoded via nuqs
  so a view is a bookmarkable, shareable link; the widget stays presentational.
* **Token ownership holds (0058/0081/0092)** — event category dots, plan pills, and chrome map to the
  generated data-viz / status / surface / text token allowlist in **both** light and dark
  compositions; no raw color/size literal, no baked palette.
* **FSD boundaries hold (0065/0066)** — one widget slice; the read fetcher lives on the `event`
  entity; downward-only imports through public `index.ts`.
* **Minimal, headless dependency** — the table engine should own only structure (columns, sort,
  selection, expansion), leaving markup, styling, and a11y to repo-owned components under the token
  gate — not ship an opinionated, hard-to-token styled grid.

## Considered Options

* **A — TanStack Table (`@tanstack/react-table`, headless) + repo-owned markup.** A shadcn-style
  `table` primitive in `src/components/ui`; the table engine supplies the column/sort/selection/
  expansion model only.
* **B — A batteries-included styled data-grid** (e.g. AG Grid / MUI X DataGrid). Rich features out of
  the box, but its own styling system and DOM.
* **C — Hand-rolled table** — no table library; bespoke sort/selection/expansion state in the widget.

## Decision Outcome

Chosen option: **"A — TanStack Table (headless) + repo-owned markup"**, because it is the only option
that delivers the advanced-table feature set (multi-column sort, row selection, expansion, column
visibility) **without** importing a foreign styling system that would smuggle raw values past the
token gate (0058) or fork the design language. It mirrors the **exact posture already ratified for
charts** — visx is headless primitives fed token values, and the widget stays presentational (0086);
TanStack Table is the tabular analogue, additive beside visx rather than replacing it. Its state
model is plain data, so search / filter / sort / page / density serialize cleanly to nuqs URL-state
(0027), and it is React 19 / React-Compiler compatible (0029).

The surface is bounded as follows:

* **Read path.** A new `fetchEvents(supabase, query)` fetcher on the `event` entity (ADR 0013)
  performs a **filtered, ordered, ranged SELECT over `events` under the caller's RLS** (0083) — the
  raw-listing sibling of `fetchRecentEvents`, not an aggregation. Filter predicates are applied with
  the Supabase query builder's **parameterized** operators (`.eq/.neq/.in/.gte/.lt/.order/.range`);
  no SQL string is ever assembled from user input.
* **Filter grammar.** The condition set is a **closed, AND-only, Zod-validated** value (`event`,
  `time`, `country`, `device`, `plan`, …) reusing ADR 0089's grammar-as-injection-boundary
  discipline; an out-of-grammar value is rejected, never coerced. It is one nuqs-encodable value, so a
  filtered view is a shareable link (0027). OR / nested logic and arbitrary `properties`-path
  predicates are **stated scope boundaries**.
* **Summary reductions.** The footer totals (total matching events, distinct users, value sum) that
  are genuine reductions are served by a small `SECURITY INVOKER` `fn_events_summary` RPC over the
  same filter (0084) — **never** reduced from the fetched page in JS. Facet counts likewise come from
  the database, not client tallying.
* **No write path.** Selection drives **read-only** bulk actions only — Export CSV (client-side over
  fetched rows) and **Add to segment** / **Build funnel** / **View user** deep-links (0090's
  `reportConfigToSearchParams` pattern). The mockup's "Delete" is **dropped**: events are immutable
  (0083). "Save view" persists as a report `kind` under the 0090 tables (a later PR), never a new
  ad-hoc table.
* **Presentation.** One `src/widgets/events-explorer` slice (0065): a `"use client"` interactive
  table reading nuqs URL-state and calling the entity fetcher through a TanStack Query hook (0025);
  event-category dots, plan pills, and chrome use only generated tokens in both compositions
  (0058/0081/0092); the table carries explicit a11y roles and resolves deterministically for
  Chromatic (0043). Live "stream" is **poll-based** (0084: no realtime), pausable.

### Consequences

* Good, because CAPCOM gains its missing raw-event surface with a premium advanced-table UX, reusing
  the established entity → widget → nuqs → token pipeline rather than inventing one.
* Good, because the headless engine keeps every pixel under the token gate and the design language,
  exactly as visx does for charts (0086) — one consistent posture for the two rendering families.
* Good, because the filter is a closed grammar (0089) and the read path is parameterized under RLS
  (0083), so the new user-input surface adds no injection or tenancy risk.
* Good, because view state is URL-encoded (0027): a filtered/sorted events view is a shareable link,
  and the widget stays presentational and testable.
* Bad, because it adds a client dependency (`@tanstack/react-table`) and its bundle to the app
  surface — accepted as the cost of not hand-rolling column/sort/selection/expansion state.
* Bad, because a raw filtered/paginated SELECT over `events` is a heavier query pattern than the
  seeded-RPC surfaces; on the seeded-data posture (0085) this is fine, but a real high-volume stream
  would need keyset pagination and indexing decisions deferred here as a scope boundary.
* Bad, because delivering the full mockup (saved views, group by, export, live poll, column config)
  is several PRs; partial states ship behind the same route and must each be coherent.

### Confirmation

* **Dependency + boundaries.** `@tanstack/react-table` appears in `package.json`; the license clears
  `check:licenses` (0071); `check:fsd` / `check:boundaries` confirm one widget slice, the fetcher on
  the `event` entity, and downward-only imports through `index.ts` (0066/0060).
* **Tokens.** `check:tokens` + `token-drift` prove the widget uses only generated tokens (no raw
  color/size, no baked palette, no raw SVG fill/stroke) in both compositions; `check:contrast`
  covers any status/text pairs used (0081/0092).
* **Isolation & no-aggregation.** The `event` entity fetcher test asserts the query shape and an
  explicit cross-tenant RLS denial (mirroring the existing `events` RLS tests); a code review
  confirms no client-side reduction — every total traces to `fn_events_summary` or a returned column
  (0084). No `DELETE`/`UPDATE` path against `events` exists (0083).
* **Filter grammar.** The `[events-filter]` Zod schema round-trips through nuqs (a malformed shared
  link falls back to the default); a test asserts an out-of-grammar predicate is rejected, not
  coerced (0089).
* **Stories & a11y.** Colocated CSF 3 stories cover the archetype state set (empty / loading / error /
  overflow / selected / expanded) with `play` functions and the axe gate at WCAG 2.2 AA (0036/0039/
  0042); Chromatic pins the visual baseline (0043).

## Pros and Cons of the Options

### A — TanStack Table (headless) + repo-owned markup

Headless column/sort/selection/expansion model; markup is a repo-owned shadcn-style `table` primitive
styled with tokens; the tabular analogue of the visx posture (0086).

* Good, because markup, styling, and a11y stay repo-owned and under the token gate (0058) — no foreign
  styling system to fork or launder raw values.
* Good, because its state is plain serializable data, so filter/sort/page/density map cleanly to nuqs
  (0027) and it is React 19 / Compiler friendly (0029).
* Good, because it is consistent with the already-ratified headless-primitive pattern (visx, 0086),
  keeping one mental model for rendering families.
* Neutral, because column/selection/expansion UI is authored by us — more code than a batteries-
  included grid, but that code is exactly what keeps design + token control.
* Bad, because it is a new client dependency and bundle cost on the app surface.

### B — A batteries-included styled data-grid (AG Grid / MUI X DataGrid)

* Good, because it ships sort/filter/selection/virtualization/pagination out of the box.
* Bad, because it brings its own styling system and DOM — irreconcilable with the CSS-first token
  architecture (0032/0058) and the shadcn kit; theming it to the mission-control tokens in both
  compositions (0081/0092) fights the library.
* Bad, because its bundle and API surface dwarf the need, and licensing (some are dual/commercial)
  must clear `check:licenses` (0071).
* Bad, because it breaks the "headless primitives fed token values" posture the charts established
  (0086) — two divergent rendering philosophies.

### C — Hand-rolled table (no library)

* Good, because zero new dependency and full control.
* Neutral, because trivial for a static list, but the mockup needs multi-column sort, row selection,
  expansion, and column visibility.
* Bad, because re-implementing that column/sort/selection/expansion state correctly (keyboard, a11y,
  edge cases) is exactly the well-solved problem TanStack Table owns — bespoke code is more bug
  surface for no design or token benefit.

## More Information

Additive to, not a replacement for, the visx chart primitives (ADR 0086) and the chart interaction
layer (ADR 0093): charts render reductions, this table lists rows; both are headless engines fed only
token values, both stay presentational with URL-state (0027). The read path extends the `event`
entity (ADR 0013/0083); the filter reuses the closed-grammar-as-injection-boundary discipline of ADR
0089; summary reductions and facet counts honor the in-database-aggregation posture of ADR 0084;
persistence of a "saved view" reuses the report model of ADR 0090 rather than a new table. Token
mapping follows ADR 0081/0092 with attention to the two-palette split (the mission-control
surface/text set vs. the shadcn flipping set) so the surface is correct in both light and dark.

Stated scope boundaries (each its own later decision if pursued): OR / nested filter logic and
arbitrary `properties`-path predicates; keyset pagination and indexing for a real high-volume stream;
realtime (vs. poll) streaming; saved-view persistence as a report kind (0090); group-by roll-ups;
server-side CSV export; column reordering/resizing persistence.

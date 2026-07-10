---
status: "accepted"
date: 2026-07-10
decision-makers: Yurii Anichkin
---

# Events explorer completion — saved views as an `events` report kind, in-database group-by roll-up, column visibility, density axis, live rate

## Context and Problem Statement

ADR 0097 delivered the events explorer as a PR series and named explicit scope boundaries —
"saved-view persistence as a report kind (0090)", "group-by roll-ups", and "column
reordering/resizing persistence" each awaiting "its own later decision". The final PR of the
series (PR-19) now needs those decisions: how a configured events view is **saved and reopened**,
what **group-by** means on a raw-event surface that must not aggregate in application code
(ADR 0084), which parts of **column configuration** ship now, how the table's **density** toggle
relates to the ratified `[data-density]` dimension-primitive axis (ADR 0082), and what the
mockup's **LIVE ·n/min** indicator may compute. This record resolves those five bounded choices so
the surface can be completed without eroding the invariants the line was built on: in-database
aggregation only (0084), URL-state as the shareable view contract (0027), the 0090 report model as
the single persistence shape for saved analyses, and the swap-only density axis (0082).

## Decision Drivers

* **No aggregation in application code (0084)** — any count/rate shown for a group or a live
  window must be reduced by a `SECURITY INVOKER` function under RLS, never a client-side tally.
* **One persistence shape for saved analyses (0090)** — a saved events view must be a report
  `kind`, "never a new ad-hoc table" (0097's own wording); write RBAC and RLS stay exactly as 0090
  ratified them.
* **The URL is the view (0027)** — whatever constitutes a saved view must round-trip through the
  existing nuqs grammar so save = capture URL-state and reopen = deep-link, with the widget's Zod
  schemas as the validation authority (0017/0089).
* **Density is a ratified axis (0082)** — the `[data-density]` block already swaps the `--c-*`
  dimension primitives under a build-enforced swap-only invariant; the table should consume that
  axis rather than keep a parallel hand-rolled padding branch.
* **Bounded scope** — 0097's remaining boundaries (column reorder/resize persistence, OR-logic,
  keyset pagination, realtime, server-side export) must stay closed unless explicitly decided
  here.

## Considered Options

* **A — Complete the surface inside the existing machinery**: an `events` value added to
  `report_kind`; saved-view config = the events URL-state minus transient fields; group-by as an
  in-database roll-up presentation over the existing `fn_events_facets`; column show/hide only,
  via TanStack `columnVisibility` in URL-state; density consumed from the 0082 dimension
  primitives; live rate from `fn_events_summary` over a trailing window.
* **B — Client-side grouping via TanStack `getGroupedRowModel`** for group-by, with the rest as
  in A.
* **C — A bespoke `saved_views` table** for persistence, with grouping as in A or B.

## Decision Outcome

Chosen option: **"A — Complete the surface inside the existing machinery"**, because it is the
only option that closes out the mockup's remaining features without a new persistence shape
(rejected by 0090/0097 wording) and without client-side aggregation (rejected by 0084) — every
piece lands as a bounded extension of an already-accepted record.

The five sub-decisions, concretely:

* **Saved views are reports of a new `events` kind.** A migration extends the enum
  (`ALTER TYPE public.report_kind ADD VALUE 'events'`); no table, policy, or GRANT changes — the
  0090 RLS/RBAC applies to the new kind untouched. The generated types (0015) propagate the value
  into `REPORT_KINDS`; the `report` entity gains the `events` entries in `reportKindRoute`,
  `defaultConfigForKind`, and the `reportConfigToSearchParams` serializer. A saved view's `config`
  is the events URL-state **minus transient fields**: `filter`, `sort`, `pageSize`, `density`,
  `groupBy`, and hidden columns are the view; `page` and `expanded` are navigation state and are
  never persisted. Saving goes through the existing `createReport` Server Action (0090, optimistic
  per 0025); saved views render as tabs on the events surface (an "All events" default plus one
  tab per saved report), each tab a deep-link built by the same serializer a dashboard "open"
  uses; the active view id rides in the URL (`view`) so a shared link restores the tab state.
* **Group-by is an in-database roll-up presentation, not row grouping.** Choosing a group-by
  dimension (`event`, `plan`, `country`, `device`) swaps the raw-row grid for a roll-up view —
  one row per dimension value with its count under the active filter and its share of the
  filtered total — served entirely by the **existing** `fn_events_facets` RPC (0084; its
  self-skip semantics also make the counts correct when the grouped dimension carries a facet
  selection). No new SQL ships. Activating a roll-up row applies that value as a facet selection
  and returns to the row grid. TanStack's `getGroupedRowModel` is explicitly rejected: its group
  aggregates are client-side reductions (0084), and a page-scoped grouping of 10–50 rows would
  present per-page fragments as if they were analytical groups.
* **Column configuration ships as show/hide only.** Hidden column ids are a bounded, Zod-validated
  URL-state value driving TanStack `columnVisibility`; the selection checkbox, event, and time
  columns are not hideable (the row's identity and the surface's spine). Column
  **reordering/resizing stays deferred** exactly as 0097 recorded — it needs interaction design
  and persistence semantics of its own.
* **Density consumes the 0082 axis.** The existing `density` URL parameter now sets
  `data-density="dense"` on the widget root; the table's row/cell dimensions read the semantic
  dimension tokens (`--space-*`, `--row-height`) that the `[data-density]` block re-resolves,
  replacing the hand-rolled `py-*` branch. No new tokens; the swap-only invariant and its
  `gen:tokens` self-test are untouched (0082/0058).
* **The LIVE rate is a database reduction over a trailing window.** The header's "LIVE · n/min"
  badge calls the existing `fn_events_summary` with a trailing 60-second `[from, to)` window
  (parameters it has accepted since PR-17) on the poll interval; pausing the stream stops this
  poll with the others. No realtime transport is introduced (0084/0012 boundaries hold).

### Consequences

* Good, because the events explorer completes the 0097 mockup with **zero new SQL surface** —
  one enum value is the entire database delta, and every reduction traces to an existing
  `SECURITY INVOKER` function.
* Good, because saved views inherit 0090's write RBAC, RLS, dashboard listing, and delete/rename
  actions for free — an events view is just another report.
* Good, because the roll-up form of group-by is honest about scale: it aggregates over the whole
  filtered stream in the database rather than decorating a 10-row page with pseudo-groups.
* Good, because the table stops hand-rolling density and becomes the first consumer of the 0082
  dimension axis, proving that ratified mechanism end-to-end.
* Bad, because `ALTER TYPE … ADD VALUE` is irreversible in-place (Postgres cannot drop an enum
  value); retiring the kind later would need a mapping migration.
* Bad, because a roll-up view is not the spreadsheet-style inline row grouping some users may
  expect from "Group by"; the interaction (roll-up → click → filter) must carry that
  interpretation.
* Bad, because the saved-view tabs add a second reports consumer outside the dashboards surface,
  widening where report mutations must stay cache-consistent (0025 invalidation discipline).

### Confirmation

* **Migration + types.** The migration adds only the enum value; `npm run gen:types` drift check
  (0015) proves `REPORT_KINDS` carries `events`; `tsc` fails until `reportKindRoute` /
  `defaultConfigForKind` / the serializer cover the new kind (exhaustive `Record<ReportKind, …>`).
* **No client aggregation.** Code review + the 0054 drift audit confirm the roll-up and the LIVE
  badge read only `fn_events_facets` / `fn_events_summary` rows; no `reduce`/count over fetched
  events exists in the widget (0084).
* **Grammar round-trip.** Unit tests prove the extended URL-state (groupBy, hidden columns, view
  id) round-trips through nuqs and that `reportConfigToSearchParams("events", …)` reopens exactly
  the saved view; malformed values degrade to defaults, never error (0017/0027).
* **RBAC.** The RLS suite already proves reports are analyst-writable and member-readable (0090);
  a psql impersonation check confirms an `events`-kind report behaves identically.
* **Density.** `gen:tokens` self-test still passes (swap-only, 0082); stories cover
  comfortable/dense and axe passes both compositions (0039/0092).
* **Stories & a11y.** New states (tabs, roll-up, columns menu, dense) ship colocated stories with
  play functions under the axe gate (0036/0038/0039/0042).

## Pros and Cons of the Options

### A — Complete the surface inside the existing machinery

* Good, because every sub-decision extends an accepted record (0090, 0084, 0027, 0082) instead of
  introducing a parallel mechanism.
* Good, because the database delta is a single enum value; rollback risk approaches zero and
  RLS/RBAC are inherited, not re-derived.
* Good, because `fn_events_facets` already computes exactly the per-value counts a roll-up needs,
  under the active filter, in the database.
* Neutral, because the roll-up presentation is a product-shape choice (analytical roll-up vs
  inline grouping) that this record must make explicit.
* Bad, because the enum value is permanent (Postgres enums cannot shrink in place).

### B — Client-side grouping via TanStack `getGroupedRowModel`

* Good, because it is the library's built-in and renders spreadsheet-style inline groups with
  expand/collapse.
* Bad, because its aggregates (counts, sums per group) are computed in application code — a
  direct 0084 violation the drift audit would flag.
* Bad, because it groups only the fetched page: a "group" of 4 rows on page 1 misrepresents a
  dimension value with 40,000 matching events — analytically misleading at any real scale.
* Bad, because grouped row models re-open the client-pagination auto-reset semantics the table
  just declared manual (PR-18 lesson).

### C — A bespoke `saved_views` table

* Good, because the view schema could be typed as a first-class column set instead of an opaque
  config.
* Bad, because 0097 already decided the opposite ("persists as a report kind … never a new ad-hoc
  table") and 0090's Decision Outcome makes reports the single saved-analysis shape; a second
  table forks persistence, RBAC, and listing.
* Bad, because it needs new RLS policies, GRANTs, and dashboard integration — all duplicated
  machinery for no user-visible gain.

## More Information

Bounded by and additive to: ADR 0097 (the surface and its remaining scope boundaries — OR/nested
filter logic, keyset pagination, realtime streaming, server-side CSV export, and column
reorder/resize persistence all **remain** deferred); ADR 0090 (report model, write RBAC); ADR 0084
(in-database aggregation); ADR 0027 (URL-state); ADR 0082 (density axis, swap-only invariant);
ADR 0025 (optimistic mutation default). The saved-view tabs deliberately reuse the dashboards'
report actions rather than adding events-local rename/delete; managing views beyond save/open
happens where reports are managed (0090). If a future record wants inline row grouping or
per-group value sums, it must ship them as in-database functions (0084) — this record's roll-up
is the template for that shape.

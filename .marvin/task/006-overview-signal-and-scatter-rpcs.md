---
slug: overview-signal-and-scatter-rpcs
type: feature
status: in-progress
created: 2026-07-16
tracker: docs/capcom/console-redesign-progress.md (bento-fidelity precursor)
supersedes: none
stack: typescript, sql
risk: low
breaking: false
spike_required: false
test_command: npm run test
contract_sha: ff5444615a753231
---

# Overview bento — the SQL + entity precursor (scatter RPC + a per-bucket purchasers column)

## Goal

Land the **database and entity layer** the Overview bento-fidelity rebuild needs, ahead of and separate
from any UI: a new `SECURITY INVOKER` `fn_segment_scatter` (per-user frequency × LTV), and a
`purchasers` column added to the existing `fn_overview_signal` so a per-bucket **conversion** series is
expressible. Touches **no component, no render and no composition-graph node** (its only UI-adjacent edit
is one typed story fixture that must absorb the new required column, F10) — so it is independently
reviewable (notably by `supabase-rls-reviewer`) and independently shippable.

## Context

- **Why this exists as its own slice.** The bento rebuild (sibling spec `overview-bento-fidelity`) is ~31
  UI files whose component edits are **atomically coupled** to their `usedIn` graph deltas by exact-set
  gates — it cannot be split internally. The SQL + entity layer is the one clean seam: it touches no graph
  node and no UI, and its RLS properties deserve a focused review. 👤 decision.
- **Cell → data gap that forces the `purchasers` column.** The reference's three `b-stack` minis are
  New sign-ups · Conversion · Avg revenue/user, and **each carries a sparkline** — `b-stack` spans
  `docs/capcom/design-reference/console-build-reference.html:1538-1641`, with the three sparklines at
  `:1544-1569`, `:1579-1605` and `:1613-1639`. Their series must come from
  `fn_overview_signal`, which today returns only
  `(bucket, active_users, new_signups, value_sum)` — `supabase/migrations/20260714120000_create_overview_kpis.sql:104-109`.
  Mapping the minis against `deriveKpis` (`src/widgets/overview-dashboard/model/kpis.ts:55-57`):
  - `newSignups` → the existing `new_signups` column ✓
  - `arpu` = `value_sum / active_users` → both columns exist; a **per-bucket ratio of two already-reduced
    scalars** is presentation (ADR 0087/0088), so no new column ✓
  - `conversion` = `purchasers / active_users` → **no per-bucket `purchasers` column exists** ✗ → this
    spec adds it. Without it the conversion mini cannot have its sparkline (the spec-critic's round-2
    catch; the alternative — dropping that sparkline — was rejected by the 👤 as a fidelity hole).
- **`b-seg` needs a genuinely new RPC.** `fn_segment_distribution` is a 1-dimension distribution, not a 2-D
  per-user scatter; nothing else returns per-user points.
- **The idiom to mirror exactly** (do not invent one): `fn_overview_kpis` / `fn_events_summary` —
  `language sql`, `stable`, `security invoker`, `set search_path = ''`, every reference schema-qualified
  (`public.events`, `public.profiles`), the numeric-amount cast gated by `jsonb_typeof(...) = 'number'`,
  and least-privilege GRANTs (`revoke execute … from public/anon`, `grant execute … to authenticated`).
  Isolation is inherited from the ADR 0083 membership-join RLS — a non-member reduces zero rows. The
  `profiles` join is safe under `SECURITY INVOKER` via the existing "Members read profiles in their
  projects" policy (`20260624045654_create_events_profiles.sql:158`).
- **Additive at runtime — but NOT free at the type layer.** `SignalMeasure`
  (`src/widgets/overview-dashboard/ui/SignalChart.tsx:29`) is a hand-written union
  (`"active_users" | "new_signups" | "value_sum"`), so the **running widget** cannot break and this PR is
  visually a no-op. However `gen:types` emits every Returns column as **required**
  (`database.types.ts:453-458`), so the typed fixture in `SignalChart.stories.tsx:15-20` — annotated
  `OverviewSignalBucket[]` with exactly four keys — fails TS2739 and reddens `tsc`/`build` unless it gains
  `purchasers` (F10). Verified to be the **only** such site. The first draft claimed "nothing breaks" and
  was wrong; the claim is now scoped to runtime and the type break is an explicit file.
- Callers / reverse-deps: `fetchOverviewSignal` (`src/entities/event/api/queries.ts`) forwards the RPC's
  rows verbatim, so the new column flows through with no fetcher change; `useOverviewSignal` and
  `queryKeys.overview.signal` are untouched. The scatter fetcher is a new export on the `segment` entity
  and has no consumer until the sibling spec.
- Sibling specs: `overview-bento-fidelity` (the UI rebuild) **depends on this one**;
  `.marvin/task/003-console-phase-d-overview-dashboard.md` (shipped) created `fn_overview_signal` and the
  e2e RPC-proof harness.
- Constraints: aggregations stay in the database (ADR 0084) — no app-code reduction; no new table, policy,
  or datastore; types are generated, never hand-written (ADR 0015); tenant isolation is a database
  invariant (ADR 0083).

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: supabase/migrations/20260716120000_create_segment_scatter.sql
    action: new
    intent: >-
      One SECURITY INVOKER aggregation RPC (ADR 0084) mirroring the shipped fn_overview_kpis /
      fn_events_summary idiom exactly (language sql, stable, security invoker, set search_path='',
      schema-qualified public.*, revoke execute from public/anon + grant execute to authenticated; no new
      table or policy). public.fn_segment_scatter(p_project_id uuid, p_from timestamptz, p_to timestamptz,
      p_limit integer default 300) returns table(distinct_id text, frequency bigint, ltv numeric, plan
      text) — **events-driven**: group public.events by distinct_id inside [p_from,p_to) and LEFT JOIN
      public.profiles for the plan, so only users with at least one event in the window appear (frequency >=
      1 by construction) and a profile with no events never yields a zero-frequency point. frequency = count
      of that user's events; ltv = sum of
      the numeric properties->>'amount' over their 'purchase' events (jsonb_typeof gate as in
      fn_events_summary; 0 when none); plan = public.profiles.traits->>'plan' (null-safe left join).
      Ordered by ltv desc and capped at p_limit IN SQL so the point set is bounded (the cap is a stated
      boundary, not a client-side reduction). Isolation inherited from the ADR 0083 membership join.
    satisfies: [AC1, AC4]
  - id: F2
    path: supabase/migrations/20260716120100_overview_signal_purchasers.sql
    action: new
    intent: >-
      Recreate public.fn_overview_signal with a per-bucket `purchasers bigint` column appended LAST
      (count(distinct distinct_id) where event_name='purchase' in the bucket — the same definition
      fn_overview_kpis uses for its scalar, so sparkline and KPI agree by construction). **DROP-FIRST, not
      CREATE OR REPLACE**: Postgres rejects a changed RETURNS TABLE row type on replace ("cannot change
      return type of existing function … Use DROP FUNCTION first"), and the repo contains ZERO `create or
      replace function` migrations — the shipped idiom is drop-then-create, with its rationale stated at
      20260709120000_events_filtered_summary_and_facets.sql:27-28 and the drop at :32. So:
      `drop function if exists public.fn_overview_signal(uuid, timestamptz, timestamptz, text);` then
      `create function` with the identical body + the new aggregate. **The DROP takes the GRANTs and the
      COMMENT with it, and CREATE FUNCTION grants EXECUTE to PUBLIC by default — so this migration MUST
      re-issue `revoke execute … from public`, `grant execute … to authenticated` and `comment on function`
      after the recreate** (the precedent does exactly this at :141-151). Omitting them hands `anon`
      EXECUTE — AC1's own named failure mode. Every existing column, the row ordering (`order by b.bucket`)
      and the zero-filled bucket spine are unchanged; the SECURITY INVOKER / `set search_path=''` posture is
      re-stated identically.
    satisfies: [AC2, AC4]
  - id: F3
    path: src/lib/supabase/database.types.ts
    action: edit
    intent: >-
      Regenerated by `npm run gen:types` after F1/F2 (never hand-edited): adds the fn_segment_scatter Args +
      Returns and the new purchasers column on fn_overview_signal's Returns. Committed so the CI type-drift
      gate stays green (ADR 0015).
    satisfies: ["—"]
    anchor: src/lib/supabase/database.types.ts:1
  - id: F4
    path: src/entities/segment/model/types.ts
    action: edit
    intent: >-
      Add SegmentScatterPoint / SegmentScatterArgs derived from the generated
      Functions["fn_segment_scatter"]["Returns"][number] | ["Args"] (ADR 0015, never hand-written), in the
      doc-comment style of the existing segment types.
    satisfies: [AC3]
  - id: F5
    path: src/entities/segment/api/queries.ts
    action: edit
    intent: >-
      Add fetchSegmentScatter(supabase, args: SegmentScatterArgs) — calls supabase.rpc('fn_segment_scatter',
      args) forwarding the typed arg bag verbatim, returns data ?? [], throws on error, and performs NO
      client-side reduction (ADR 0084), mirroring the existing segment fetchers.
    satisfies: [AC3]
  - id: F6
    path: src/entities/segment/api/queries.test.ts
    action: edit
    intent: >-
      Add a describe block for fetchSegmentScatter using the existing rpcReturning mock idiom: assert the
      exact RPC name and argument bag, rows on success, [] on null, and throw-on-error (no swallowing).
    satisfies: [AC3]
  - id: F7
    path: src/entities/segment/index.ts
    action: edit
    intent: Re-export fetchSegmentScatter + the two new types from the segment entity's public API so consumers never deep-import (ADR 0066).
    satisfies: [AC3]
  - id: F10
    path: src/widgets/overview-dashboard/ui/SignalChart.stories.tsx
    action: edit
    intent: >-
      Add `purchasers` to the typed fixture at :15-20. **This is what makes the "additive" claim actually
      true**: the literal is annotated `OverviewSignalBucket[]` with exactly four keys, and gen:types emits
      every Returns column as REQUIRED (database.types.ts:453-458), so a new required column breaks the
      object literal → TS2739 → `tsc --noEmit` and `npm run build` go red. Verified to be the ONLY such
      site (queries.test.ts's mock is untyped; OverviewDashboard/queries.ts use OverviewKpis). No visual or
      behavioural change — the story renders the same measures.
    satisfies: [AC2]
    anchor: src/widgets/overview-dashboard/ui/SignalChart.stories.tsx:15
  - id: F11
    path: src/entities/event/model/types.ts
    action: edit
    intent: Refresh the OverviewSignalBucket doc comment (:139-144), which enumerates the signal's three measures and goes stale once purchasers lands. Comment-only; the type itself is generated (ADR 0015).
    satisfies: ["—"]
    anchor: src/entities/event/model/types.ts:139
  - id: F12
    path: src/entities/event/api/queries.ts
    action: edit
    intent: Refresh the fetchOverviewSignal doc comment (:236-238), which enumerates the same three measures. Comment-only — the fetcher forwards rows verbatim, so no code change is needed for the new column.
    satisfies: ["—"]
    anchor: src/entities/event/api/queries.ts:236
  - id: F8
    path: e2e/overview.spec.ts
    action: edit
    intent: >-
      Extend the existing SQL-fixture spec (the ADR-0084 RPC-math proof idiom already used for
      fn_overview_kpis at :90-186; seeded members bob@capcom.dev @ Aurora / carol@capcom.dev @ Globex,
      pinned window constants, SEED_EVENTS_ANCHOR documented in the header). Write EXACTLY the assertions
      AC4 (a)-(e) names — deliberately NOT the weaker set an earlier draft proposed (`frequency >= 1`,
      `ltv >= 0` and `rows <= p_limit` are tautologies against this seed; `purchasers <= active_users`
      does not discriminate a row-count bug):
      (a) call fn_segment_scatter with an EXPLICIT p_limit=10 → assert exactly 10 rows and that `ltv` is
      non-increasing across them (the cap and its ordering are only falsifiable this way — the 300 default
      against 160 seeded Aurora users passes even with no LIMIT clause);
      (b) assert every returned `plan` is in {free,pro,enterprise} or null;
      (c) pick a day bucket with purchases, ASSERT `purchasers > 0` on it first (otherwise the identity is
      vacuously 0 === 0), then assert fn_overview_signal(day, day+1d, 'day')[0].purchasers ===
      fn_overview_kpis(day, day+1d).purchasers — the identity idiom already at e2e/overview.spec.ts:108-123.
      Scope the comment honestly: this proves window/filter/spine PARITY against a reference already pinned
      as distinct-user (:97-99); it does NOT reliably prove distinct-vs-row-count, because the seed produces
      ~1.6 purchases per eligible user over 90 days and a same-day repeat purchase is <1 expected user-day
      across the whole seed;
      (d) assert every pre-existing signal column is still present and the zero-filled bucket spine is
      unchanged (contrast the spine assertion at :174-180);
      (e) ADR 0083 isolation — a non-member (carol@capcom.dev vs Aurora) gets ZERO scatter ROWS with no
      error (a set-returning function has no zero-fill spine, unlike fn_overview_kpis) while seeing rows for
      her own Globex project.
    satisfies: [AC4]
  - id: F9
    path: docs/capcom/console-redesign-progress.md
    action: edit
    intent: >-
      Add a dated entry for this precursor: why it exists (the one clean seam ahead of the ~31-file bento
      rebuild), what landed (the scatter RPC + the purchasers column), why the column was needed (the
      reference's conversion mini carries a sparkline and no per-bucket purchasers existed — the
      spec-critic's round-2 catch), and the gate results. The Phase 0-E status table is unchanged.
    satisfies: ["—"]
build_order: [F1, F2, F3, F10, F11, F12, F4, F5, F6, F7, F8, F9]
depends_on: []
contract:
  kind: function
  signature: |
    -- new SECURITY INVOKER RPC (ADR 0084), invoked as supabase.rpc(...)
    public.fn_segment_scatter(p_project_id uuid, p_from timestamptz, p_to timestamptz,
                              p_limit integer default 300)
      returns table(distinct_id text, frequency bigint, ltv numeric, plan text)
    -- CHANGED (additive) — one column appended, every existing column kept
    public.fn_overview_signal(p_project_id uuid, p_from timestamptz, p_to timestamptz, p_interval text)
      returns table(bucket timestamptz, active_users bigint, new_signups bigint,
                    value_sum numeric,
                    purchasers bigint)          -- new, appended LAST
    // entity fetcher (forwards the arg bag; no client reduction)
    fetchSegmentScatter(supabase, args: SegmentScatterArgs): Promise<SegmentScatterPoint[]>  // throws on rpc error
criteria:
  - id: AC1
    statement: >-
      Given a signed-in member and a non-member, when each calls fn_segment_scatter for a project, then it
      runs SECURITY INVOKER with search_path='' and authenticated-only EXECUTE, so the member gets per-user
      points and the non-member gets no rows under the ADR 0083 membership-join RLS — with no new table or
      policy and no privilege-escalating path.
    implemented_by: [F1]
    oracle:
      kind: prose-review
    failure: SECURITY DEFINER, an unpinned search_path, EXECUTE granted to anon/public, a new table/policy, or a reduction depending on a client-supplied tenant id.
  - id: AC2
    statement: >-
      Given the existing fn_overview_signal consumers, when the purchasers column is added, then the whole
      tree still type-checks, builds and passes its tests, and the shipped Overview renders unchanged — the
      regenerated required column is absorbed by the typed story fixture (F10) and by nothing else.
    implemented_by: [F2, F3, F10]
    oracle:
      kind: command
      ref: npx tsc --noEmit && npm run build && npm run test
    failure: >-
      TS2739 on the OverviewSignalBucket fixture (the exact break a prose-review of the first draft let
      through — "nothing breaks" was asserted, not verified), a red build, or a changed Overview render.
  - id: AC3
    statement: >-
      Given the new RPC, when fetchSegmentScatter is called, then it invokes supabase.rpc with the exact
      function name and the exact typed argument bag, returns the rows (or [] on null), throws on error, and
      performs no client-side reduction; the fetcher and both types are reachable through the segment
      entity's public API.
    implemented_by: [F4, F5, F6, F7]
    oracle:
      kind: test
      ref: src/entities/segment/api/queries.test.ts::fetchSegmentScatter calls the fn_segment_scatter RPC with the exact name and argument bag
    failure: A wrong fn name, a dropped/renamed arg, a client-side reduce, a swallowed error, or a type hand-written instead of generated.
  - id: AC4
    statement: >-
      Given the seeded local database, when a member calls both RPCs over a pinned window, then each
      reduction is proven by an assertion that can actually FAIL: (a) the scatter called with an explicit
      p_limit=10 returns EXACTLY 10 rows whose ltv is NON-INCREASING (not strictly descending — seeded
      amounts come from the four-value set [19,49,99,199], so top-10 ties are likely and the file's strict
      ordering idiom at e2e/overview.spec.ts:146-148 would flake; use toBeLessThanOrEqual) (the seed holds 160 Aurora users, so the
      default 300 cap is unfalsifiable — asserting against it would pass even with no LIMIT clause);
      (b) plan is in the seeded set {free,pro,enterprise} or null; (c) on a day bucket first asserted to
      have purchasers > 0 (else the identity passes vacuously as 0 === 0), the signal's purchasers EQUALS
      fn_overview_kpis(day, day+1d).purchasers — the identity idiom at e2e/overview.spec.ts:108-123, which
      deterministically proves window/filter/spine PARITY against a reference already pinned as
      distinct-user (:97-99). It does NOT prove distinct-vs-row-count: the seed yields ~1.6 purchases per
      eligible user over 90 days, so a same-day repeat purchase — the only case where count(*) and
      count(distinct) diverge — is under one expected user-day across the entire seed. No deterministic
      proof of that property exists against this seed, and the spec does not pretend otherwise
      (purchasers <= active_users, proposed earlier, is strictly weaker still: seeded purchases are rare
      enough that the row-count bug satisfies it too). (d) the existing signal columns and zero-filled
      spine are intact; (e) a non-member gets ZERO scatter rows with NO error while seeing rows for their
      own tenant.
    implemented_by: [F1, F2, F8]
    oracle:
      kind: test
      ref: e2e/overview.spec.ts::fn_segment_scatter reductions and cross-tenant isolation
    failure: >-
      An unbounded or mis-ordered scatter (caught by the explicit p_limit=10 count + the ltv-desc check), a
      purchasers window/filter/spine divergence from fn_overview_kpis (caught by the identity on a non-empty
      bucket), a broken spine, or a non-member seeing another tenant's users. NOT covered: a count(*)
      row-count bug — see the statement; that gap is disclosed, not papered over.
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "gen:types regenerated + committed (database.types.ts drift gate green)"
  - "supabase-rls-reviewer clean on BOTH migrations (SECURITY INVOKER / search_path / GRANTs / no new table)"
  - "e2e/overview.spec.ts green locally (npm run test:e2e after db:reset + a pinned SEED_EVENTS_ANCHOR)"
  - "tsc / lint / format:check / build green; test:coverage >= 80%"
  - "the shipped Overview still renders unchanged (the column add is additive)"
  - "progress doc updated BEFORE the PR"
  - "Chromatic: N/A — this PR changes no UI"
  - "Conventional Commits; single human-reviewed PR into dev; no AI attribution"
gates:
  test: npm run test
```

## Data & Config

- **Migrations (forward):** `20260716120000_create_segment_scatter.sql` adds one `SECURITY INVOKER`
  function + least-privilege GRANTs; `20260716120100_overview_signal_purchasers.sql` **drops and recreates**
  `fn_overview_signal` with one column appended (Postgres cannot `CREATE OR REPLACE` a changed
  `RETURNS TABLE` row type, and the repo's shipped idiom is drop-first — see F2), **re-issuing the
  `revoke`/`grant`/`comment` the DROP discards**. **No new table, policy, index, or column on any table.**
- **Rollback:** `drop function if exists public.fn_segment_scatter(uuid, timestamptz, timestamptz, integer);`
  and, for the signal, **drop-then-recreate the previous body and re-issue its revoke/grant/comment** (the
  prior migration `20260714120000_create_overview_kpis.sql:96-189` is the reference) — a rollback that only
  re-applied the body would leave `EXECUTE` granted to `public`. Local: `npm run db:reset`.
- **Codegen:** `npm run gen:types` after both migrations (CI drift gate). No env vars, flags, or config keys.
- **Demo data:** the e2e run pins `SEED_EVENTS_ANCHOR` deliberately (reproducibility). The **demo** must
  keep the generator's default wall-clock anchor — a pinned anchor makes every KPI look like a decline and
  flatlines the sparklines.

## Chosen Approach

A small, UI-free PR landing exactly the database + entity surface the bento needs:

1. **`fn_segment_scatter` (F1)** — the only bento cell with no existing RPC. Mirrors the shipped
   `SECURITY INVOKER` idiom line-for-line; bounded in SQL by `p_limit`; the `profiles` join rides the
   existing member-read policy.
2. **`purchasers` on `fn_overview_signal` (F2)** — runtime-additive, but delivered by a **drop-and-recreate**
   (Postgres rejects a changed `RETURNS TABLE` on replace) that **re-issues the revoke/grant/comment the DROP
   discards** — omitting them would hand `anon` EXECUTE. This is the minimum that
   makes the reference's **conversion** mini sparkline possible: `conversion = purchasers / active_users`,
   and no per-bucket `purchasers` existed. With it, all three minis' series are expressible — two directly
   from columns, `conversion` and `arpu` as per-bucket ratios of two already-reduced scalars (presentation,
   ADR 0087/0088), never an app-code reduction.
3. **Entity layer (F4–F7)** — generated types + a fetcher that forwards the arg bag and reduces nothing +
   the mock-rpc unit test + the barrel export.
4. **Proof (F8)** — extend the existing Playwright SQL-fixture spec with both reductions and the
   cross-tenant isolation case.

**Stack compliance:** NATIVE — Supabase RPC, the generated-types pipeline and the e2e harness all exist. No
new dependency, token, or ADR (ADR 0084 already governs in-database aggregation; ADR 0083 the isolation).
**Future alignment:** N/A — no VISION.md.

**Stack extensions required:** none.

## Why this over alternatives

- **Ship it all in one 38-file PR with the bento (rejected — 👤 decision, on the critic's finding).** The
  bento's component edits are atomically coupled to their `usedIn` deltas by exact-set gates and cannot be
  split internally; the SQL + entity layer is the **only** clean seam that touches no graph node and no UI.
  Splitting it out lets `supabase-rls-reviewer` review the security surface on its own and shrinks the UI PR
  to ~31 files.
- **Drop the conversion mini's sparkline instead of adding `purchasers` (rejected — 👤 decision).** Zero new
  SQL beyond the scatter, but it would leave a visible fidelity hole in the very effort whose purpose is
  fidelity to the frozen reference.
- **Compute the conversion series in the client from two RPC calls (rejected).** It would be an app-code
  reduction over event rows — exactly what ADR 0084 forbids. A per-bucket ratio of two already-reduced
  scalars returned by ONE call is presentation; joining two result sets client-side to manufacture the
  numerator is not.
- **Add a dedicated `fn_overview_conversion_signal` (rejected).** A second function returning the same
  bucket spine for one derived series duplicates the reduction and doubles the fetch; one extra column on
  the existing function is strictly smaller.
- **Return the scatter unbounded and cap in the client (rejected).** The cap belongs in SQL — a client-side
  slice would ship every user's row over the wire and read as a client reduction.

## Test Plan

- **Harness:** Vitest (`npm run test`) for the fetcher unit test; Playwright (`npm run test:e2e`) for the
  in-database proof — bootstrap-deferred from CI, run locally against the seeded stack.
- **Test locations:** `src/entities/segment/api/queries.test.ts` (extend); `e2e/overview.spec.ts` (extend).
- **Conventions:**
  - Fetcher: the existing `rpcReturning` mock — assert `(name, args)`, rows on success, `[]` on null,
    throw-on-error.
  - SQL fixture: mirror `e2e/funnels.spec.ts` / the existing `overview.spec.ts` cases — `signIn()` as the
    seeded member (`bob@capcom.dev`, Aurora) and the non-member (`carol@capcom.dev`, Globex), pinned window
    constants, assert tenant-scoped **invariants** rather than exact magnitudes so the test does not drift
    with the seed.
  - RLS: the `supabase-rls-reviewer` agent on both migration diffs (static properties, AC1/AC2); runtime
    isolation is proven by AC4.
- **Requires:** `npm run db:reset` + `SEED_EVENTS_ANCHOR=… npm run seed:events` before `npm run test:e2e`
  (documented in the spec file header).

## Definition of Done

- [ ] `npm run test` green; `npm run test:coverage` >= 80%.
- [ ] `npm run test:e2e` green locally for `e2e/overview.spec.ts` (after `db:reset` + a pinned
      `SEED_EVENTS_ANCHOR`).
- [ ] `npm run gen:types` run and `database.types.ts` committed (no drift).
- [ ] `supabase-rls-reviewer` clean on both migrations.
- [ ] The shipped Overview still renders unchanged (the column add is additive; `SignalMeasure` is a
      hand-written union).
- [ ] `tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run build` green.
- [ ] `docs/capcom/console-redesign-progress.md` updated — **before the PR**.
- [ ] Chromatic: **N/A** — no UI changes in this PR. (Note: the Chromatic job is inert repo-wide until
      `CHROMATIC_PROJECT_TOKEN` is provisioned by a 👤.)
- [ ] Single human-reviewed PR into `dev`; Conventional Commits; no AI attribution.

## Non-goals

- Any component, render, story-behaviour or composition-graph change (F10 adds one field to a typed story
  fixture so `tsc` stays green — the story renders identically) — that is the sibling `overview-bento-fidelity`
  spec (this PR deliberately leaves the shipped Overview visually identical).
- Widening `SignalChart`'s `SignalMeasure` union or teaching it derived series — sibling spec.
- A goals/targets table (deferred to its own ADR by spec 003).
- Dropping or reshaping any existing RPC; adding a second datastore or a materialized rollup.
- Reconciling the two sources of `plan` (event `properties` vs `profiles.traits`) — see Assumptions.

## Assumptions

- **`plan` on the scatter comes from `profiles.traits->>'plan'`**, whereas `fn_event_trends`' breakdown
  reads the **event's** `properties->>'plan'`. They agree only because `scripts/seed-events.mjs` stamps both
  (`:122`, `:174`) — a seed guarantee, not an ingest guarantee (ADR 0085). Acceptable for a seeded demo;
  reconciling them is a stated non-goal.
- **`purchasers` is `count(distinct distinct_id)` where `event_name='purchase'`** in the bucket — the same
  definition `fn_overview_kpis` uses for its scalar, so the sparkline and the KPI agree by construction.
  **This distinct-user property is assumed, not proven:** the seed cannot discriminate it (a same-day repeat
  purchase — the only case where `count(*)` and `count(distinct)` diverge — is under one expected user-day
  across the whole seed), so AC4(c)'s identity proves window/filter/spine parity only. An earlier draft
  claimed `purchasers <= active_users` pinned it; that is false and was removed.
- **The scatter's default cap is 300 points**, ordered by `ltv desc` — a readable, bounded set for a demo.
- `ltv` is the sum of `properties->>'amount'` over `purchase` events (the seed's amount unit), 0 for a user
  with no purchases — matching `fn_events_summary`'s numeric-gate idiom.

## Open Questions

none

## Security / NFR

- **Auth/RLS (touched):** both functions are `SECURITY INVOKER` with a pinned `search_path` and
  authenticated-only EXECUTE; isolation is inherited from the ADR 0083 membership join (a non-member reduces
  zero rows). The `profiles` join is safe under the existing "Members read profiles in their projects"
  policy. No service-role path; the client never supplies a tenant id. Static properties verified by
  `supabase-rls-reviewer` (AC1/AC2); runtime isolation by AC4.
- **PII:** the scatter returns `distinct_id` — a pseudonymous tracked-user key (ADR 0083), never an
  `auth.users` identity — plus aggregates. It is consumed as anonymous points; no identifier is displayed.
- **Injection:** no dynamic SQL — static set-based queries with typed parameters; the fetcher passes a typed
  arg bag with no string assembly.
- **Performance:** set-based reductions over the existing `(project_id, ts)` index at seeded-demo volume; the
  scatter is capped in SQL. `fn_overview_signal` gains one aggregate over the same scan.
- **Rollout:** additive and reversible, but the reversal is **drop-then-recreate + re-issue
  revoke/grant/comment for BOTH functions** — see Data & Config. A rollback that merely re-applied
  `fn_overview_signal`'s prior body would leave `EXECUTE` granted to `public` (the same `anon` escalation
  this PR exists to avoid). No data migration.
- **a11y/i18n:** N/A — no UI in this PR.

## Critic Verdict & Overrides

- **Round 1: BLOCK** — five blockers, all real, all accepted:
  1. **The migration would not have applied.** F2 said `CREATE OR REPLACE`; Postgres rejects a changed
     `RETURNS TABLE` row type. Verified: the repo has **zero** `create or replace function` migrations and
     the shipped idiom is drop-first, with its rationale at
     `20260709120000_events_filtered_summary_and_facets.sql:27-28`. → F2 rewritten to drop-then-create.
  2. **A privilege escalation.** The DROP that fix forces silently discards the GRANTs, and
     `CREATE FUNCTION` grants `EXECUTE` to `PUBLIC` by default — `anon` would have gained EXECUTE, which is
     AC1's own named failure mode, in the PR carved out _for_ the security review. → F2 now mandates
     re-issuing `revoke`/`grant`/`comment` (the precedent does exactly this at `:141-151`).
  3. **A `tsc` break behind a "nothing breaks" claim.** `SignalChart.stories.tsx:15-20` is a typed
     `OverviewSignalBucket[]` literal with exactly four keys; `gen:types` emits columns as required → TS2739.
     → F10 added; the additive claim rescoped to **runtime**; **AC2 moved off prose-review to a command
     oracle** (`tsc && build && test`) — prose-review is precisely what let this through.
  4. **A vacuous cap assertion** — 160 seeded users vs a 300 default cap passes even with no LIMIT clause.
     → explicit `p_limit=10`, exactly 10 rows.
  5. **An oracle that could not fail** — `purchasers <= active_users` does not catch a `count(*)` bug
     (seeded purchases are far too rare). → the non-empty-bucket identity against `fn_overview_kpis`.
- **Round 2: BLOCK** — "the design is now sound; the spec is internally inconsistent about it". The AC4 fix
  had not propagated: **F8 — the file that implements AC4 — still prescribed the rejected assertions**, and
  `CREATE OR REPLACE` / `purchasers <= active_users` survived in four prose sections. → F8 rewritten to
  mirror AC4 clause-for-clause; all stale prose purged. Both warnings also taken: the identity now requires
  `purchasers > 0` first (else it passes vacuously as `0 === 0`), and its claim is scoped honestly — it
  proves window/filter/spine **parity**, not distinct-vs-row-count, for which **no deterministic proof
  exists against this seed**.
- **Round 3: PASS WITH WARNINGS** — F8 confirmed consistent with AC4 clause by clause; no surviving
  `CREATE OR REPLACE` / `<=` / "no UI" instruction (only historical, rejecting mentions); Chromatic N/A
  confirmed byte-identical. Three warnings fixed before sealing: (1) the **last** refuted rollback survived
  in **Security/NFR** — the section the `supabase-rls-reviewer` reads — now corrected to drop-then-recreate
  - re-issue; (2) AC4(a) said "descending" while F8 said "non-increasing" — seeded amounts come from
    `[19,49,99,199]` so top-10 ties are likely and the file's strict ordering idiom
    (`e2e/overview.spec.ts:146-148`) would flake — AC4 aligned to non-increasing; (3) this verdict recorded.
    **Override:** none — no blocker outstanding.

## Design Notes

- **Why a column and not a function.** `fn_overview_signal` already computes the bucket spine and scans the
  same rows; `purchasers` is one more aggregate over that scan. A separate function would duplicate the
  spine and double the round-trip.
- **The additive guarantee is a RUNTIME guarantee, not a type-layer one.** `SignalMeasure`
  (`SignalChart.tsx:29`) is hand-written, so a new generated column cannot break the current widget — this
  PR is visually a no-op and can merge before any bento work exists. But `gen:types` marks columns
  **required**, so the typed story fixture must absorb it (F10) or `tsc` reddens. The first draft asserted
  "nothing breaks" from the runtime fact alone and was wrong.
- **Assert invariants, not magnitudes**, in the e2e — the seed is regenerated with a wall-clock anchor for
  the demo, so exact counts drift. But an invariant that cannot fail is not a test: `rows <= p_limit`
  (300 cap, 160 users), `frequency >= 1` (true by construction) and `ltv >= 0` (all seeded amounts positive)
  are all tautologies, and `purchasers <= active_users` does **not** catch the row-count bug it was claimed
  to catch — seeded purchases are far too rare. Hence AC4's explicit `p_limit=10` and the non-empty-bucket
  identity: assertions that can actually go red.
- This spec exists because the critic traced a chain: retaining `SignalChart` (round-1 fix) → the minis need
  its series → `fn_overview_signal` has no `purchasers` → the "only the scatter needs new SQL" claim was
  false. Fixing one finding surfaced the next.

## Future Considerations

- The sibling `overview-bento-fidelity` spec consumes both of these (its `depends_on` names this slug) and
  must not be sealed until this ships.
- Reconciling the two sources of `plan` so breakdowns survive real ingest (ADR 0085) rather than relying on
  the seed stamping both.
- A goals/targets table (its own ADR) would let the Overview's goal cell state a real target.

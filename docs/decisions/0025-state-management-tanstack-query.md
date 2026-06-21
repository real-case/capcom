---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Server-state on the client via TanStack Query

## Context and Problem Statement

In the RSC-default model (**0002**), the server fetches data for initial render, and the
data-access layer (**0013**) runs on the server. But interactive client features still need
*client-side server state*: data fetched, cached, refetched, invalidated, and mutated from
client components after hydration — search-as-you-type, paginated lists, optimistic updates,
background refresh. Managing this by hand (loading/error flags, caching, dedup, invalidation
in `useEffect`) is repetitive and bug-prone.

The project must decide how client components manage server-derived state, and how that
coexists with RSC remaining the default for initial/server data — without turning everything
into a client-fetched SPA.

## Decision Drivers

* **RSC stays the default** — initial and server-rendered data continues to come from Server
  Components (**0002**, **0013**); the client cache is for interactive, post-hydration needs.
* **Caching, invalidation, refetch, mutations** — client server-state needs these primitives
  without hand-rolling them.
* **Predictable keys and invalidation** — a consistent query-key scheme so caches invalidate
  correctly.
* **Hydration boundary** — a clean way to hand server-fetched data to the client cache when
  needed.
* **Perceived responsiveness** — mutations should feel instant, so the library must support
  optimistic cache updates with safe rollback as a first-class pattern.

## Considered Options

* TanStack Query for client server-state
* SWR
* No client cache library — only RSC + Server Actions

## Decision Outcome

Chosen option: "TanStack Query", because it provides mature caching, background refetch,
invalidation, and mutation primitives for client-side server state, with first-class support
for handing RSC-fetched data to the client cache. RSC remains the default for initial and
server-rendered data (**0002**, **0013**); TanStack Query handles interactive client data
needs. A provider in `src/app/providers.tsx` supplies a server-aware `QueryClient` singleton
(one client per request on the server, a stable client in the browser). Query keys follow a
documented convention so invalidation is predictable.

**Optimistic UI is the preferred mutation pattern, applied first by default.** Mutations
update the query cache immediately and roll back on error (`onMutate` → `onError` rollback →
`onSettled` invalidate), so the interface feels instant. Reach for optimistic UI first; a
mutation falls back to a plain pending/awaiting pattern only when there is an **objective
reason** not to be optimistic, namely:

- the action is irreversible or high-stakes (e.g. payments, destructive operations with no
  undo), where showing an unconfirmed result is unacceptable;
- the server produces a result the client cannot predict and must display (server-generated
  identifiers, derived totals, ordering) before it is known;
- server-only validation could plausibly reject the input, so presenting it as applied would
  mislead the user.

Absent such a reason, optimistic is the default, and any non-optimistic mutation is justified
in code review.

### Consequences

* Good, because caching, dedup, refetch, and invalidation are handled by a mature library
  rather than hand-rolled per feature.
* Good, because RSC stays the default — Query is additive for interactivity, not a wholesale
  move to client fetching.
* Good, because mutations have a standard, testable pattern, and optimistic UI — the
  preferred default (see Decision Outcome) — makes them feel instant with safe rollback.
* Bad, because it adds a client dependency and the discipline of managing query keys and
  cache lifetimes.
* Bad, because the RSC/Query boundary must be drawn deliberately, or data ends up fetched
  twice (once on the server, again on the client) — a misuse to guard against.
* Bad, because optimistic updates add per-mutation rollback/reconciliation complexity, and
  applying them where they do not fit (irreversible or unpredictable operations) can briefly
  show state that never commits — hence the objective-reason carve-out in the Decision
  Outcome.

### Confirmation

`src/app/providers.tsx` provides a server-aware `QueryClient`; client components use Query
hooks for interactive server data while initial data comes from RSC; query-key conventions
are documented and followed. Mutations default to optimistic updates with rollback; any
non-optimistic mutation carries a stated objective reason, checked in code review.

## Pros and Cons of the Options

### TanStack Query (chosen)

* Good, because it is the most capable client server-state library (cache, refetch,
  mutations, devtools).
* Good, because it integrates with RSC hydration and keeps RSC the default.
* Bad, because it adds a dependency and query-key/cache discipline.

### SWR

* Good, because it is lightweight and ergonomic for simple fetching.
* Neutral, because it covers caching and revalidation.
* Bad, because its mutation, invalidation, and devtools story is thinner than TanStack
  Query's for the more complex interactive flows expected here.

### No client cache (RSC + Server Actions only)

* Good, because it is the simplest model with no extra dependency.
* Neutral, because it suffices for largely static, server-rendered pages.
* Bad, because genuinely interactive client data (live search, optimistic updates,
  background refresh) then requires hand-written fetch/cache logic — re-implementing exactly
  what TanStack Query provides.

## More Information

Builds on **0002** (RSC default) and **0013** (server data access). The split between this
server-state cache and purely client-side UI state is drawn in **0026** (Zustand); both are
client-only concerns layered over the RSC default.

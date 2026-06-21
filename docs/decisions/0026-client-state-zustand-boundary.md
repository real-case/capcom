---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Client/UI state with Zustand, bounded against TanStack Query's server state

## Context and Problem Statement

TanStack Query (**0025**) owns *server state* — data that originates on the server, is
cached on the client, and can go stale. But applications also have *client state* that never
lives on the server: whether a drawer is open, a multi-step wizard's current step, a
client-side filter or view preference, transient UI toggles. This state needs a home, and it
needs one that does **not** overlap with Query.

The real risk this decision addresses is not "which store library" but the **boundary**:
teams routinely copy server data into a global client store, where it immediately becomes a
second, staleness-prone source of truth that Query is supposed to manage. The decision must
both pick a client-state tool and draw a hard line between it and Query.

## Decision Drivers

* **Clear separation from server state** — client state must not duplicate or shadow data
  that TanStack Query (**0025**) already owns.
* **Low boilerplate** — a small global store without the ceremony of a full flux framework.
* **Selective subscriptions** — components re-render only on the slices they read.
* **Client-only by construction** — stores are client concerns layered over the RSC default
  (**0002**); they must not leak into Server Components.

## Considered Options

* Zustand for client/UI state, with an explicit boundary against TanStack Query
* Redux Toolkit
* Jotai
* React Context (+ `useReducer`)

## Decision Outcome

Chosen option: "Zustand, with an explicit Query boundary", because it offers minimal-
boilerplate global client state with selector-based subscriptions and no provider tree, and
its small surface makes the discipline easy to keep. The governing rule is the boundary:

- **TanStack Query (0025)** holds anything server-derived — fetched entities, lists,
  anything cached from or persisted to the database.
- **Zustand** holds only client-only, ephemeral UI state that should *not* live in the URL:
  open/closed UI (modals, drawers, menus), multi-step flow progress, and transient
  interaction state.
- **URL search params (nuqs, 0027)** hold state that should be shareable, bookmarkable, and
  survive reload/back-forward — search query, filters, sort, pagination, selected tab. Such
  state lives in the URL, not Zustand.
- **Server data is never mirrored into Zustand.** If a piece of state can become stale
  relative to the server, it belongs in Query, not a store.
- **Optimistic UI lives in the Query cache, not Zustand.** Optimistic updates are applied to
  the TanStack Query cache with rollback on error (**0025**), where optimistic UI is the
  preferred default mutation pattern. Zustand is not used to stage unconfirmed server state.

Stores are `"use client"` modules; Server Components never import them.

### Consequences

* Good, because client UI state has a lightweight, ergonomic home without flux boilerplate.
* Good, because the explicit boundary prevents the classic bug of a global store shadowing
  server data and drifting out of sync.
* Good, because selector subscriptions keep re-renders narrow.
* Bad, because the boundary is a convention, not something the type system enforces — it
  relies on review discipline to keep server data out of Zustand.
* Bad, because two state systems (Query + Zustand) mean contributors must learn which is
  which; the rule above exists precisely to make that call unambiguous.

### Confirmation

Zustand stores contain no server-fetched entities (server data is accessed via Query hooks);
stores are client-only modules not imported by Server Components; code review checks new
state against the boundary rule. The convention is documented alongside the stores.

## Pros and Cons of the Options

### Zustand + explicit boundary (chosen)

* Good, because it is minimal-boilerplate, provider-free, with selector subscriptions.
* Good, because its small surface makes the server/client boundary easy to hold.
* Bad, because the boundary is convention-enforced, not compiler-enforced.

### Redux Toolkit

* Good, because it is powerful, with mature devtools, middleware, and a large ecosystem.
* Neutral, because RTK Query could even cover server state.
* Bad, because its boilerplate and ceremony are disproportionate for the small amount of
  purely-client state remaining once TanStack Query (**0025**) owns server state.

### Jotai

* Good, because atomic state is granular and ergonomic, with minimal boilerplate.
* Neutral, because it would serve client UI state well.
* Bad, because the atom model is a different mental model with less of a single,
  inspectable store; for this project's modest client-state needs Zustand's store is
  simpler to reason about and bound.

### React Context (+ useReducer)

* Good, because it needs no dependency and is built in.
* Bad, because Context re-renders all consumers on any change (no selector subscriptions),
  and threading multiple providers for distinct UI concerns gets unwieldy as state grows.

## More Information

Builds on **0002** (client modules over the RSC default) and **0025** (the server-state
owner this is bounded against). Together with **0027**, they define the full state
model: server state in Query, URL-owned state in the URL (nuqs, **0027**), and ephemeral
client/UI state in Zustand, with no overlap. Optimistic UI is explicitly Query's job (the
preferred default mutation pattern, **0025**), not Zustand's.
This boundary is the project-specific convention most worth revisiting as real features
reveal edge cases (e.g. form draft state) — a superseding ADR would record any change.

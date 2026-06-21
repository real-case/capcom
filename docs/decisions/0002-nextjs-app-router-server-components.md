---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Adopt Next.js App Router with React Server Components as the default

## Context and Problem Statement

Per **CON-002**, Next.js (App Router) is the mandated application framework, and per
**CON-001**, React is the mandated UI library — neither is re-argued here. What remains a
genuine decision is the *rendering paradigm within Next.js*: which router model to build
on (the modern App Router or the legacy Pages Router), and what the default rendering
strategy should be (Server Components vs Client Components, where data is fetched, how
mutations are issued).

This choice shapes every component, data-access, and state decision that follows, so it
must be settled before any UI or data code is written. How should this project structure
rendering and routing on top of the mandated Next.js?

## Decision Drivers

* **Forward alignment** — the framework's own roadmap and docs treat the App Router and
  React Server Components (RSC) as the default; new features land there first.
* **Minimal client JavaScript** — server-first rendering keeps interactive client bundles
  small, which matters for performance and SEO.
* **Server-side data access** — fetching data on the server (close to Supabase) avoids
  client round-trips and keeps secrets server-side.
* **Streaming and layouts** — nested layouts, suspense streaming, and partial rendering
  are App-Router-native capabilities.
* **Agent legibility** — a single, consistent rendering convention is easier for an agent
  to apply uniformly than a mix of paradigms.

## Considered Options

* App Router with React Server Components as the default (Client Components at interactive leaves)
* Pages Router (legacy `getServerSideProps` / `getStaticProps` data model)
* App Router but with Client Components as the default

## Decision Outcome

Chosen option: "App Router with React Server Components as the default", because it aligns
with the mandated framework's primary direction, minimizes shipped client JavaScript, and
puts data access on the server next to Supabase. Components are Server Components by
default; Client Components are used only at interactive leaves (marked `"use client"`).
Mutations use Server Actions where they fit, falling back to route handlers for
webhook-style or external-caller endpoints. App code lives under `src/app/`. React 19 is the
pinned major version (`react` / `react-dom` at `^19`), required by the App Router's RSC and
Server Actions model and relied on by the React Compiler (**0029**).

### Consequences

* Good, because server-first rendering reduces client bundle size and improves
  first-load and SEO characteristics.
* Good, because data fetching sits on the server, close to the datastore and away from
  the client, simplifying the later data-access and secrets decisions.
* Good, because it tracks the framework's actively developed path, reducing future
  migration pressure.
* Bad, because RSC has a steeper mental model (server/client boundary, serialization
  limits) that the team and agent must internalize.
* Bad, because some client-oriented libraries assume Client Components and need explicit
  `"use client"` boundaries or wrappers.

### Confirmation

The `src/app/` directory layout, the default absence of `"use client"` in
server-rendered files, and Server Actions for mutations are verifiable by inspection and
in code review. `package.json` pins `react` and `react-dom` at `^19`. ESLint (Next.js plugin)
flags common App-Router and RSC misuse.

## Pros and Cons of the Options

### App Router with RSC default (chosen)

* Good, because it is the framework's default and best-supported path.
* Good, because server-default rendering minimizes client JS and co-locates data access
  with the server.
* Good, because nested layouts and streaming come for free.
* Bad, because the server/client boundary adds conceptual overhead.

### Pages Router (legacy)

* Good, because it is mature, widely documented, and conceptually simpler.
* Neutral, because it still receives maintenance, but not new feature investment.
* Bad, because it is the legacy path — new framework capabilities target the App Router,
  so building greenfield on it incurs future migration debt.
* Bad, because its data model (`getServerSideProps` etc.) is being superseded by RSC and
  Server Actions.

### App Router with Client Components default

* Good, because it sidesteps the RSC mental model and behaves like a classic SPA.
* Bad, because it forfeits the central benefit of the App Router — small server-rendered
  payloads — shipping more JavaScript than necessary.
* Bad, because it pushes data access to the client, complicating secrets handling and the
  later data-access decision.

## More Information

Resolves the residual choice left open by **CON-002** (and subsuming **CON-001**'s UI
library); the constraints registry back-links to this record. Builds on the ADR practice
established in **0001**. Every subsequent decision about data access, server/client state,
forms, and the component layer assumes the RSC-default model fixed here.

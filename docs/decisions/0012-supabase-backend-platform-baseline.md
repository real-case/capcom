---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Supabase as the backend platform, scoped to a Postgres + RLS + Auth baseline

## Context and Problem Statement

The application needs a backend: a database, authentication, and a place for
server-authoritative data. Unlike React and Next.js (recorded as constraints CON-001 and
CON-002), no backend platform is externally mandated, so this is a genuine architectural
decision with real alternatives — and a costly one to reverse, since data model, auth, and
authorization all bind to it.

Supabase is a broad suite (Postgres, Auth, Storage, Edge Functions, Realtime). Adopting it
wholesale up front would commit the project to surface area it may never use. So the
decision has two parts: which platform, and how much of it to adopt now versus defer.

## Decision Drivers

* **Integrated Postgres + Auth + authorization** — one managed platform covering the
  relational store, authentication, and row-level authorization reduces moving parts.
* **Server-runtime fit** — must work cleanly with the App Router/RSC model (**0002**) on
  the full Node runtime (**0004**), and deploy well alongside Vercel.
* **Authorization at the data layer** — Postgres Row-Level Security lets authorization live
  next to the data rather than being reimplemented in app code.
* **Type generation** — a SQL schema enables generated TypeScript types feeding the strict
  type policy (**0003**).
* **Avoid premature surface area** — adopt only what the project needs now; defer the rest
  behind explicit later decisions.

## Considered Options

* Supabase, scoped to a baseline of Postgres + Row-Level Security + Auth
* Firebase (Firestore + Firebase Auth)
* Self-hosted/managed Postgres with a separate auth library
* PlanetScale (MySQL) with a separate auth provider

## Decision Outcome

Chosen option: "Supabase, scoped to a Postgres + RLS + Auth baseline", because it delivers
a managed relational database, authentication, and data-layer authorization as one platform
that fits the Node/RSC/Vercel stack, while a SQL schema gives a clean source for generated
types. Adoption is deliberately **scoped to a baseline**: Postgres, Row-Level Security, and
Auth. Storage, Edge Functions, and Realtime are out of scope until a concrete need arises,
each to be adopted by its own ADR. This records the platform and the feature boundary; the
*how* (data-access pattern, migrations, type generation, auth method) follows in dependent
records.

### Consequences

* Good, because relational data, auth, and RLS authorization come from one coherent
  platform instead of three integrations.
* Good, because Postgres + RLS keeps authorization next to the data, and the SQL schema
  feeds generated types.
* Good, because the explicit baseline boundary prevents accidental sprawl into unused
  surface area.
* Bad, because it is a significant platform coupling — data model, auth, and authorization
  all depend on Supabase, so migrating away later is expensive.
* Bad, because some Supabase capabilities are newer/less battle-tested than long-standing
  self-managed equivalents, and self-hosting Supabase for parity adds operational load.

### Confirmation

The project depends on the Supabase client libraries and CLI; the baseline scope (Postgres
+ RLS + Auth) is documented here, and any adoption of Storage/Edge Functions/Realtime
requires a new ADR. The data-access, migration, type-generation, and auth records that
build on this one make the platform's use concrete and reviewable.

## Pros and Cons of the Options

### Supabase, baseline scope (chosen)

* Good, because it integrates Postgres, Auth, and RLS in one managed platform.
* Good, because relational + SQL schema suits typed, server-rendered data access.
* Neutral, because it adopts only a baseline now, deferring the rest.
* Bad, because it is a deep platform coupling that is costly to reverse.

### Firebase

* Good, because it is mature, with real-time sync and a generous free tier.
* Neutral, because Firebase Auth is capable and widely used.
* Bad, because Firestore is a document store — a poor fit for relational data and for
  generated relational types — and it has no Postgres-style row-level SQL authorization.

### Self-managed Postgres + separate auth library

* Good, because it is maximally flexible and avoids platform lock-in.
* Good, because Postgres + RLS is exactly the desired data/authorization model.
* Bad, because assembling and operating auth, hosting, backups, and RLS tooling by hand is
  far more work than a managed platform provides out of the box.

### PlanetScale + separate auth provider

* Good, because it offers excellent MySQL scaling and branching workflows.
* Bad, because MySQL lacks Postgres's RLS model, so authorization must move into app code,
  and auth becomes yet another separate integration.

## More Information

Builds on **0001** (ADR practice) and **0002** (the RSC server model that consumes this
backend). The records that make this concrete — data-access boundary and RLS, migrations,
type generation, and authentication — follow as dependent decisions. Expansions beyond the
baseline (Storage, Edge Functions, Realtime) are explicitly deferred, each to its own ADR.

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Data access via @supabase/ssr with RLS as the authorization boundary

## Context and Problem Statement

With Supabase adopted as the backend baseline (**0012**) and the App Router/RSC model fixed
(**0002**), the project must decide *how* code reaches the database: where Supabase clients
are created, how they carry the user's session across the server/client boundary, and where
authorization is enforced.

This is a security-critical decision. Next.js runs code in three places — Server Components,
client components, and route handlers/Server Actions — each needing a correctly-scoped
client. Get the session handling or the privilege model wrong and the app either breaks
auth or, worse, leaks data across users. The central question is whether authorization
lives in the database (Postgres RLS) or in application code, and how sessions flow through
SSR.

## Decision Drivers

* **Server-first data access** — RSC fetches data on the server (**0002**), so the default
  path must be a cookie-bound server client.
* **Authorization that can't be bypassed** — enforcing access rules in the database holds
  regardless of which code path issues the query.
* **Correct session propagation** — the user's session must survive SSR, refresh in
  middleware, and be readable by Server Components and route handlers.
* **No privilege leakage** — the service-role key must never reach the browser or be used
  for user-facing reads.

## Considered Options

* `@supabase/ssr` with request-scoped browser/server clients, RLS as the authorization boundary
* A hand-built data-access layer behind route handlers/API only (no direct DB from RSC)
* The plain `supabase-js` client used directly from client components

## Decision Outcome

Chosen option: "`@supabase/ssr` with request-scoped clients and RLS as the authorization
boundary", because it matches the RSC server-first model, propagates the session via cookies
across SSR, and pushes authorization into Postgres where it cannot be bypassed by an
app-code mistake. A request-scoped **browser client** is used in client components; a
request-scoped **server client** (cookie-bound) is used in Server Components, route handlers,
and Server Actions. All user-facing access runs **as the user**, governed by RLS policies;
the **service-role** key is confined to trusted server-only contexts (e.g. admin tasks,
webhooks) and never exposed to the client. Clients live under `src/lib/supabase/`. Session
refresh happens in middleware so every request carries a fresh session. Server code that needs
the authenticated identity reads it through a **verifying** call — `getClaims()` (local JWT
signature verification) or `getUser()` (revalidation against the Auth server) — never
`getSession()`, which only deserializes the cookie and is therefore not a trust boundary on the
server.

### Consequences

* Good, because authorization in the database holds across every query path, shrinking the
  app's security-critical surface.
* Good, because `@supabase/ssr` handles cookie-based sessions correctly for the App Router,
  including refresh in middleware.
* Good, because request-scoped clients avoid cross-request state bleed in a server runtime.
* Bad, because RLS policies are SQL that must be written, tested, and kept in step with the
  schema — a real authoring and review burden.
* Bad, because the service-role escape hatch is dangerous if misused, so it needs strict
  conventions and review.

### Confirmation

Browser/server client factories exist under `src/lib/supabase/`; middleware refreshes the
session each request; RLS policies are defined in migrations and exercised by e2e tests
(**0007**). Service-role usage is grep-auditable and confined to server-only modules.
Trusted-identity reads use `getClaims()` / `getUser()`; `getSession()` is never used to gate
access on the server (grep-auditable; checked by the diff-scoped security review, **0056**).

## Pros and Cons of the Options

### @supabase/ssr + RLS (chosen)

* Good, because it fits RSC, handles SSR sessions, and enforces authorization in the DB.
* Good, because request-scoped clients are safe under a server runtime.
* Bad, because RLS policies add SQL authoring and testing overhead.

### Hand-built data layer behind route handlers only

* Good, because it centralizes all data access behind one explicit API surface.
* Neutral, because it can still use RLS underneath.
* Bad, because it forfeits direct server-side fetching in Server Components — the
  ergonomic core of the RSC model — adding an indirection layer for every read.

### Plain supabase-js from client components

* Good, because it is the simplest to wire up initially.
* Bad, because it pushes data fetching to the client, complicates SSR session handling, and
  tempts exposing privileged keys — directly at odds with the server-first, no-leak drivers.

## More Information

Builds on **0002** (RSC model) and **0012** (Supabase baseline, which named RLS as the
authorization model). The authentication method that populates these sessions is decided in
**0016**; the migrations that define RLS policies and the generated types for query results
are decided in **0014** and **0015**.

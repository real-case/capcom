---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Authentication via Supabase Auth, email/password as the baseline method

## Context and Problem Statement

The application needs authentication: a way to establish who a request is from, so that the
RLS authorization layer (**0013**) has an identity to enforce policies against. With Supabase
adopted as the backend baseline (**0012**) — which explicitly includes Auth — the platform
is fixed, but two decisions remain: which authentication *mechanism* sits in front of it,
and which *method(s)* to enable first.

Choosing the mechanism wrongly is costly: layering a second auth framework over Supabase
duplicates session handling and risks the two disagreeing about who the user is, which is
exactly the kind of inconsistency that breaks RLS-based authorization.

## Decision Drivers

* **Identity for RLS** — the authenticated user id must be the one RLS policies (**0013**)
  evaluate (`auth.uid()`), with no second source of truth.
* **One session model** — session creation, refresh, and reading should flow through a
  single library across SSR, not two competing ones.
* **Start simple, stay extensible** — a baseline method now, with room to add OAuth
  providers and richer flows later without re-architecting.
* **Fits @supabase/ssr** — the auth mechanism must integrate with the cookie-based SSR
  session handling already chosen in **0013**.

## Considered Options

* Supabase Auth directly, email/password as the baseline method
* NextAuth / Auth.js layered over Supabase
* A custom JWT-based authentication implementation

## Decision Outcome

Chosen option: "Supabase Auth directly, email/password baseline", because it keeps a single
session model that `@supabase/ssr` (**0013**) already handles and makes the Supabase user id
the one identity RLS evaluates — no second auth authority to reconcile. Email/password is the
baseline method, sufficient to exercise the full auth + RLS path end-to-end; OAuth providers,
magic links, and richer flows are deferred to later ADRs. Sessions are refreshed in
middleware so every request carries a current session; RLS policies authorize against
`auth.uid()`. On the server, the authenticated identity is read through a verifying call
(`getClaims()` / `getUser()`), never `getSession()` — the trusted-identity rule recorded in
**0013**.

### Consequences

* Good, because there is one identity and one session model, so RLS authorization and the
  app never disagree about who the user is.
* Good, because it reuses the `@supabase/ssr` session handling from **0013** with no extra
  integration layer.
* Good, because the baseline is small enough to test fully (**0007**) yet extends to OAuth
  later without rework.
* Bad, because email/password alone means owning verification and password-reset email flows
  (deferred, but eventually required).
* Bad, because authentication is now coupled to Supabase — though this coupling was already
  accepted with the backend baseline (**0012**).

### Confirmation

Auth uses the `@supabase/ssr` clients (**0013**); middleware refreshes the session each
request; RLS policies reference `auth.uid()`; the sign-in/sign-up path is covered by e2e
tests (**0007**). Additional methods (OAuth, magic link) each arrive via their own ADR.

## Pros and Cons of the Options

### Supabase Auth directly (chosen)

* Good, because it is one identity and one session model, integrated with RLS and SSR.
* Good, because the baseline is testable now and extensible later.
* Bad, because email/password entails owning email flows (deferred).

### NextAuth / Auth.js over Supabase

* Good, because it offers many providers and a large ecosystem out of the box.
* Neutral, because it can be made to work with Supabase as a backend.
* Bad, because it introduces a second session/identity layer over Supabase's own, risking
  divergence with `auth.uid()` and complicating the RLS model that depends on a single
  identity.

### Custom JWT authentication

* Good, because it offers total control over tokens and flows.
* Bad, because it means reimplementing—and securing—session issuance, refresh, and storage
  that the platform already provides, a large surface for security bugs with no upside here.

## More Information

Builds on **0012** (Supabase baseline including Auth) and **0013** (the `@supabase/ssr`
session handling and RLS authorization this populates). Future authentication methods (OAuth
providers, magic links, password-reset email flows) are deferred, each to its own ADR; the
transactional email needed for those flows is out of the current scope.

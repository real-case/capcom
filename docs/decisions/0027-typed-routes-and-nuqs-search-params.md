---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Type-safe routing and URL search-param state: Next.js typed routes + nuqs

## Context and Problem Statement

In the App Router (**0002**), the URL boundary is stringly-typed by default. Navigation
targets are raw strings (`<Link href="/dashbaord">` compiles fine and 404s at runtime), and
search params arrive as `string | null` requiring manual parsing and validation
(`searchParams.get("page")` → parse → default). This is exactly where the strict-typing
policy (**0003**) silently breaks down: typos in routes and ad-hoc query-string parsing are
not caught by the compiler.

There is also a state-model gap. Some state belongs in the **URL** — it should be shareable,
bookmarkable, and survive reload and back/forward navigation (search query, filters, sort,
pagination, selected tab). The current state model covers server cache (**0025**, TanStack
Query) and ephemeral client state (**0026**, Zustand) but has no first-class home for
URL-owned state. The project needs type-safe navigation and typed, declarative
search-param state.

## Decision Drivers

* **Extend strict typing to the URL** — link targets and search params should be
  type-checked, not raw strings (**0003**).
* **Compile-time broken-link detection** — renamed or mistyped routes should fail the build,
  not in production.
* **Declarative, typed search-param state** — read/write search params as typed values with
  parsers and defaults, not manual `useSearchParams` + parsing.
* **A home for URL-owned state** — distinguish state that belongs in the URL from server
  cache (**0025**) and ephemeral client state (**0026**).
* **App Router / RSC fit** — both must work with the App Router model (**0002**).

## Considered Options

* Next.js typed routes (`typedRoutes`) + nuqs for search-param state
* Manual: untyped string `href`s + raw `useSearchParams` / `searchParams` with hand-written parsing
* A route-helper / typesafe-URL library (e.g. `next-typesafe-url`) covering both routes and params

## Decision Outcome

Chosen option: "Next.js typed routes + nuqs", because typed routes is the framework-native
way to type-check navigation and nuqs is purpose-built for search params as typed React
state, together extending the strict-typing guarantee (**0003**) across the whole URL
boundary. Concretely:

- **Typed routes:** enable Next.js typed routes (the `typedRoutes` config option) so `<Link
  href>` and router navigation are checked against the project's actual routes — a renamed or
  mistyped route fails at build time.
- **nuqs for search-param state:** use nuqs (`useQueryState` / `useQueryStates`) with typed
  parsers and defaults, so search params are read and written as typed values rather than raw
  strings. Where a param needs validation beyond a primitive parser, the parser is backed by a
  Zod schema (**0017**), carrying its origin marker.
- **URL as a state bucket:** state that should be shareable, bookmarkable, and survive reload
  and back/forward — search query, filters, sort, pagination, selected tab — lives in the URL
  via nuqs. This is the third bucket of the state model, distinct from server cache (**0025**)
  and ephemeral client UI state (**0026**); **0026** is updated so this category lives in the
  URL rather than Zustand.

### Consequences

* Good, because navigation is type-checked (broken links caught at build) and search params
  are typed, declarative state — closing the stringly-typed gap at the URL boundary (**0003**).
* Good, because URL-owned state is shareable, bookmarkable, and restorable for free, with
  nuqs handling serialization, defaults, batching, and shallow/RSC behavior.
* Good, because the state model is now unambiguous: server state in Query (**0025**),
  URL-owned state in nuqs, ephemeral client state in Zustand (**0026**).
* Bad, because typed routes is a build-time codegen feature (now stable, earlier behind an
  experimental flag) — it adds a generated-types step and only checks statically analyzable
  `href`s, so dynamically built string hrefs still need care.
* Bad, because nuqs is another dependency and a small API to learn, and putting
  state that should not be public (sensitive, or very large) into the URL is a misuse to
  guard against.

### Confirmation

`next.config` enables typed routes; `<Link>` / router navigation uses typed `href`s; search-
param state uses nuqs `useQueryState` / `useQueryStates` with typed parsers (Zod-backed,
**0017**, where validation is needed). The "URL vs Zustand vs Query" bucket rule is
documented (**0025**, **0026**), and misplaced state is caught in code review.

## Pros and Cons of the Options

### Typed routes + nuqs (chosen)

* Good, because typed routes is framework-native and nuqs is purpose-built for typed
  search-param state.
* Good, because together they extend strict typing across the URL and give URL-owned state a
  clear home.
* Bad, because typed routes adds a codegen step and nuqs is an added dependency.

### Manual untyped routes + hand-parsed search params

* Good, because it adds no dependency and uses only built-in APIs.
* Bad, because `href`s and query strings stay stringly-typed and hand-parsed — typos and
  parsing bugs slip past the compiler, and shareable URL state must be wired by hand each
  time — directly failing the type-safety and state-home drivers.

### Route-helper / typesafe-URL library

* Good, because a single library can type both routes and params, often with Zod-backed
  schemas.
* Neutral, because it would deliver type safety end to end.
* Bad, because it overlaps with Next.js's now-native typed routes (a second routing
  abstraction to maintain), and for the specific job of search-params-as-React-state nuqs is
  more focused and ergonomic than a general URL-builder.

## More Information

Builds on **0002** (App Router, source of typed routes), **0003** (strict typing extended to
the URL boundary), and **0017** (Zod-backed parsers where validation is needed). It refines
the state model of **0025** and **0026** by introducing URL-owned state as a distinct bucket.
Typed routes also covers the localized route segment from the i18n decision (**0030**).

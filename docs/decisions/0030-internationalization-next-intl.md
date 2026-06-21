---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Internationalization with next-intl

## Context and Problem Statement

The application is to be internationalized: user-facing text translated per locale, with
locale-aware routing and formatting. In the App Router / RSC model (**0002**), i18n is not a
drop-in concern — it touches routing (a locale segment), middleware (locale negotiation), and
both Server and Client Components (where translations are read). It must also coexist with
the Supabase session refresh already running in middleware (**0013**, **0016**), since both
need to act on every request.

The decision is which i18n library to adopt and how it integrates with App Router routing and
the existing middleware, without the locale layer and the auth-session layer stepping on each
other.

## Decision Drivers

* **App Router / RSC support** — first-class translation access in Server Components and
  Client Components (**0002**).
* **Locale-aware routing** — a locale-prefixed URL structure that the framework understands.
* **Middleware composition** — locale negotiation must compose with the Supabase session
  refresh (**0013**, **0016**), not replace it.
* **Maintained and ergonomic** — typed message access and an actively maintained library.

## Considered Options

* next-intl
* next-i18next
* A custom i18n implementation

## Decision Outcome

Chosen option: "next-intl", because it is built for the App Router with first-class RSC and
Client Component support, provides locale-prefixed routing, and composes with existing
middleware rather than owning it outright. Routing uses a locale segment
(`src/app/[locale]/…`) with a configured locale set and prefix policy; the middleware
composes next-intl's locale handling with the Supabase session refresh (**0013**, **0016**)
so both run per request; messages live in per-locale catalogs (e.g.
`messages/<locale>.json`) and are read in both Server and Client Components. The concrete
locale list and default are configured in one place.

### Consequences

* Good, because translations are accessible in Server Components (no forced client
  rendering) and Client Components alike, fitting the RSC default (**0002**).
* Good, because locale-prefixed routing is handled by the library rather than hand-built.
* Good, because composing in middleware keeps the auth-session refresh (**0013**, **0016**)
  intact alongside locale negotiation.
* Bad, because the locale segment threads through routing, layouts, and links, adding
  structural complexity to every route.
* Bad, because middleware now does two jobs (locale + session), so their ordering and
  interaction must be implemented and tested carefully.

### Confirmation

A `[locale]` route segment exists; middleware composes next-intl with the Supabase session
refresh; per-locale message catalogs exist and are read from both Server and Client
Components. Locale routing is covered by e2e tests (**0007**; the e2e job is deferred during
bootstrap per **0010**, so this runs locally until e2e returns to the CI gate).

## Pros and Cons of the Options

### next-intl (chosen)

* Good, because it has first-class App Router/RSC support and locale routing.
* Good, because it composes with existing middleware (session refresh).
* Bad, because the locale segment adds routing complexity and middleware does double duty.

### next-i18next

* Good, because it is mature with a large ecosystem in the i18next family.
* Neutral, because it supports Next.js.
* Bad, because its strongest support and design target the Pages Router; App Router/RSC
  integration is less first-class than next-intl's, conflicting with **0002**.

### Custom implementation

* Good, because it would be tailored exactly to the project's needs with no dependency.
* Bad, because locale routing, message loading, formatting, and RSC integration are
  substantial, easy-to-get-wrong surface to build and maintain — reinventing what next-intl
  already provides.

## More Information

Builds on **0002** (App Router/RSC), and composes with the middleware session refresh from
**0013** and **0016**. Per-locale page metadata (canonical/hreflang alternates) is handled in
the SEO decision **0031**.

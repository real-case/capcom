---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# SEO and page metadata via the App Router Metadata API

## Context and Problem Statement

Public pages need discoverability: titles, descriptions, Open Graph/Twitter cards, canonical
URLs, a sitemap and robots rules, and — because the app is localized (**0030**) — per-locale
metadata with correct `hreflang` alternates. The App Router (**0002**) provides a native
Metadata API (static `metadata` exports and a dynamic `generateMetadata` function) plus
file conventions for `sitemap` and `robots`.

The decision is whether to standardize on that native API or to manage head tags by hand (or
via a third-party SEO library), and how metadata interacts with the locale routing already
decided (**0030**). Inconsistent or hand-rolled head management tends to drift, miss canonical/
hreflang correctness, and duplicate logic per page.

## Decision Drivers

* **Framework-native** — use the App Router Metadata API (**0002**) rather than manual
  `<head>` manipulation.
* **Static and dynamic** — support both fixed metadata and per-route/per-entity metadata
  generated at request time.
* **Locale-correct** — per-locale titles/descriptions and correct canonical + `hreflang`
  alternates (**0030**).
* **Crawlability primitives** — a generated sitemap and robots rules.

## Considered Options

* App Router Metadata API (`metadata` + `generateMetadata`) plus `sitemap`/`robots` route files
* Manual `<head>` tag management per page
* A third-party SEO/meta library

## Decision Outcome

Chosen option: "App Router Metadata API", because it is the framework-native, RSC-friendly
way to declare metadata, supports both static `metadata` and dynamic `generateMetadata`, and
integrates with locale routing (**0030**) for per-locale titles and `hreflang`/canonical
alternates. Static pages export `metadata`; dynamic and per-locale pages use
`generateMetadata`; `app/sitemap.ts` and `app/robots.ts` provide crawl primitives; shared
Open Graph/Twitter defaults live in the root layout and are overridden per route. Canonical
URLs and locale alternates are derived from the **0030** locale configuration.

### Consequences

* Good, because metadata is declared with the framework's own API, co-located with routes
  and rendered correctly under RSC.
* Good, because `generateMetadata` covers dynamic and per-locale needs without hand-built
  head logic.
* Good, because sitemap/robots route files and canonical/hreflang alternates make the app
  properly crawlable and locale-correct.
* Bad, because per-locale alternates and dynamic metadata require careful, consistent wiring
  across many routes to stay correct.
* Bad, because rich social-preview imagery (e.g. dynamic OG images) is additional work layered
  on top of the base metadata.

### Confirmation

Routes export `metadata` or `generateMetadata`; `app/sitemap.ts` and `app/robots.ts` exist;
canonical and `hreflang` alternates are emitted per locale (**0030**); social-card defaults
are set in the root layout.

## Pros and Cons of the Options

### App Router Metadata API (chosen)

* Good, because it is framework-native, RSC-correct, and supports static + dynamic metadata.
* Good, because it integrates with locale routing for canonical/hreflang alternates.
* Bad, because correctness across many localized routes takes consistent wiring.

### Manual `<head>` management

* Good, because it offers maximal control over exact tags.
* Bad, because it bypasses the framework's metadata handling, is error-prone for canonical/
  hreflang, and duplicates logic per page — drift-prone and hard to keep correct.

### Third-party SEO library

* Good, because such libraries bundle helpers and sensible defaults.
* Neutral, because they can speed initial setup.
* Bad, because the App Router already provides native metadata, so a library adds a
  dependency and an abstraction over capabilities the framework offers directly.

## More Information

Builds on **0002** (App Router Metadata API) and **0030** (locale configuration driving
canonical/hreflang alternates). Dynamic Open Graph image generation, if needed, would be a
follow-on decision.

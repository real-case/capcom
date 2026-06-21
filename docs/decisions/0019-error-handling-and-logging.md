---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Error handling via App Router boundaries and a structured stdout logger

## Context and Problem Statement

The application needs a consistent way to handle failures: what the user sees when something
goes wrong, and what gets recorded so failures can be diagnosed. Two concerns are bundled
here because they meet at the moment an error is thrown — the *user-facing* presentation and
the *operational* record.

The App Router (**0002**) provides specific mechanisms (`error.tsx`, `global-error.tsx`,
`not-found.tsx`, catch-all routes) for the presentation side. For the operational side, the
project must decide whether to adopt a third-party error-tracking/APM service now or start
with a lightweight structured logger. Getting presentation wrong risks leaking internal
details to users; getting logging wrong leaves failures undiagnosable.

## Decision Drivers

* **Use the framework's boundaries** — error UI should use the App Router's native
  `error.tsx` / `global-error.tsx` / `not-found.tsx` mechanisms (**0002**).
* **Never leak internals to the client** — users see generic messages; details stay
  server-side.
* **Diagnosable logs** — server logs should be structured and distinguish *expected* errors
  (validation, not-found) from *unexpected* ones (bugs, outages).
* **No premature platform commitment** — avoid wiring a heavyweight tracking service before
  there is a concrete need; keep the door open to add one.

## Considered Options

* App Router boundaries + a structured JSON-to-stdout logger, generic client messages
* A third-party error-tracking/APM service (e.g. Sentry) as the primary mechanism
* Minimal handling — default error page and `console` logging

## Decision Outcome

Chosen option: "App Router boundaries + structured stdout logger", because it uses the
framework's native error UI, keeps internal details off the client, and produces diagnosable
structured logs without committing to a paid tracking platform before one is warranted. The
app defines `error.tsx` and `global-error.tsx` boundaries, a root and (where applicable)
localized `not-found.tsx`, and a catch-all route for unmatched paths. A small logger
(`src/lib/logger.ts`) emits structured JSON to stdout and distinguishes expected from
unexpected errors; on the Vercel runtime (**0009**) stdout is captured as logs. Client-facing
messages stay generic. Adopting an external error-tracking service (e.g. Sentry) is deferred
to its own ADR if and when richer aggregation/alerting is needed.

### Consequences

* Good, because error presentation uses the framework's intended boundaries, behaving
  predictably across server and client rendering.
* Good, because generic client messages prevent leaking stack traces or internal details to
  users.
* Good, because structured JSON logs with an expected/unexpected distinction are diagnosable
  and easy to later forward to an aggregator.
* Bad, because stdout logging alone has no aggregation, search, alerting, or release
  health — capabilities a dedicated service would add.
* Bad, because the expected-vs-unexpected discipline must be applied consistently by authors
  to stay useful.

### Confirmation

`error.tsx`, `global-error.tsx`, `not-found.tsx`, and a catch-all route exist; `src/lib/
logger.ts` emits structured JSON and tags expected vs unexpected; client error UI shows
generic copy. Adding external tracking requires a new ADR.

## Pros and Cons of the Options

### App Router boundaries + structured stdout logger (chosen)

* Good, because it uses native error UI, hides internals, and logs are structured and
  forward-ready.
* Good, because it adds no paid dependency before there is a need.
* Bad, because it lacks aggregation/alerting until a service is added later.

### Third-party tracking/APM as primary

* Good, because it provides aggregation, search, alerting, and release health out of the box.
* Neutral, because it complements, rather than replaces, framework error boundaries.
* Bad, because adopting it now adds a dependency, cost, and configuration ahead of a concrete
  need; it is better added deliberately once requirements are known.

### Minimal (default page + console)

* Good, because it is the least effort.
* Bad, because the default error surface risks leaking details, and unstructured `console`
  output is hard to filter or forward — leaving failures effectively undiagnosable.

## More Information

Builds on **0002** (the App Router boundaries used) and **0009** (Vercel captures stdout
logs). Any future external error-tracking adoption is deferred to its own ADR; logger
configuration may read from the env module (**0018**).

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Zod-validated environment variables with a server-only secret fence

## Context and Problem Statement

The application reads configuration from environment variables: some are public and safe to
ship to the browser (e.g. the Supabase URL and anon key), others are secrets that must never
reach the client (e.g. the Supabase service-role key). Two failure modes must be designed
out. First, **misconfiguration**: a missing or malformed variable that fails deep in a
request rather than loudly at startup. Second, **leakage**: a server secret accidentally
imported into a client component and bundled into the browser.

With Zod established as the validation authority (**0017**) and Vercel managing
per-environment variables (**0009**), the project must decide how env is validated, typed,
and partitioned between public and server-only.

## Decision Drivers

* **Fail fast on misconfiguration** — invalid or missing env should fail at build/boot with
  a clear message, not at runtime in a random request.
* **No secret leakage** — server-only secrets must be impossible to import into client code
  without an error.
* **Typed access** — env should be strongly typed (no `process.env.X` string soup), feeding
  the strict policy (**0003**).
* **One validation model** — reuse Zod (**0017**) rather than a second validation mechanism.

## Considered Options

* Zod-validated env modules split public vs server-only, with a `server-only` import fence
* `@t3-oss/env-nextjs` (a dedicated typed-env library)
* Raw `process.env` access with no validation

## Decision Outcome

Chosen option: "Zod-validated env modules with a `server-only` fence", because it reuses the
project's existing validator (**0017**) to validate and type all env in one model, fails
fast on bad configuration, and uses the `server-only` package to make importing secrets into
client code a build error. Public, client-safe variables (`NEXT_PUBLIC_*`) are validated in a
client-importable module (e.g. `src/lib/env.ts`); server-only secrets are validated in a
separate module (e.g. `src/lib/env.server.ts`) that imports `server-only`, so any client
import fails the build. Values are stored per environment in Vercel (**0009**) and pulled
locally by the dev orchestrator (**0024**).

### Consequences

* Good, because invalid/missing env fails loudly at build or boot with a precise Zod error,
  not silently at request time.
* Good, because the `server-only` fence turns "I leaked a secret into the client bundle" from
  a security incident into a build failure.
* Good, because typed env eliminates `process.env` string access and feeds the strict policy.
* Bad, because the public/server split is a discipline contributors must follow — putting a
  variable in the wrong module is possible (mitigated by the fence catching client leaks).
* Bad, because env schemas are one more thing to maintain as configuration grows.

### Confirmation

`src/lib/env.ts` (public) and `src/lib/env.server.ts` (secrets, importing `server-only`)
validate env with Zod; a deliberately invalid env fails the build. Application code reads
typed env from these modules, not `process.env` directly. Vercel holds per-environment
values; the orchestrator (**0024**) pulls them locally.

## Pros and Cons of the Options

### Zod env modules + server-only fence (chosen)

* Good, because it reuses Zod, fails fast, and prevents secret leakage at build time.
* Good, because access is fully typed.
* Bad, because the public/server split relies on contributor discipline (backstopped by the
  fence).

### @t3-oss/env-nextjs

* Good, because it is a purpose-built typed-env library with client/server separation baked
  in, and it uses Zod under the hood.
* Neutral, because it would deliver most of the same guarantees.
* Bad, because it adds a dependency and its own conventions for what is a small amount of
  project-specific glue we can write directly on Zod (**0017**) with the `server-only` fence.

### Raw process.env, no validation

* Good, because it is zero setup.
* Bad, because misconfiguration surfaces as runtime failures deep in requests, access is
  untyped strings, and nothing prevents importing a secret into client code — failing every
  driver.

## More Information

Builds on **0003** (typed access), **0017** (Zod as the validator), **0024** (local env
pull), and **0009** (Vercel as the per-environment store). The Supabase service-role key
governed by the **0013** server-only boundary is one of the secrets fenced here.

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Node.js 24 LTS as the runtime, with a Node-first route runtime

## Context and Problem Statement

The project must choose its server-side JavaScript runtime and version line. Three things
need recording: the runtime itself, pinning the version precisely so local, CI, and
production environments agree, and choosing the default *route runtime* for the Next.js
App Router. Next.js can
execute route handlers and rendering either on the full Node.js runtime or on a constrained
Edge runtime, and that default affects which APIs and dependencies are available
everywhere.

Getting this wrong is costly: an unpinned version causes "works on my machine" drift, and
an Edge-by-default choice silently forbids common Node APIs and many dependencies
(including parts of the Supabase and backend ecosystem). What runtime version and route
runtime default should the project adopt?

## Decision Drivers

* **Long-term support** — an LTS line gives a multi-year security and maintenance window.
* **Environment parity** — local, CI, and Vercel must run the same major version to avoid
  drift.
* **Dependency compatibility** — the backend stack (Supabase SDKs, Node built-ins) assumes
  the full Node runtime; the Edge runtime omits many APIs.
* **Modern runtime features** — Node 24 ships current language and standard-library
  capabilities (global `fetch`, stable test runner, web-stream APIs) usable without
  polyfills.

## Considered Options

* Node.js 24 LTS, Node-first route runtime (Edge opt-in per route)
* Node.js 22 LTS
* Edge runtime as the default
* Bun as the runtime

## Decision Outcome

Chosen option: "Node.js 24 LTS, Node-first route runtime", because it provides the newest
LTS support window while keeping the full Node API surface that the backend stack depends
on. The version is pinned with `engines.node` set to `>=24 <25` in `package.json` and `24`
in `.nvmrc`; CI runs on Node 24. The Node.js runtime is the App Router default; a route may
opt into Edge explicitly with `export const runtime = "edge"` only where its constraints
are acceptable and beneficial.

### Consequences

* Good, because the full Node API surface is available everywhere by default, so
  dependencies and Supabase SDKs work without surprise.
* Good, because pinning via `engines` and `.nvmrc` keeps local/CI/prod on one major
  version.
* Good, because Node 24's modern built-ins reduce the need for polyfills and extra
  dependencies.
* Bad, because Edge-specific latency benefits require deliberate per-route opt-in rather
  than coming for free.
* Bad, because Node 24, as a newer LTS line, may have marginally less third-party
  battle-testing than an older line for a short period.

### Confirmation

`package.json` `engines.node` is `>=24 <25`; `.nvmrc` contains `24`; the CI workflow pins
Node 24. Edge usage is grep-auditable via `runtime = "edge"` exports and reviewed
per route.

## Pros and Cons of the Options

### Node 24 LTS, Node-first (chosen)

* Good, because it combines the newest LTS support window with the full Node API surface.
* Good, because pinning eliminates cross-environment drift.
* Bad, because Edge benefits are opt-in, not default.

### Node 22 LTS

* Good, because it is a slightly more mature LTS line with longer field exposure.
* Neutral, because it still supports the stack adequately.
* Bad, because it forgoes Node 24's newer built-ins and, as the older line, reaches
  end-of-life sooner — shortening the window before a forced major upgrade.

### Edge runtime as default

* Good, because it offers low-latency, globally distributed execution out of the box.
* Bad, because it omits many Node APIs, breaking common dependencies and parts of the
  backend stack.
* Bad, because making the constrained runtime the default inverts the safe choice — the
  exception (Edge) should be opt-in, not the rule.

### Bun

* Good, because it offers fast startup and an integrated toolchain.
* Bad, because it is less proven against the Next.js + Vercel + Supabase combination
  targeted here — Vercel's build and runtime images and the Supabase SDK matrix treat
  Node as the first-class target.

## More Information

Builds on **0001** (ADR practice) and **0002** (the App Router model whose route runtime
this configures). The hosting decision relies on this version pin for environment parity,
and the CI decision pins the same major version.

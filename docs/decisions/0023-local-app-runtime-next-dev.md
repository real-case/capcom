---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Run the app locally with `next dev`, with environment synced via `vercel env pull`

## Context and Problem Statement

Following the official-CLI principle (**0021**), the project must choose how the Next.js app
runs on a developer's machine. Next.js provides `next dev` directly; the Vercel CLI provides
`vercel dev`, which wraps the framework's dev server in an emulation of the Vercel platform.
Vercel's own documentation recommends *against* `vercel dev` when the framework's development
command already provides the needed features, and names Next.js explicitly: `next dev`
natively supports functions, redirects, rewrites, and headers.

The genuine local-fidelity gap is therefore not the runtime but the **environment
variables**: production env lives in the Vercel project (**0009**, **0018**), and local runs
must resolve it consistently. Which local runtime should be primary, and how does the local
environment stay faithful to the platform's?

## Decision Drivers

* **Vendor-recommended path** — prefer the workflow the platform documents over one it
  advises against for this framework.
* **Official-CLI alignment** — consistent with **0021**: both `next dev` (the framework's
  CLI) and `vercel env pull` (the platform's CLI) are vendor tools.
* **Environment-variable fidelity** — local runs should resolve env the way production does
  (ties into **0024**, **0018**).
* **Fast feedback** — dev-server speed and HMR matter for day-to-day work; extra layers cost
  startup time and add troubleshooting surface.

## Considered Options

* `next dev` as the runtime, with env synced via `vercel env pull`
* `vercel dev` as the primary local runtime, with `next dev` as a fallback
* `next dev` only, with hand-maintained `.env` files

## Decision Outcome

Chosen option: "`next dev` + `vercel env pull`", because it is the path Vercel itself
recommends for Next.js — the framework dev server natively provides functions, redirects,
rewrites, and headers, so the platform-emulation layer would add startup cost and
troubleshooting surface without adding fidelity — while `vercel env pull` closes the genuine
gap by syncing the linked Vercel project's development environment into `.env.local`.
`npm run dev` runs the orchestrated `next dev` path (**0024**); env sync runs through the
Vercel CLI against the linked project (`vercel login` + `vercel link`, then
`vercel env pull`). A contributor without Vercel linkage can still run the app by providing
`.env.local` manually (e.g. from a committed example file).

### Consequences

* Good, because day-to-day development uses the fastest, vendor-recommended dev server with
  no emulation layer of its own to troubleshoot.
* Good, because `vercel env pull` resolves env from the same source production uses, keeping
  local runs faithful where the fidelity gap actually is.
* Good, because the app remains runnable without Vercel linkage by supplying `.env.local`
  directly.
* Bad, because platform-level behavior that lives outside the framework (e.g. `vercel.json`
  routing/headers, cron, function limits) is not exercised locally and surfaces first on
  per-PR preview deployments (**0009**).
* Bad, because the pulled `.env.local` is a point-in-time snapshot that can go stale until
  re-pulled, and env sync still requires CLI auth and a linked project.

### Confirmation

`npm run dev` invokes the orchestrated `next dev` path (**0024**); the env-sync step
(`vercel env pull`, writing `.env.local`) is scripted and documented. Environment parity is
verifiable by comparing the pulled `.env.local` against the Vercel project's development
environment; platform-specific behavior is exercised on per-PR preview deployments
(**0009**).

## Pros and Cons of the Options

### next dev + vercel env pull (chosen)

* Good, because it follows the vendor's documented recommendation for Next.js projects.
* Good, because env fidelity is solved at the source — the Vercel project — without an
  emulation layer.
* Bad, because platform-level (non-framework) behavior is exercised only on preview
  deployments.

### vercel dev primary + next dev fallback

* Good, because it emulates platform behavior beyond the framework (e.g. `vercel.json`
  routing) locally.
* Bad, because Vercel's documentation recommends against it when the framework's dev command
  already covers the needed features — which Next.js's does — so for this stack the emulation
  adds startup cost and a troubleshooting layer without adding fidelity.
* Bad, because everyday runs (not just env sync) would require CLI auth and a linked
  project for full operation.

### next dev only, hand-maintained env

* Good, because it is the simplest runtime with no Vercel CLI involvement at all.
* Bad, because env values drift from the Vercel project over time — exactly the "works
  locally, breaks in prod" class the parity principle (**0021**) exists to prevent.

## More Information

Builds on **0021** (official-CLI principle — satisfied here by the framework CLI for the
runtime and the platform CLI for env sync). The single `npm run dev` entrypoint that
orchestrates `next dev` together with the local database, type generation, and env sync is
decided in **0024**; the hosting platform whose env this syncs is recorded in **0009**; the
env validation model is **0018**. Vercel's CLI documentation (vercel.com/docs/cli/dev,
checked 2026-06-11) states that when a framework's development command already provides the
needed features — naming Next.js's `next dev` — `vercel dev` is not recommended; that
recommendation is the basis of this record's parity reasoning.

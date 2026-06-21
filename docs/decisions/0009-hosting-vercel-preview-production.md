---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Hosting on Vercel with Git-integrated preview and production deployments

## Context and Problem Statement

The application needs a deployment target and a deployment model. Unlike React and Next.js
(fixed as constraints CON-001 and CON-002), hosting is not externally mandated, so it is a
genuine decision with real alternatives — though the mandated MCP toolchain (CON-003)
already includes a `vercel` server, which this choice keeps purposeful. It is a
consequential decision, because build behavior, the preview workflow, environment-variable
handling (**0018**), and the local environment sync (**0023**) all bind to it.

The model matters as much as the vendor: should every pull request get an isolated preview
deployment, and how does deployment relate to the CI quality gate that runs the project's
checks (**0010**, decided next, which keeps those checks in GitHub Actions)? The decision
must name the platform and fix the preview/production workflow.

## Decision Drivers

* **First-class Next.js support** — App Router, RSC, and Server Actions (**0002**) should
  deploy with minimal configuration.
* **Per-PR preview deployments** — every change should get an isolated, shareable URL for
  review and e2e checks.
* **Environment-variable management** — the platform must store env per environment and feed
  the local runtime (**0023**, **0018**).
* **Clean split with CI** — deployment is the platform's job; quality checks stay in CI
  (**0010**).

## Considered Options

* Vercel — Git-integrated preview/production deployments
* Netlify
* Self-hosted Node server (Docker on a VPS or cloud provider)
* Cloudflare Pages / Workers

## Decision Outcome

Chosen option: "Vercel", because it provides first-class, near-zero-config Next.js
deployment from the same vendor that develops the framework, automatic per-PR preview
deployments, and integrated per-environment env management that the local env sync
(`vercel env pull`, **0023**) and the env decision (**0018**) build on. Vercel owns
build-and-deploy; the CI gate (**0010**) owns quality checks. Production deploys from the
production branch (`main` — the branch model is recorded in **0011**); every pull request
gets an isolated preview URL used for review and e2e testing.

### Consequences

* Good, because App Router / RSC / Server Actions deploy with essentially no custom build
  configuration.
* Good, because per-PR previews give isolated, shareable environments for review and
  end-to-end checks.
* Good, because integrated env management pairs cleanly with the local env sync (**0023**)
  and the env module (**0018**).
* Bad, because it is meaningful platform coupling — preview workflow, env handling, and some
  build behavior are Vercel-specific, raising switching cost.
* Bad, because Vercel's pricing and function limits can become constraints at scale,
  potentially forcing a future re-evaluation.

### Confirmation

The project is linked to a Vercel project; pull requests receive preview URLs; the
production branch (`main`, **0011**) deploys to production. Deployment is handled by Vercel
while `.github/workflows/ci.yml` (**0010**) runs the checks.

## Pros and Cons of the Options

### Vercel (chosen)

* Good, because it is the first-class Next.js host with zero-config builds and per-PR
  previews.
* Good, because integrated env management fits the local runtime and env decisions.
* Bad, because of platform coupling and scale-dependent cost/limits.

### Netlify

* Good, because it also offers Git-integrated deploys and preview environments.
* Neutral, because it supports Next.js via an adapter.
* Bad, because Next.js App Router/RSC support trails the framework's own platform, so newer
  features can lag or need workarounds.

### Self-hosted Node server

* Good, because it avoids platform lock-in and gives full control over runtime and cost.
* Bad, because it puts builds, preview environments, TLS, scaling, and env management on the
  team — recreating by hand exactly what Vercel provides, with no benefit at this stage.

### Cloudflare Pages / Workers

* Good, because it offers a fast global edge network and competitive pricing.
* Neutral, because it can run Next.js.
* Bad, because the Workers runtime constraints conflict with the Node-first route runtime
  (**0004**) and parts of the Node-dependent backend stack, forcing edge-compatibility work.

## More Information

Builds on **0002** (the framework it deploys) and **0004** (Node-first runtime). It fixes the
deploy side of the CI/deploy split that the CI quality gate (**0010**) then builds on. The
environment-variable model stored on this platform is decided in **0018**; the local
synchronization of it is **0023**.

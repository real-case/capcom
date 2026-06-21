---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Provider-agnostic advisory-AI client via the OpenAI-compatible Chat Completions API

## Context and Problem Statement

The Phase-12 advisory-AI jobs (PR review, security Layer 2, changelog, CI-failure triage —
ADRs 0048–0057) call one shared client, `scripts/ai/lib.mjs::advise()`. That client was
bound to a single vendor: the `@anthropic-ai/sdk` package, an `ANTHROPIC_API_KEY` /
`ANTHROPIC_MODEL` / `ANTHROPIC_EFFORT` env contract, and Anthropic-only request features
(prompt-cache `cache_control`, `thinking: adaptive`, `output_config.effort`). **No ADR ever
chose Anthropic** — the vendor lock was an implementation detail. Consuming this template
for a demo on a different provider (Gemini), or letting any adopter bring their own key,
currently means rewriting the client. The advisory jobs themselves are already
vendor-neutral (they only call `advise()`); only the transport is coupled.

## Decision Drivers

* **Bring-any-key** — an adopter (and our own Gemini demo) should activate the advisory
  jobs with any provider by setting an API key, not by editing code.
* **No vendor SDK lock, lean deps** — the gates elsewhere are dependency-free by preference;
  swapping one vendor SDK for another is a lateral move, removing it is better.
* **Keep the advisory jobs untouched** — the decoupling must live entirely in `lib.mjs`; the
  four job scripts and the features they implement (0048–0057) stay as-is.
* **Advisory cadence tolerates the common denominator** — these jobs run per-PR and post a
  comment; vendor-specific cost optimizations (prompt caching) and reasoning knobs are nice
  to have, not load-bearing.

## Considered Options

* **OpenAI-compatible Chat Completions over `fetch`, zero-dep** — a configurable
  `AI_BASE_URL` + `AI_API_KEY` + `AI_MODEL`, POSTing to `/chat/completions`.
* **The `openai` SDK** against a configurable base URL (same model, one dependency).
* **The Vercel AI SDK** (`ai` + `@ai-sdk/*`), provider chosen by name.
* **Keep `@anthropic-ai/sdk`** and document only Anthropic.

## Decision Outcome

Chosen option: "OpenAI-compatible Chat Completions over `fetch`, zero-dep", because it is the
broadest "any key" surface at the lowest cost: the OpenAI Chat Completions shape is the de
facto interop standard, so one code path reaches **Gemini** (its OpenAI-compatibility
endpoint), OpenAI, OpenRouter, Groq, local servers, and even Anthropic's own compat layer —
by setting three env vars. `lib.mjs` drops `@anthropic-ai/sdk` (a net dependency removal,
Node 24's global `fetch` suffices, ADR 0004) and the Anthropic-only request features. The
template ships **provider-neutral**: the jobs stay INERT until `AI_API_KEY` is provisioned
(unchanged posture, ADR 0046/0044), and `.env.example` documents **Gemini as the primary
example** with OpenAI / Anthropic-compat as alternatives — no provider is hardwired as a
default. This record governs only the transport; the advisory features remain governed by
0048–0057.

### Consequences

* Good, because any OpenAI-compatible provider activates the jobs with `AI_API_KEY` +
  `AI_BASE_URL` + `AI_MODEL` — the literal "bring any key" the template wants.
* Good, because a vendor SDK dependency is removed, not replaced; the client is ~40 lines of
  `fetch` with no third-party trust surface.
* Good, because the four job scripts and ADRs 0048–0057 are untouched — the change is one
  file plus the env/secret names.
* Bad, because prompt caching and adaptive-thinking/effort are dropped; for the advisory
  cadence this is a minor cost/quality detail, and a provider that wants them can be added
  behind the same `advise()` later.
* Bad, because OpenAI-compat layers differ at the edges (e.g. `max_tokens` vs
  `max_completion_tokens`, system-role handling); the client targets the common subset and
  documents the one or two knobs an adopter may need to adjust per provider.

### Confirmation

`scripts/ai/lib.mjs` issues a `fetch` POST to `${AI_BASE_URL}/chat/completions` with a
`Bearer ${AI_API_KEY}` header and `AI_MODEL`, and imports no `@anthropic-ai/sdk`; the package
is absent from `package.json`. The workflows and `.env.example` use the `AI_*` contract (no
`ANTHROPIC_*`); the jobs remain inert without `AI_API_KEY`; `.env.example` shows the Gemini
configuration as the worked example. The four job scripts are unchanged.

## Pros and Cons of the Options

### OpenAI-compatible `fetch`, zero-dep (chosen)

* Good, because maximal provider reach through one standard shape; zero dependencies.
* Good, because it removes a vendor SDK and its trust/update surface.
* Neutral, because it standardizes on a third-party-originated wire format — but one that is
  now the cross-vendor lingua franca.
* Bad, because vendor-specific features (caching, reasoning effort) are not exposed.

### `openai` SDK against a base URL

* Good, because streaming, retries, and error typing come for free.
* Bad, because it trades the Anthropic dependency for an OpenAI one for no gain over `fetch`
  at this job's simple, non-streaming need.

### Vercel AI SDK

* Good, because the richest provider catalog and the idiomatic choice for a Next/Vercel app.
* Bad, because it adds the `ai` core plus a package per provider — several dependencies for a
  handful of advisory scripts, heavier than the need.

### Keep `@anthropic-ai/sdk`

* Good, because zero change and keeps prompt caching / adaptive thinking.
* Bad, because it is exactly the vendor lock this record removes; a Gemini demo or any other
  key would require a rewrite.

## More Information

The advisory-AI features and their human-only, advisory posture remain governed by
**0046/0047** and **0048–0057**; this record swaps only their transport. Uses Node 24's
global `fetch` (**0004**); credentials stay env-reference + human-provisioned (**0044/0046**).
Revisit if a provider's caching or reasoning controls become worth a per-provider adapter
behind the same `advise()` seam.

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# MCP server configuration: project-scoped, committed config with secrets by reference

## Context and Problem Statement

Per **CON-003**, the project mandates a fixed MCP server toolchain — `context7`, `figma`,
`vercel`, `supabase`, `chromatic`, and `github` — as the agent/development tooling baseline it must
provide and use. *Which* servers is given by that constraint and is not deliberated here. What
remains open is the residual choice **CON-003** leaves: *where and how* these servers are
configured, and — because that configuration can be committed to the repository — how their
credentials are handled. The owner additionally requires the configuration to live **at the
project level**. This record settles the configuration mechanism, the secret-handling model,
and the trust posture; it does not re-argue the server list.

The stakes are concrete: an MCP configuration committed to version control is inherited by
every contributor and every agent on checkout, and these particular servers carry credentials
to external accounts (Vercel, Supabase, Chromatic, Figma, GitHub) and operate with repository and
network access. So the residual decision is really about *reproducibility* and *the secret /
trust boundary*, which intersects the secrets fence in **0018**.

## Decision Drivers

* **Per CON-003, the six servers are fixed** — this record decides only their configuration,
  not their selection.
* **Project-level placement (mandated)** — the config must be shared and versioned so every
  clone yields the same agent toolchain, not per-developer drift.
* **No secrets in version control** — a committed config must never carry tokens; the
  server-only secret fence (**0018**) must stay intact.
* **Bounded trust surface** — servers that touch the repo, the network, and external accounts
  should be official, version-pinned, and granted least-privilege credentials.
* **Reproducibility** — a fresh checkout plus documented environment variables should produce a
  working MCP setup with no hidden manual steps.

## Considered Options

* Project-scoped, committed `.mcp.json` declaring the servers, with **credentials by
  environment-variable reference** (values in untracked local env)
* Project-scoped, committed config with **credentials inline** (literal tokens in the file)
* **Per-developer, user-scoped** MCP config that is not committed

## Decision Outcome

Chosen option: "project-scoped committed config with secrets by reference", because it gives
every contributor and agent the mandated toolchain (**CON-003**) on checkout while keeping the
secret fence (**0018**) intact. A single project-scoped configuration file (`.mcp.json` at the
repo root) is committed and declares the six servers. **Every credential is an
environment-variable reference** — e.g. `${VERCEL_TOKEN}`, `${SUPABASE_ACCESS_TOKEN}`,
`${CHROMATIC_PROJECT_TOKEN}`, `${FIGMA_TOKEN}`, `${GITHUB_MCP_PAT}` — **never a literal**; the actual values live in
untracked local environment (`.env*` / local settings) per **0018**. Servers are **pinned** to
explicit versions and limited to **official / first-party** implementations; tokens are scoped
**least-privilege** (read-only where the workflow allows). Per-developer deviations (an extra
local server, a local override) go in an **untracked, user/local-scoped** file that layers over
— but does not replace — the committed baseline.

### Consequences

* Good, because there is one committed source of truth, so every contributor and agent gets the
  identical mandated toolchain, reproducible from a fresh clone plus documented env vars.
* Good, because secrets stay out of version control behind env-references (**0018**), so the
  committed file is safe to share and review.
* Good, because pinning to official servers and least-privilege tokens bounds the trust and
  supply-chain surface these external integrations open.
* Bad, because contributors must provision the referenced environment variables locally before
  the servers work — a setup step and a documentation burden on onboarding (**0021**, **0024**).
* Bad, because a committed `.mcp.json` is a standing trust surface: each server, and every
  version bump, executes with repository and network access and must be reviewed; pinning and
  official-only mitigate but do not remove this.
* Bad, because the exact config schema and env-reference support are agent-client/version
  dependent, so the mechanism is coupled to the MCP host's configuration format.

### Confirmation

A committed `.mcp.json` at the repo root declares exactly the **CON-003** servers; it contains
**no literal tokens** — only `${...}` references — which a secret scan (**0018**) can verify;
the required environment variables are documented for onboarding (**0021**, **0024**); server
versions are pinned and only official servers are used; tokens are provisioned least-privilege.
Per-developer overrides live in an untracked local-scoped file.

## Pros and Cons of the Options

### Project-scoped committed config, secrets by reference (chosen)

* Good, because the mandated toolchain ships in the repo, identical for everyone and
  reproducible.
* Good, because env-references keep all secrets out of version control (**0018**).
* Neutral, because each developer must still supply local credential values.
* Bad, because the committed config is a trust surface requiring review and version pinning.

### Project-scoped committed config, credentials inline

* Good, because a checkout would work with zero local setup.
* Bad, because it writes Vercel/Supabase/Chromatic/Figma tokens into version control — a direct
  breach of the secret fence (**0018**) and an immediate leak on any clone or fork. Rejected.

### Per-developer user-scoped config (not committed)

* Good, because no project file carries anything, so there is nothing to leak in the repo.
* Bad, because the mandated baseline (**CON-003**) is then not shared or versioned — every
  developer reconstructs it by hand, contributors and agents drift apart, and "the project must
  provide and use these servers" is unenforceable. Fails the project-level placement the owner
  mandated.

## More Information

This record resolves the residual choice of **CON-003** (the mandated server list); the link is
bidirectional — the constraint cites this ADR, this ADR cites the constraint. Builds on
**0018** (the secret fence that makes credentials env-references), **0009** (Vercel, the
`vercel` server's target platform), **0012** / **0013** / **0014** (Supabase, the `supabase`
server's target), and **0021** / **0024** (local environment and onboarding, where contributors
provision the env vars). **Scope note:** configuring the `chromatic` and `figma` servers does
**not** by itself decide the *visual-regression strategy* (deferred in **0040**, then settled in
**0043**) or the *design-handoff process* (recorded in **0045**); this record covers only the MCP
server configuration. Revisit if the MCP configuration schema or the
env-reference mechanism changes materially, or if a server must be added to or removed from
**CON-003** (which would be a constraint change, not an edit here).

---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Documentation link-integrity gate (internal links)

## Context and Problem Statement

Documentation is a primary deliverable of this template — a 45 KB README, the ADR corpus,
`AI-GUARDRAILS.md`, `STORYBOOK-GUARDRAILS.md`, and the design-system docs are how both the
human and the agent learn the guardrails. **Internal links between these files rot
silently**: the recent audit found `ci.yml` pointing twice at a `docs/bootstrap-plan.md`
that did not exist. Nothing verifies that a relative link or an in-repo path in the docs
resolves.

## Decision Drivers

* **Docs integrity** — a dead internal link is a false map for the next reader (human or
  agent), the same failure class the reference-integrity gates (0067) attack for ADR
  numbers.
* **Deterministic, no network flake** — a gate must be reproducible; external-URL liveness
  is inherently flaky and conflicts with the no-blind-retry policy (0049).
* **Low maintenance, no runtime surface** — prefer a pinned action over an npm dependency.

## Considered Options

* **`lychee` in `--offline` mode** (GitHub action) over `**/*.md` — internal/relative links
  and in-repo paths only.
* **`markdown-link-check`** (npm dependency) per file.
* **None** — rely on review to catch dead links.

## Decision Outcome

Chosen option: "`lychee` offline over `**/*.md`", because it checks **internal** links
(relative paths, in-repo file references, intra-doc anchors) deterministically and fast,
with no npm dependency (a SHA-pinned action, 0044) and no network flakiness. A link-check
workflow runs on `pull_request`; a broken internal link blocks. **External URL liveness is
out of scope** — it is non-deterministic, would need retries (against 0049), and rots for
reasons outside any PR's control; it can be revisited as a separate scheduled, advisory job
if ever wanted.

### Consequences

* Good, because dead internal links — like the dangling `docs/bootstrap-plan.md` pointer —
  now fail a PR deterministically instead of misleading readers.
* Good, because offline mode means no network, no flake, no retry policy to violate.
* Good, because it is a pinned action with no npm dependency added.
* Bad, because external-link rot is not caught (a deliberate scope cut for determinism).
* Bad, because anchor/heading checks can be strict about generated slugs; the config pins
  the inclusion globs and any necessary excludes.

### Confirmation

A link-check workflow runs `lychee --offline` over `**/*.md` on pull requests, with the
action SHA-pinned; a broken internal link fails the job; the current docs pass (no dangling
internal links). External-URL checking is explicitly excluded.

## Pros and Cons of the Options

### lychee offline (chosen)

* Good, because fast, deterministic, no npm dependency, no network.
* Good, because it catches exactly the internal-link rot the audit surfaced.
* Bad, because external links are not validated (intentional).

### markdown-link-check (npm)

* Good, because configurable per-file with anchor support.
* Bad, because it adds an npm dependency and leans toward live external checks (flaky),
  fighting the determinism driver.

### None

* Good, because zero effort.
* Bad, because internal-link rot stays invisible until a reader follows a dead link — the
  exact failure the audit already hit.

## More Information

Extends the reference-integrity philosophy of **0067** (resolve every citation) from ADR
numbers to documentation links. Action SHA-pinned per **0044**; determinism per **0049**.
External-URL liveness is a possible future scheduled advisory job, not part of this gate.

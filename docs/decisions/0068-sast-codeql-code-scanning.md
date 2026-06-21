---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Static application security testing via GitHub CodeQL code scanning

## Context and Problem Statement

The diff-scoped security gate (**0056**) has two layers: Layer 1 is a blocking `gitleaks`
secret scan, Layer 2 is an advisory AI review of recorded invariants. Neither performs
**static taint / data-flow analysis** over the whole tree — the class of bug (injection,
SSRF, unsafe deserialization, path traversal, prototype pollution) that a dedicated SAST
engine finds deterministically. As real feature code lands, the absence of a deterministic
code-level security gate is a gap the secret scan and the probabilistic AI pass do not
cover.

## Decision Drivers

* **Defense in depth** — a deterministic code-level layer beside the secret scan (0056 L1)
  and the AI review (0056 L2), each catching a different class.
* **Deterministic and per-PR** — unlike the probabilistic AI pass, SAST gives the same
  answer every run, suitable as a gate.
* **Zero-maintenance, first-party** — prefer native tooling pinned and least-privilege
  (0044), no SaaS trust surface.
* **Bootstrap-appropriate** — advisory until there is code worth scanning; promotion to a
  required check is a 👤 branch-protection setting (0046/0047).

## Considered Options

* **GitHub CodeQL code scanning** — the native engine; SARIF results in the Security tab.
* **Semgrep** (CI action + rulesets).
* **None** — rely on 0056 Layer 1 (secrets) + Layer 2 (AI review).

## Decision Outcome

Chosen option: "GitHub CodeQL code scanning", because it is first-party, free for this
repository, deterministic, and integrates results into the GitHub Security tab without a
third-party trust surface. A pinned `codeql.yml` workflow analyses JavaScript/TypeScript
with the `security-extended` query suite on `pull_request`, on `push` to the base
branches, and on a weekly schedule (catching newly-published query updates against
unchanged code). It is **advisory during bootstrap** — findings surface in the Security
tab and the PR; marking the code-scanning check *required* is a human branch-protection
action (0046/0047), not set here.

### Consequences

* Good, because the deterministic code-level class is now covered, completing 0056's
  defense-in-depth (secrets / SAST / AI judgment).
* Good, because results are native (Security tab, SARIF), with no credential or vendor to
  manage.
* Good, because the weekly schedule re-scans unchanged code against improved queries —
  drift the per-PR run alone would miss.
* Bad, because CodeQL adds CI minutes (a few per run) and can surface false positives that
  need triage; per 0049 there is no blind retry — a finding is dismissed with a reason or
  fixed, never silently re-run.
* Bad, because it is JS/TS-scoped; SQL in `supabase/**` migrations is covered by RLS review
  (supabase-rls-reviewer / 0013–0016), not CodeQL.

### Confirmation

`.github/workflows/codeql.yml` exists with SHA-pinned `github/codeql-action/*` steps, runs
on `pull_request` + `push` to the base branches + a `schedule`, analyses `javascript-typescript`
with `security-extended`, and uploads SARIF. Promotion to a required status check is left
to branch protection (👤).

## Pros and Cons of the Options

### GitHub CodeQL code scanning (chosen)

* Good, because first-party, free, deterministic, native Security-tab integration.
* Good, because the default + `security-extended` suites cover the OWASP-relevant JS/TS
  classes out of the box.
* Neutral, because it is GitHub-coupled — acceptable, as CI is already GitHub Actions
  (0010) and hosting is Vercel (0009).
* Bad, because slower than a lightweight linter and occasionally noisy.

### Semgrep

* Good, because rulesets are portable and fast, with custom rules possible.
* Bad, because the highest-value rulesets / dashboards push toward the Semgrep SaaS — a
  trust surface and account this template would rather not mandate.

### None (rely on 0056 only)

* Good, because zero added CI.
* Bad, because the deterministic code-level vulnerability class stays uncovered; the AI L2
  pass is advisory and probabilistic, not a substitute for SAST.

## More Information

Completes the security triad of **0056**: Layer 1 secret scan (gitleaks), this record's
deterministic SAST (CodeQL), and Layer 2 advisory AI review. Actions are SHA-pinned per
**0044**; human-only promotion to required per **0046/0047**. Runs on the CI surface of
**0010**. SARIF upload requires **code scanning enabled on the repository** (Settings → Code
security & analysis — free on public repos; GitHub Advanced Security on private), so a
`precheck` job SKIPS analyze until it is enabled — the inert-until-provisioned posture of the
Chromatic token guard, so the workflow shows *skipping* (never a red ✗) while dormant.
Revisit query suites and the schedule cadence as the codebase grows.

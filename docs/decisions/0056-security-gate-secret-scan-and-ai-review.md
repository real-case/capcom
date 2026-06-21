---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Diff-scoped security gate: blocking secret scan plus advisory AI review of recorded invariants

## Context and Problem Statement

The corpus defines the project's security crown jewels precisely: RLS as the
authorization boundary that request-path code must never bypass (**0013**), the
`server-only` secret fence (**0018**), and env-reference-only credentials in committed
configuration (**0044**, which already assumes "a secret scan (0018) can verify").
But no record actually decides the security checking itself: there is no secret-scanning
gate, no SAST, and no security review pass. Generic SAST tools cannot know these
project-specific invariants — a service-role Supabase client in a route handler is
syntactically unremarkable and architecturally catastrophic. What security checking runs
on changes, and with what authority?

## Decision Drivers

* **The invariants are recorded and specific** — the highest-value checks here are not
  generic CWE patterns but the corpus's own rules (**0013**, **0018**, **0044**), which
  only a corpus-aware reviewer can check.
* **Determinism sets authority** — the corpus's standing principle (**0010**, **0039**,
  **0048**): reproducible checks may block; probabilistic ones advise.
* **Secrets are unforgiving** — a leaked token in history is an incident, not a finding;
  detection must be blocking and pre-merge.
* **Diff-scope for the gate, whole-repo elsewhere** — per-PR checks must stay fast;
  repository-wide assurance has its own mechanism (**0054**).

## Considered Options

* Two-layer diff-scoped gate: a deterministic secret scan as a blocking required check,
  plus an advisory AI security pass checking the diff against the corpus's recorded
  invariants
* Generic SAST only (e.g. CodeQL) as the security check
* Manual / periodic security review only, no per-PR checking

## Decision Outcome

Chosen option: "blocking secret scan + advisory AI invariant review", because it assigns
each layer the authority its determinism supports and aims the expensive layer at the
checks only this project can define. **Layer 1 (blocking):** a deterministic secret
scanner (gitleaks-class) runs in the required gate (**0010**) over the diff and incoming
history, fulfilling the verification **0018** and **0044** already presuppose; findings
block merge. **Layer 2 (advisory):** an AI security pass — a security-focused complement
to **0048** — reviews the PR diff specifically against the recorded invariants: privileged
(service-role) Supabase clients reachable from request paths (**0013**), imports crossing
the `server-only` fence or secrets accessed outside the validated env modules (**0018**),
literal credentials or weakened env-references in `.mcp.json` and config (**0044**),
RLS-disabled tables in migrations (**0014**). Findings are PR comments citing the
violated record. Generic SAST (CodeQL-class) is not adopted here and remains an open,
compatible follow-up. Whole-repo and historical assurance is the drift audit's domain
(**0054**), keeping the per-PR gate fast.

### Consequences

* Good, because the unforgiving class (committed secrets) is blocked deterministically
  pre-merge — the corpus's most-cited verification gap (**0018**, **0044**) closes.
* Good, because the checks generic tooling cannot perform — the project's own
  authorization and secret-fence invariants — are checked on every diff, with normative
  citations a reviewer can act on (**0047**).
* Good, because authority matches determinism: no probabilistic finding can block a
  merge, no deterministic leak can slip through advisory.
* Bad, because diff scope structurally misses whole-repo and cross-change issues;
  the mitigation is explicitly delegated (**0054**) and must actually run.
* Bad, because the advisory layer inherits **0048**'s costs — tokens per PR, an external
  API in CI, and a precision budget that must be maintained or the comments become
  ignorable noise.
* Bad, because secret scanners false-positive on high-entropy non-secrets; an auditable
  allowlist (committed, reviewed) is required to keep the blocking layer livable.

### Confirmation

The required gate (**0010**) contains the secret-scan job and branch protection lists it
as a required check; the AI security job exists and is absent from required checks;
sampled findings cite ADR numbers (**0013**, **0018**, **0044**); the scanner allowlist
is committed and changes to it are human-reviewed (**0047**); scanner and action versions
are pinned (**0044**'s pinning posture).

## Pros and Cons of the Options

### Blocking secret scan + advisory AI invariant review (chosen)

* Good, because each layer holds exactly the authority its error profile justifies.
* Good, because the AI layer's value is concentrated where this project is unique — the
  recorded invariants — not spread thin over generic patterns.
* Neutral, because it leaves generic SAST as a compatible later addition rather than
  deciding it now.
* Bad, because two layers mean two configurations to maintain and one recurring API cost.

### Generic SAST only

* Good, because deterministic, well-supported, and free for open source — catches real
  CWE classes (injection, deserialization).
* Bad, because it is blind to the project's actual crown jewels: no generic rule knows
  that a service-role client in a route handler bypasses the authorization model
  (**0013**) or that `.mcp.json` must contain only `${...}` references (**0044**).
* Bad, because alone it provides no secret scanning, leaving the corpus's assumed
  verification (**0018**, **0044**) still unimplemented.

### Manual / periodic review only

* Good, because zero CI machinery.
* Bad, because secrets land in history between reviews — an incident class where
  after-the-fact discovery means rotation and history rewriting, vastly costlier than
  pre-merge blocking.
* Bad, because invariant checking by unaided human attention is exactly the load-bearing
  judgment the corpus systematically backs with machinery elsewhere.

## More Information

Implements the verification presupposed by **0018** and **0044**; protects the
authorization model of **0013**/**0014**. Advisory-layer mechanics and authority
reasoning follow **0048**; whole-repo complement is **0054**; review disposition falls
under **0047**. Dependency-side supply-chain risk is the adjacent record **0057**.
A future generic-SAST adoption would be its own compatible record, not a supersession.
Revisit if the advisory layer's precision proves unmaintainable or if a deterministic
checker emerges for any recorded invariant (graduating it into the blocking gate, per
**0054**'s graduation principle).

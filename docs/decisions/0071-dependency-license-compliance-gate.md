---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Dependency license-compliance gate

## Context and Problem Statement

This repository is a **reusable starter template** (0046) — consuming projects inherit its
entire dependency tree. Nothing checks the **licenses** in that tree. A transitively
introduced copyleft (GPL/AGPL), commercial, or unknown/missing license would silently
create distribution and re-use risk for every downstream project, discovered only at audit
or shipping time.

## Decision Drivers

* **A reusable template must ship a license-clean tree** — downstream inherits its risk.
* **Allowlist, not blocklist** — enumerate the permissive licenses that are acceptable;
  anything else fails and is reviewed.
* **Deterministic, per-PR** — catch a non-conforming license the moment it enters the
  lockfile.
* **Production scope** — devDependencies are not distributed; gate the runtime tree.

## Considered Options

* **`license-checker-rseidelsohn` (dev dependency) + an SPDX allowlist** via a
  `check:licenses` npm script.
* **A SaaS license scanner** (e.g. FOSSA).
* **None** — accept licenses implicitly.

## Decision Outcome

Chosen option: "`license-checker-rseidelsohn` + an SPDX allowlist", because it is a local,
deterministic, dependency-tree-only check with no external trust surface. `check:licenses`
runs the checker over **production** dependencies against an allowlist of permissive SPDX
identifiers (`MIT`, `ISC`, `BSD-2-Clause`, `BSD-3-Clause`, `Apache-2.0`, `0BSD`, `CC0-1.0`,
`Unlicense`, `BlueOak-1.0.0`, `Python-2.0`) and fails on anything outside it (including a
missing/unknown license). The allowlist is the single source of truth and is human-edited
(adding a license is a deliberate, reviewed decision, like a constraint). It runs in CI as a
blocking step.

### Consequences

* Good, because the template (and everything that inherits it) provably ships only
  permissive licenses, with non-conforming additions blocked at PR time.
* Good, because the allowlist makes the policy explicit and reviewable rather than implicit.
* Bad, because some packages publish ambiguous or non-SPDX license fields and need an
  explicit, documented per-package exception in the config.
* Bad, because it adds one devDependency to maintain (acceptable — dev-only, not shipped).

### Confirmation

A `check:licenses` npm script runs `license-checker-rseidelsohn` over production deps against
the committed allowlist and fails on any out-of-allowlist or unknown license; it runs as a
CI step; the current tree passes (any exceptions enumerated explicitly in the config with a
reason).

## Pros and Cons of the Options

### `license-checker-rseidelsohn` + allowlist (chosen)

* Good, because local, deterministic, no SaaS, production-scoped.
* Good, because an explicit allowlist is auditable and forces a decision on each new license.
* Bad, because ambiguous license fields require manual per-package exceptions.

### SaaS license scanner

* Good, because richer policy, reporting, and obligation tracking.
* Bad, because it adds an account, token, and external trust surface disproportionate to a
  bootstrap template.

### None

* Good, because zero effort.
* Bad, because license risk propagates invisibly to every consuming project — the exact harm
  a template should not inherit-by-default.

## More Information

Sits beside the vulnerability gate (**0069**) and SAST (**0068**) as the supply-chain trio;
production-scope mirrors 0069. Uses the package manager of **0005**; allowlist edits are a
human, reviewed action in the spirit of **0046**. Revisit toward a SaaS scanner only if
license-obligation tracking is ever required.

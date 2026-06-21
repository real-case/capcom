# Problems and advantages

The value of this template lies not in its libraries or the number of tools it bundles, but in the system of control over how they are used, and in the development problems that system removes. An AI agent writes most of the code under machine-checkable rules from the first commit, and the human retains only the decisions that cannot be reduced to a script.

This document explains the purpose of the approach and the value that follows from it. Each advantage is a direct consequence of a specific problem the template solves, so the sections below move from the fundamental problem to the mechanism that answers it and the advantage that results. The mechanics of the checks themselves are covered in [02 — Defense mechanisms](02-defense-mechanisms.md), and the process and roles in [03 — Methodology](03-methodology.md).

## The fundamental problem: an AI is a probabilistic implementer

An AI agent writes most of the code here, and a large language model is a **probabilistic (stochastic)** author: it can produce correct code, but it does not guarantee it. Left unconstrained, it drifts in recognizable ways:

- It hallucinates a token name, writing a raw `#3b82f6` or a non-existent `--color-brand`.
- It invents a prop, adding an API to a component that its real usage does not have.
- It imports across a boundary that must not be crossed, such as a primitive that pulls in a composite without going through `index.ts`.
- It silently skips a state, forgetting `empty`, `loading`, `overflow`, or `error`.
- It obeys a stale rule, following an authoritative-looking instruction that has long since diverged from what CI checks — rule drift.

The defense is not to make the model error-free, which is unattainable, but to surround a probabilistic author with deterministic checkers so that any single mistake must survive _several independent machine checks_ before it reaches `main`. [02 — Defense mechanisms](02-defense-mechanisms.md) develops the mechanics of this claim.

Prose cannot do this job on its own. A convention written in a README stays a wish: it is easy to break and impossible to guarantee. A gate is a script that returns a pass-or-fail verdict. Text agreements grow stale; gates do not.

## From problem to advantage

The advantages of this template are not standalone merits but direct consequences of the problems it solves. Each pairing below is given in the order problem, mechanism, advantage.

### Lost knowledge and stale conventions become a traceable, immutable history

- **Problem.** Unwritten agreements live only in the memory of the people involved and in an outdated README. When those people leave, the knowledge is lost, and new contributors reproduce it without understanding why. For AI-generated code, the team that would carry that knowledge may not exist at all.
- **Mechanism.** Every architectural decision is recorded as an **ADR** (Architecture Decision Record) in MADR format under [`decisions/`](decisions/). An accepted ADR is immutable: a change is captured as a new _superseding_ record with paired links (`supersedes` / `superseded by`), never edited in place. Only a human performs the `proposed → accepted` transition. The agent's standing instruction, [`CLAUDE.md`](../CLAUDE.md), is generated from the accepted ADR corpus rather than maintained by hand, so it cannot diverge from the decisions, and the corpus integrity is checked automatically by `adr.py lint`.
- **Advantage.** The reason behind any accepted decision is traceable to its ADR, without reconstructing motivation from the git history or asking the team. Onboarding a new contributor or agent reduces to reading the decision corpus, and the knowledge stays in the repository when the people change.

### Prose that cannot guarantee rules becomes rules that are gates

- **Problem.** A convention described in a README stays a wish: it is easy to break and impossible to guarantee.
- **Mechanism.** A rule becomes a **gate** — a script that reads the real files, checks an invariant, and exits with an error when it is violated. The deterministic `check:*` checks complement `typecheck`, `lint`, `format:check`, coverage measurement, and the security scanners. Three properties turn a rule into a defense:

  | Property          | What it means                                               | How it is ensured                                  |
  | ----------------- | ----------------------------------------------------------- | -------------------------------------------------- |
  | Machine-checkable | A script decides pass or fail, not a human reading prose    | `check:*`, ESLint, `adr.py lint`                   |
  | Single source     | The rule the agent reads is identical to the rule CI checks | `gen:tokens`, `gen:types` plus a drift check in CI |
  | Self-enforcing    | The gate provably rejects a real violator                   | `check:gates` (see below)                          |

- **Advantage.** A green CI run means not a formal review but confirmed enforcement of the stated property.

### Knowledge laundering becomes a single source of truth

- **Problem.** The hardest class of error to detect arises when the agent follows a rule that looks authoritative but has quietly diverged from what CI checks.
- **Mechanism.** Everything the agent must obey is generated from a single canonical source and drift-checked in CI. For design tokens, the `@theme` layer in CSS is turned by `gen:tokens` into a typed union, a lint allowlist, and an agent rule reference (`tokens.agent-rules.md`), so the list the agent reads and the list the linter checks are produced in one pass from one source. For database types, the live Supabase schema is turned by `gen:types` into `database.types.ts`. CI runs the generators and fails on any difference (`git diff`); the generated artifacts are never edited by hand.
- **Advantage.** Any divergence between what the agent knows and what CI requires is technically impossible.

### Guarantees of unequal weight become a three-layer defense

- **Problem.** A hint and a blocking gate protect in different ways, but the two are easy to confuse, and a recommendation can be mistaken for a guarantee.
- **Mechanism.** Each rule belongs to exactly **one** of three layers, chosen by the _kind_ of guarantee it provides:
  - The **deterministic** layer (CI gates that _block merge_) provides _precision_: a passing gate confirms the property holds, and this is where the guarantee sits.
  - The **structural** layer (skills and graphs that _warn_) provides _completeness_: it lowers the rate of violations inside the agent's working loop, but it is not a guarantee.
  - The **judgment** layer (human gates) covers the irreducible: what cannot be reduced to a script.

  The layers are ordered by distance from the moment code is written. Structural hints fire while the agent is _making a decision_; deterministic gates fire when it _writes code_ and again in _CI_; the human acts at the _merge, accept, and promote_ boundary.

- **Advantage.** Every rule has a predetermined guarantee type and trigger point, which removes the false impression that a recommendation protects as reliably as a blocking gate.

### A green CI that guarantees nothing becomes self-checking gates

- **Problem.** A gate that cannot fail — a forgotten assertion, a disabled rule — is indistinguishable from a missing one and creates false confidence.
- **Mechanism.** For each custom rule, `check:gates` (property P6) injects a known violator, such as a raw hex color in a component, runs the gate, confirms it rejected the violator, and restores the original state in a `finally` block. This meta-check runs in CI alongside the rest.
- **Advantage.** The checks check themselves. A gate that has stopped firing — permanently green — is detected and can no longer mask a regression.

### Irreversible actions at AI speed become AI-led work behind human gates

- **Problem.** An agent can quickly do things that cannot be undone: accept a decision, merge into `main`, reveal a secret, approve a visual baseline.
- **Mechanism.** Every irreversible or judgment action is assigned to a human by an explicit list rather than a declaration (ADR 0046/0047): accepting ADRs, repository and branch-protection settings, production promotion, provisioning and rotating secrets, editing `constraints.md`, merging into `dev` and `main`, and approving a baseline in the Chromatic UI. All AI processes — PR review, CI triage, changelog drafting, security review — are never required checks; they inform the human but do not replace their approval, and every PR requires approval from a human other than the author.
- **Advantage.** The speed of the AI is preserved without losing control over the actions that cannot be undone.

### Diverging local and server checks become reproducibility

- **Problem.** When the local run and CI check different things, "it passed for me" means nothing, and flaky tests are masked by re-runs.
- **Mechanism.** The same set of `check:*` runs both locally in the `pre-pr-gate` skill and in [`ci.yml`](../.github/workflows/ci.yml). CI applies no global retries: a flaky test is explicitly quarantined as an annotated skip with a tracked, time-boxed issue (ADR 0049). The required status checks stay exclusively deterministic.
- **Advantage.** A local run reliably predicts the CI result, and the gap between local and server checks is removed.

### Supply-chain risk becomes security built into the gates

- **Problem.** A key leaked into git, a vulnerable transitive dependency, an incompatible license, a GitHub Action swapped under its tag — these risks are found unreliably in manual review.
- **Mechanism.** A security and integrity layer (ADR 0056, 0068–0074) covers them mechanically:
  - **Secrets** are caught by a blocking `gitleaks` scan (Layer 1) and an advisory AI review of invariants (Layer 2).
  - **Static analysis** runs through GitHub CodeQL.
  - **Dependency vulnerabilities** are a blocking step via `npm audit` (`check:audit`).
  - **GitHub Actions** are pinned to a full commit SHA by the `check:action-pins` gate.
  - **Dependency licenses** are checked against an SPDX allowlist by `check:licenses`, which matters for a template that other projects inherit.
  - **Documentation integrity** is checked through link validation (`links.yml`) and spelling (`check:spelling`).
  - **Commit messages** follow Conventional Commits via `check:commits` (commitlint).
- **Advantage.** Common risks are caught mechanically rather than through a reviewer's attention.

### A design system as agreements becomes a design system as checks

- **Problem.** A prose style guide does not stop the agent from using a raw color, duplicating a component, or skipping a state, so consistency has to be maintained through repeated manual review.
- **Mechanism.** A governance layer (ADR 0058–0064) turns the design system from agreements into checks:
  - **Tokens only** in components: raw color and size values, inline `style` with raw values, and Tailwind's numbered palette are rejected (`check:tokens`).
  - **The composition graph** (`composedOf` / `usedIn`) is reconciled against the real import graph by dependency-cruiser (`check:graph`), so structural duplication of a component is caught before it is even created (`ds:signature`).
  - **State coverage by subtraction** starts from the mandatory set for an archetype, and each missing state requires an explicit rationale; silence counts as a failure, not a pass.
  - **A typed `design-intent.ts`** for each component derives its API from the `usedIn` set rather than assigning it arbitrarily, and a mismatch with the real props or stories fails CI.
  - **Visual regression** catches a change that passes every functional test, through Chromatic (ADR 0043).
- **Advantage.** The visual and structural consistency of the interface is maintained by checks rather than by repeated manual code review.

### Application code with no placement standard becomes Feature-Sliced Design with checkable boundaries

- **Problem.** The component layer is deeply standardized, but the application layer — where data access, state, and the UI of a feature and the page that ties them together live — has none. Without it, code grows haphazardly under `src/app` and `src/lib`, and the import direction is checked by nothing. As real features arrive, the usual entropy begins: the "profile" feature reaches into the unrelated "billing" feature, a UI component imports a route, circular dependencies appear, and none of this is caught by review at scale. For a probabilistic agent this is especially dangerous, because without a placement standard it chooses where code goes by guessing.
- **Mechanism.** Application code is distributed across the **Feature-Sliced Design** layers (ADR 0065) with the canonical names `shared`, `entities`, `features`, and `widgets`; the existing `src/app` (App Router) plays the app/pages role, and a separate `pages` layer is deliberately not introduced. Imports are allowed only downward through the hierarchy — a higher layer may depend on a lower one but not the reverse — slices within a layer are isolated, and each slice is reachable only through its public `index.ts`. Direction and isolation are a **gate**, not an agreement: Steiger (`check:fsd`, ADR 0066), scoped to these layers, rejects any upward import, cross-slice access, or bypass of the public API in CI, while dependency-cruiser (ADR 0060) continues to hold the `src/components/**` boundary on a non-overlapping area. The placement of new code is determined by a deterministic decision tree (the `new-slice` skill) rather than by the agent's choice. FSD is added _additively_: the primitive kit `src/components/ui`, the governance artifacts in `src/design-system`, and the infrastructure in `src/lib` and `src/i18n` are not moved and stay outside the FSD area. The ADR 0065/0066 pair is still `proposed`, pending the human acceptance gate.
- **Advantage.** The agent always has a deterministic answer to "where does this code go," and the application architecture cannot grow uncontrolled: cross-feature coupling, a route imported from the UI, and cycles turn the build red rather than surfacing — or not — in manual review.

### Hidden degradation over time becomes self-activating, reactively growing infrastructure

- **Problem.** A rule is quietly disabled, a dependency is removed, a convention is eroded across a dozen small PRs, and no single diff is the cause.
- **Mechanism.** While `src/components/**` is empty the governance gates have nothing to act on, and they activate automatically on the first component added. The rules evolve _reactively_: a Defect Log records every missing or ambiguous rule, and the corresponding invariant travels from prose to a review-checkable Confirmation and then to an executable gate on its first violation (ADR 0064). A scheduled drift audit (ADR 0054) reconciles the code against the Confirmation section of every accepted ADR and surfaces slow erosion, such as a quietly disabled gate or a removed dependency.
- **Advantage.** The infrastructure does not stay static or degrade unnoticed; it evolves in a controlled way, driven by defects that have actually been observed.

## The design-system failure taxonomy (P1–P9)

The governance layer (ADR 0058–0064) exists against specific failure modes, numbered P1 through P9.

| P#  | Problem                                                                | Primary layer              | How it is closed                                |
| --- | ---------------------------------------------------------------------- | -------------------------- | ----------------------------------------------- |
| P1  | Token-rule violations (a raw value; a primitive instead of a semantic) | deterministic              | token lints; `check:tokens`, ADR 0058           |
| P2  | Structural duplication of components (isomorphic composition)          | structural                 | composition graph + `ds:signature`; ADR 0059    |
| P3  | Duplicated intent (one usage role across different components)         | judgment                   | collision gate; ADR 0061                        |
| P4  | Agent hallucination when deriving or approving an API                  | deterministic (proof)      | Figma approval artifact; ADR 0062/0063          |
| P5  | Composition requirements leaking into a primitive (lost reuse)         | deterministic + structural | boundary gate; ADR 0058/0060                    |
| P6  | Agent rules diverging from CI (knowledge laundering)                   | deterministic              | single-source codegen; test-the-test; ADR 0058  |
| P7  | Lost context when returning to a component in a batch pass             | judgment / process         | Defect Log; batch approvals                     |
| P8  | Incomplete state coverage (empty / overflow / loading skipped)         | structural                 | archetype registry + `ds:states`; ADR 0061      |
| P9  | Stored artifacts drifting from live sources after approval             | deterministic              | reconciliation fitness functions; ADR 0063/0064 |

Notably, the problem itself dictates the _layer_: what can be checked precisely (P1, P6, P9) becomes a blocking gate; what concerns _completeness_ (P2, P8) becomes a structural hint; and the irreducibly subjective (P3, P7) stays with the human.

## What it would be like without this approach

| Without this approach                                           | With this approach                                   |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| "Why is it like this?" — reconstruct from git and ask the team  | `ADR 0013` — the exact address of the motivation     |
| README conventions that no one guarantees                       | `check:*` checks that report an error explicitly     |
| The agent reads one thing, CI requires another                  | one `gen:*` pass: a shared source and a drift check  |
| A gate that has quietly stopped working                         | `check:gates` requires the violator to be rejected   |
| Slow erosion of rules goes unnoticed                            | a drift audit against the Confirmation of every ADR  |
| A leaked key, a vulnerability, a license — left to the reviewer | mechanical scanners in CI                            |
| The AI skips `empty` or `loading`                               | coverage by subtraction; silence counts as a failure |
| An irreversible action at AI speed                              | a list of human-only actions                         |

## Summary: problem, mechanism, ADR

| Problem                                     | Mechanism                                              | ADR        |
| ------------------------------------------- | ------------------------------------------------------ | ---------- |
| Hallucinated token name                     | token lint from a generated allowlist                  | 0058       |
| Invented prop / incorrect API               | API from `usedIn`; `check:design-intent`               | 0062       |
| Import across a boundary                    | dependency-cruiser `check:boundaries`                  | 0060       |
| Application code with no placement standard | FSD layers + `check:fsd` (Steiger)                     | 0065, 0066 |
| Structural duplicate of a component         | composition graph + `ds:signature`                     | 0059       |
| Skipped state                               | coverage by subtraction; `ds:states`                   | 0061, 0062 |
| Agent rule diverges from CI                 | single-source `gen:tokens` / `gen:types` + drift       | 0058, 0015 |
| A gate that cannot fail                     | `check:gates` (P6)                                     | 0078       |
| Unnoticed erosion of rules                  | scheduled drift audit                                  | 0054       |
| Stale conventions / lost knowledge          | the ADR corpus + generation of `CLAUDE.md`             | 0001, 0046 |
| Unresolvable ADR / script references        | `check:citations` / `check:claude` / `check:claude-md` | 0067       |
| Technical debt without justification        | `check:debt` (escape-hatch gate)                       | 0078       |
| Leaked secret                               | gitleaks (L1) + AI review (L2)                         | 0056       |
| Vulnerability in the code                   | CodeQL SAST                                            | 0068       |
| Vulnerable dependency                       | `check:audit` (`npm audit`)                            | 0069       |
| Swapped GitHub Action                       | `check:action-pins` (SHA pins)                         | 0070       |
| Incompatible license                        | `check:licenses` (SPDX allowlist)                      | 0071       |
| Inconsistent server state                   | three categories (Query / URL / Zustand)               | 0025–0027  |
| Visual regression                           | Chromatic                                              | 0043       |
| Irreversible action at AI speed             | the human-only list + PR approval                      | 0046, 0047 |
| Documentation diverging from the code       | derivation from the repository, drift check            | 0058, 0015 |

## In one sentence

The approach takes the riskiest point in modern development — a probabilistic implementer acting quickly and irreversibly — and makes it safe without sacrificing speed: every rule is machine-checkable, derived from a single source, and provably self-enforcing, while the human keeps exactly those decisions that cannot be reduced to a script. Every advantage of the template follows directly from this — a traceable decision history, checkable rules instead of prose, security inside the gates, and consistency that does not need to be confirmed by manual review each time.

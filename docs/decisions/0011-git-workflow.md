---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Git workflow: git-flow-lite with a dev integration branch

## Context and Problem Statement

The project needs a branching and integration model that the team and the AI agent both
follow consistently. The model must mesh with the two automation decisions already made:
the CI quality gate runs on pull requests (**0010**), and the hosting platform produces a
preview deployment per branch/PR (**0009**). It must also be simple enough not to impose
ceremony disproportionate to a small team plus agent.

The choice is the shape of the branch graph: a single always-deployable trunk with
short-lived branches, a lightweight two-tier model with an integration branch feeding a
production branch, or a full release/hotfix-branch flow. Picking too heavy a model adds
overhead; too loose a model risks unreviewed or half-integrated work reaching production.

## Decision Drivers

* **Gated integration** — every change lands via a pull request that the CI gate (**0010**)
  must pass.
* **Safe production branch** — the production branch is always deployable and protected.
* **Preview per change** — branches/PRs get isolated preview deploys (**0009**) for review.
* **Proportionate ceremony** — simple enough for a small team and an agent to follow without
  friction.

## Considered Options

* git-flow-lite — feature branches → `dev` (integration) → `main` (production)
* Trunk-based development — short-lived branches off `main`, frequent merges
* Full Git Flow — `develop` plus `release/*` and `hotfix/*` branches

## Decision Outcome

Chosen option: "git-flow-lite", because it adds exactly one integration tier over
trunk-based — a `dev` branch where feature branches converge and are validated together
before promotion to a protected, always-deployable `main` — without the release/hotfix
ceremony of full Git Flow. Feature branches open pull requests into `dev`; the CI gate
(**0010**) must pass and the branch's preview deploy (**0009**) is used for review;
`dev` is promoted to `main` for production. `main` (and `dev`) are protected, requiring the
CI status check before merge.

### Consequences

* Good, because an integration branch lets changes be validated together before they reach
  production, while `main` stays always-deployable.
* Good, because it composes directly with the PR-based CI gate (**0010**) and per-branch
  preview deploys (**0009**).
* Good, because it is light — one extra branch and a promotion step, not a release-management
  process.
* Bad, because the `dev → main` promotion is an extra step versus merging straight to a
  single trunk, and `dev` can drift from `main` if promotion lags.
* Bad, because two long-lived branches mean occasional reconciliation if hotfixes land
  directly on `main`.

### Confirmation

The repository has protected `main` and `dev` branches; feature branches merge into `dev`
via PRs gated by CI (**0010**); preview deploys (**0009**) appear per PR; production tracks
`main`. Branch protection is a repository setting, configured and documented separately.

## Pros and Cons of the Options

### git-flow-lite (chosen)

* Good, because it adds a single integration tier with minimal ceremony and composes with CI
  and preview deploys.
* Good, because `main` stays protected and always-deployable.
* Bad, because it adds a promotion step and a second long-lived branch to reconcile.

### Trunk-based development

* Good, because it is the simplest model — one branch, fast integration, no promotion step.
* Neutral, because it pairs well with strong CI and feature flags.
* Bad, because without an integration branch, batching and validating several changes
  together before production is harder, and it leans on feature-flag discipline the project
  has not committed to.

### Full Git Flow

* Good, because `release/*` and `hotfix/*` branches give precise control over releases.
* Bad, because that release-management ceremony is disproportionate for a continuously
  deployed app on Vercel (**0009**) with a small team and an agent — overhead with little
  payoff here.

## More Information

Builds on **0010** (PR-gated CI) and **0009** (per-branch preview deploys), which this
workflow assumes. `hotfix/*` branches (off `main`) are the sanctioned exception to the
mandatory coverage gate (**0008**); all other gate steps still apply to them. It is independent of the application stack and could be revisited (e.g.
moving to trunk-based with feature flags) via a superseding ADR if the team's release cadence
changes.

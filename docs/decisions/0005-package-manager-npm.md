---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# npm as the package manager of record

## Context and Problem Statement

Every project needs one tool that installs dependencies and runs its scripts, and that choice
fixes the lockfile format, the CI install command, and the `run` semantics the whole repository
depends on. The candidates — npm, pnpm, yarn, and bun — are all real and worth weighing
explicitly, because once a lockfile exists the cost of switching is high.

This record settles only the package manager. How the local environment is *orchestrated* into
a single startup command is a separate, downstream decision (**0024**).

## Decision Drivers

* **One package manager, one lockfile** — a single, reproducible dependency resolution
  (`npm ci` in CI, **0010**) and one script runner.
* **Lowest-friction default** — the package manager bundled with Node (**0004**) needs no extra
  install step for contributors or CI.
* **Ubiquity over micro-optimization** — a single-app project barely realizes the speed and
  disk wins of the alternatives, while paying their bootstrap cost everywhere.

## Considered Options

* npm — ships with Node, `package-lock.json` as the lockfile
* pnpm — faster, disk-efficient, strong workspaces
* yarn — mature, established workspaces
* bun — fastest install, newest runtime/toolchain

## Decision Outcome

Chosen option: "npm", because it ships with Node (**0004**) so it needs no bootstrap step in dev
or CI, and one lockfile plus one runner make dependency resolution reproducible. npm is the
package manager of record: `package-lock.json` is the committed lockfile, `npm ci` installs in
CI (**0010**), and pnpm / yarn / bun are not used. The npm scripts this defines are what the
local dev orchestrator (**0024**) sequences.

### Consequences

* Good, because npm needs no separate installation, keeping dev and CI setup minimal.
* Good, because one lockfile and one runner make dependency resolution reproducible.
* Bad, because npm is slower and less disk-efficient than pnpm and lacks some workspace
  ergonomics — a cost accepted for ubiquity and zero-setup.

### Confirmation

`package-lock.json` is committed; CI installs with `npm ci` (**0010**). The absence of
`pnpm-lock.yaml` / `yarn.lock` / `bun.lockb` is verifiable by inspection.

## Pros and Cons of the Options

### npm (chosen)

* Good, because it is zero-setup (ships with Node, **0004**) and universally understood.
* Good, because one lockfile/runner is reproducible across dev and CI.
* Bad, because it is slower and less disk-efficient than pnpm.

### pnpm

* Good, because it is fast and disk-efficient with strong workspace support.
* Bad, because it adds a bootstrap/install step in dev and CI for benefits a single-app project
  barely realizes.

### yarn

* Good, because it is mature with established workspace support.
* Bad, because it adds a bootstrap step and another lockfile convention for no decisive gain.

### bun

* Good, because its installer is the fastest of the four.
* Bad, because adopting it as the package manager couples the project to a younger toolchain for
  a single-app workload that does not need it.

## More Information

Builds on **0004** (npm ships with Node 24). The `npm ci` install and the gate commands are
consumed by CI (**0010**); the npm scripts are sequenced into a one-command local environment by
the dev orchestrator (**0024**).

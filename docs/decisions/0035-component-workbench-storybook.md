---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Component workbench: Storybook 10 on the Vite builder, with stories doubling as tests

## Context and Problem Statement

The component layer — shadcn/ui over Radix (**0034**), themed by the design tokens (**0033**) and
styled with Tailwind (**0032**) — needs a place to be developed and documented *in isolation*,
outside full App Router pages and a running Supabase backend. Without a workbench a component's
states (variants, sizes, loading/error, light/dark, RTL/locale) can only be exercised by booting
the whole app or reading the source; there is no living catalogue of how the component layer looks
and behaves.

Two questions are settled together: which isolation workbench to adopt and *how deeply* it wires
into the testing strategy. The stack shapes both — Vitest is the Vite-native runner (**0007**)
with Playwright already present for the browser, so the workbench can reuse that toolchain rather
than stand up a parallel one. Scope is the **client** component layer; React Server Components and
server-only data access (**0002**, **0013**) do not render in an isolated workbench without
mocking and are out of scope here.

## Decision Drivers

* **Isolated development and living documentation** — build and review component states without
  routing, auth, or a database, and keep an always-current catalogue of the UI.
* **Toolchain reuse, not a second build graph** — the workbench should ride the existing
  Vite/ESM/TS setup and the Vitest runner (**0007**), not introduce a parallel Webpack build.
* **Stories as tests, not throwaway fixtures** — the setup written to document a component is
  reusable as a component test that counts toward the coverage gate (**0008**).
* **Token and Tailwind fidelity** — stories must render with the real design tokens (**0033**) and
  Tailwind (**0032**) so the workbench matches production, including theming.
* **RSC boundary fit** — the workbench renders client components, respecting the RSC-default model
  (**0002**).
* **Compatibility with the mandated test stack** — the workbench must install on the project's
  Vitest 4 / Vite 8 / React 19 toolchain (**0007**) without forcing a downgrade.

## Considered Options

* Storybook on the Vite builder, with the Storybook Vitest addon so stories run as browser-mode
  component tests — on the **Storybook 10 line** (the line that supports Vite 8)
* Storybook on the Vite builder as a docs/dev workbench only — stories are not tests
* A lighter workbench (Ladle / Histoire)
* No isolated workbench — rely on RTL (**0007**), Playwright e2e, and the running app

## Decision Outcome

Chosen option: "Storybook on the Vite builder, with stories doubling as tests via the Storybook
Vitest addon, on the Storybook 10 line", because it gives the shadcn/token component layer an
isolated workbench and living documentation while reusing — not duplicating — the test toolchain
already decided, and the 10 line is the one that installs cleanly on the mandated Vitest 4 /
Vite 8 / React 19 stack (**0007**) without forced peers or a downgrade.

Storybook runs on its Vite builder (`@storybook/nextjs-vite`), sharing the project's Vite/ESM/TS
configuration and picking up the React Compiler setup (**0029**). The `@storybook/addon-vitest`
addon runs each story as a real component test in Vitest browser mode, reusing the Playwright
dependency from **0007**; those story-tests join the Vitest project and their coverage counts
toward the 80% gate (**0008**). Storybook is configured under `.storybook/`, which imports the
global Tailwind/token stylesheet so stories render with the real design tokens (**0033**) and
Tailwind (**0032**), including light/dark. Stories live beside their components
(`src/**/*.stories.tsx`); interaction (`play`) functions and the addon execute under Vitest
browser mode. The Storybook packages are pinned to the `^10` (10.4.x) line; tracking that line is
owned by the dependency-update process (**0057**).

This record *extends* **0007**: stories-as-tests become part of the unit/component layer, so the
component documentation effort and the component test effort become one artifact.

### Consequences

* Good, because the component layer gains isolated development and an always-current catalogue,
  reviewable without booting routes, auth, or a database.
* Good, because the Vite builder and Playwright browser runner are shared with **0007** — one
  build graph and one browser stack, so the marginal config and CI cost is low.
* Good, because a story is also a test: fixtures written for documentation earn coverage toward
  **0008** instead of being throwaway.
* Good, because the 10 line installs on the current Vitest 4 / Vite 8 / React 19 toolchain with no
  downgrade and no forced peers.
* Bad, because Storybook (builder plus addons) is a substantial dependency surface kept on the
  Storybook/Vite/Vitest version treadmill (owned by **0057**).
* Bad, because coupling stories to the test gate makes them load-bearing — a broken story can fail
  CI (**0010**).
* Bad, because RSC/server-only components and Supabase-backed data (**0002**, **0013**) do not
  render in the workbench without mocks.

### Confirmation

`.storybook/` is configured with the Vite builder (`@storybook/nextjs-vite`) and
`@storybook/addon-vitest` wired into the Vitest workspace; `package.json` pins the Storybook
packages to the `^10` line and `npm install` resolves with no `--legacy-peer-deps` / `--force`.
`npm run storybook` serves the workbench; the Storybook test project runs under `vitest` and its
coverage merges into the **0008** gate, executed in the CI quality gate (**0010**). The
`.storybook` preview imports the global token/Tailwind stylesheet, and stories live at
`src/**/*.stories.tsx`. No parallel Webpack-based Storybook build is present.

## Pros and Cons of the Options

### Storybook 10 (Vite builder) + Vitest addon, stories as tests (chosen)

* Good, because it delivers the workbench and living docs while reusing the Vite builder and the
  Playwright/Vitest runner from **0007** — no second toolchain.
* Good, because stories double as browser-mode component tests that feed the **0008** coverage
  gate, eliminating duplicate fixtures.
* Good, because the 10 line is a drop-in on the installed Vitest 4 / Vite 8 / React 19 stack.
* Bad, because stories become load-bearing for CI, and the Storybook/addon stack must be tracked
  on the 10 line (**0057**).

### Storybook (Vite builder), docs/dev workbench only

* Good, because it is a simpler adoption, orthogonal to the test pyramid (**0007**, **0008**).
* Bad, because stories and component tests stay two separate efforts; the documentation fixtures
  earn no coverage and can silently drift from how components are tested.

### A lighter workbench (Ladle / Histoire)

* Good, because both are lean, fast, Vite-native story viewers with less configuration.
* Bad, because they have a far smaller addon ecosystem and no first-party stories-as-tests
  integration with Vitest, so the test-layer reuse — the main reason for the chosen option — would
  have to be hand-built.

### No isolated workbench

* Good, because it adds zero tooling and keeps the dependency surface minimal.
* Bad, because component states can only be exercised through full pages or RTL assertions — no
  visual catalogue, no isolated development, no living documentation of the component layer
  (**0034**), the exact gap this record addresses.

## More Information

Builds on **0032** (Tailwind), **0033** (design tokens), and **0034** (the shadcn/ui component
layer the stories document); respects the RSC boundary in **0002** (stories cover client
components). It **extends 0007** by adding stories-as-tests to the unit/component layer and reusing
its Playwright + Vitest machinery, and it feeds the coverage gate in **0008**; the CI workflow
that runs the test project is **0010**, and the Vite builder picks up the React Compiler
configuration from **0029**. The downstream story modalities build on this workbench: CSF 3
authoring (**0036**), test-execution engines (**0037**), interaction/play functions (**0038**),
the a11y gate (**0039**), the snapshot policy (**0040**), coverage merge (**0041**), and the
component story-coverage policy (**0042**). The Storybook 10 line is tracked by the
dependency-update process (**0057**). Per **CON-001** / **CON-002**, React and Next.js (App
Router) are mandated; this record decides only the component workbench.

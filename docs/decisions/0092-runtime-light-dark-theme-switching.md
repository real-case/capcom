---
status: "accepted"
date: 2026-07-02
decision-makers: Yurii Anichkin
---

# Runtime light/dark theme switching with a cookie-persisted toggle

## Context and Problem Statement

ADR **0079** deferred runtime theme switching as a template-neutrality decision: ship the `.dark`
value layer only, add no theme-toggle and no theming dependency, and invite the consuming project
to record its own ADR choosing a mechanism — "at which point that record supersedes this deferral."
CAPCOM is now that consuming project. Its refreshed product goal — a premium, production-grade
portfolio demo — makes a polished light/dark experience a first-class UX requirement rather than a
deferred nicety.

There is also a concrete token-layer inconsistency to resolve. The app chrome themes against the
shadcn `:root` (light) / `.dark` value layer (**0033**), while the mission-control surfaces and
charts theme against the **fixed-dark** `--c-*` primitive layer and its `--surface-*` / `--status-*`
/ `--viz-*` semantic names (**0081**). With no `.dark` class applied anywhere in `src/app` today,
"the app" actually renders as the light neutral shadcn baseline wrapped around a dark data-viz
layer — a split a real theme system must unify. The question: do we adopt runtime light/dark
switching, by what mechanism under the RSC-default model, and how do the two token layers reconcile
into a single coherent themed surface?

## Decision Drivers

* **Premium product UX** — a system-preference-aware, user-switchable, persisted theme is table
  stakes for the production-grade bar the new goal sets.
* **RSC-first, no hydration flash** — the theme must land **before first paint** (**0002**); a naive
  client toggle (post-hydration) paints the wrong theme on first render.
* **Preserve static generation** — the theme must not force the public routes into dynamic rendering;
  the landing's static generation and SEO posture (**0031**) stay intact.
* **One coherent surface** — the shadcn value layer (**0033**) and the mission-control primitive
  layer (**0081**) must resolve under a single theme axis so chrome and data-viz flip together and
  never sit half-themed.
* **Reuse the existing primitive-swap architecture (0082)** — tenant and density already re-compose
  by overriding the `--c-*` primitive layer *only*; light/dark should be a third such axis, not a
  parallel mechanism, so the swap-only invariant keeps holding.
* **Contrast gated in both themes** — `check:contrast` (**0081**) must run over the light *and* dark
  compositions, not just dark.
* **Minimal dependency surface** — prefer no new client theming dependency if the RSC model can
  deliver a flash-free toggle natively.

## Considered Options

* **A — Cookie-persisted, class-based theme with no client provider, light as a primitive-layer
  swap** (extends **0082**'s mechanism): the class is applied over a static SSR default by a
  pre-paint resolver, with system preference the first-visit default.
* **B — Adopt `next-themes`** (a client theme provider) as the switch mechanism.
* **C — System-preference only** via CSS `@media (prefers-color-scheme)`, with no user toggle.

## Decision Outcome

Chosen option: **A — cookie-persisted, class-based theme with no client provider**, because it
delivers the toggle the premium goal needs while staying RSC-first and flash-free — and **keeps the
public routes statically generated** (**0031**): the root layout renders a static dark-first default
class and inlines a pre-paint resolver that reads the theme cookie (or the system preference on a
first visit) and applies the class before first paint, so **no** cookie is read on the server (no
dynamic-rendering opt-in) and no client theming dependency is introduced. It models light/dark as a **third primitive-layer swap** alongside tenant
and density (**0082**): the mission-control `--c-*` layer gains a light composition, and because the
shadcn and mission-control layers resolve under one theme axis, the whole surface — chrome and
charts — flips as one unit. `check:contrast` (**0081**) extends to gate both compositions. On
acceptance this record **supersedes 0079** (the deferral is now resolved for this project, via
`adr-supersede`); **0086**'s "dark-first, single value layer" clause is correspondingly updated —
charts read whichever composition is active, and token-ownership of every pixel is unchanged.

The decision fixes:

* **Two real theme compositions.** The `--c-*` primitive layer (**0081**) gains a light composition;
  the shadcn `:root` / `.dark` value layer (**0033**) and the mission-control layer resolve under a
  single theme axis, so no surface is left half-themed.
* **Static default + pre-paint resolver, cookie-persisted.** The root layout renders a static
  dark-first class — **no** server `cookies()` read, so the public routes stay statically generated
  (**0031**) — and inlines a pre-paint script that reads the cookie (or the system preference on a
  first visit) and applies the theme before first paint. Flash-free and RSC-first; the resolver is a
  small bounded script, **not** a client theme-provider.
* **A single toggle control.** One `ThemeToggle` (a client leaf) writes the cookie and updates the
  class. The exact affordance (a system / light / dark tri-state or a binary with a system default)
  is implementation; the persistence + pre-paint-application *contract* is what this record fixes.
* **Swap-only invariant preserved (0082).** Light/dark re-composes the `--c-*` primitive layer only;
  the semantic `--color-*` / `--surface-*` / `--status-*` / `--viz-*` names never change per theme.
  It is added as a **third governed selector** to `gen:tokens`' swap-only check (alongside
  `[data-tenant]` / `[data-density]`, **0082**): the invariant itself is unchanged, its coverage
  extends to the theme selector, re-proven by the self-test.
* **Contrast gated both ways (0081).** `check:contrast` runs the status fg/bg and text/surface pairs
  in both the light and dark compositions.

### Consequences

* Good, because the premium theme UX ships flash-free and RSC-native with no new client dependency.
* Good, because it reuses **0082**'s primitive-swap mechanism: light/dark becomes a **third governed
  selector** on `gen:tokens`' swap-only check (alongside `[data-tenant]` / `[data-density]`) — the
  invariant itself is unchanged and its coverage extends by one selector, so the gate keeps holding
  by design rather than by new rules.
* Good, because it resolves today's inconsistent "light chrome + dark charts" into one coherent,
  themed surface that flips as a unit.
* Bad, because a light mission-control palette is net-new design and contrast work — the `--c-*`
  light composition must be authored and clear WCAG 2.2 AA (**0081**).
* Bad, because every component and story now carries a second theme to keep correct (the Storybook
  dark story becomes dark *and* light).
* Good, because reading the cookie in a pre-paint script rather than on the server keeps the public
  routes statically generated — the theme adds no dynamic-rendering opt-in (**0031**).
* Bad, because the pre-paint resolver + cookie wiring is real machinery **0079** deliberately avoided
  — now justified by the product goal rather than assumed.

### Confirmation

* A `ThemeToggle` exists and persists the choice to a cookie; the pre-paint resolver applies the
  theme over the static SSR default, verified in the running app and an e2e asserting **both** paths
  — the persisted choice survives a reload with no flash, and a first-visit (no-cookie) render
  matches system preference with no flash — plus that the public routes stay statically generated
  (no server cookie read).
* `gen:tokens`' swap-only check is extended to the theme selector (a third governed selector
  alongside `[data-tenant]` / `[data-density]`, **0082**) and its self-test passes: the light
  composition overrides only `--c-*` primitives, never a semantic name.
* `check:contrast` passes for **both** the light and dark compositions over the mission-control
  status fg/bg and text/surface pairs (**0081**).
* Storybook renders both themes; the axe gate (**0039**) passes in each; Chromatic (**0043**)
  snapshots both.
* `package.json` declares no client theme-provider dependency (the pre-paint-resolver approach adds
  none); were one ever added it would sit within the audit/license gates (**0069** / **0071**).

## Pros and Cons of the Options

### A — Cookie-persisted, class-based theme, no client provider (chosen)

The root layout renders a static dark-first default; a pre-paint inline script reads the cookie (or
system preference) and applies the class before paint; light is a `--c-*` primitive-layer swap,
reusing **0082**.

* Good, because it is flash-free and RSC-native without a client provider dependency.
* Good, because reading the cookie in a pre-paint script (not on the server) keeps the public routes
  statically generated — no dynamic-rendering opt-in (**0031**).
* Good, because light/dark becomes a third primitive-swap axis — one mechanism for tenant, density,
  and theme; the swap-only invariant and `check:contrast` extend naturally.
* Neutral, because first-visit system-preference and the cookie read live in a small pre-paint
  resolver rather than being free.
* Bad, because a light mission-control palette must be authored and contrast-cleared from scratch.

### B — Adopt `next-themes`

* Good, because dark/light and system preference work out of the box with mature no-flash handling.
* Neutral, because it is a widely used, small dependency.
* Bad, because it bakes a client-provider model into an RSC-first app and adds a theming dependency
  where the existing middleware can apply the class server-side without one.

### C — System-preference only (`@media`)

* Good, because it is the simplest possible approach and adds nothing to the runtime.
* Bad, because it offers **no user toggle** — the premium goal explicitly wants a switchable,
  persisted theme, which `prefers-color-scheme` alone cannot provide.

## More Information

Supersedes **0079** (its deferral is resolved for this project). Extends **0082** (light/dark as a
third primitive-swap axis) and **0033** / **0081** (the token layers it unifies). It **refines**
**0086**'s single-value-layer assumption in place — through this newer record rather than by
superseding 0086 — because only the *active composition* varies while token-ownership of every chart
pixel is unchanged (the same refine-by-a-newer-record pattern **0087**–**0089** use for **0084**).
Bound by the RSC model (**0002**) and the a11y / visual-regression gates
(**0039** / **0043** / **0052**). Realized in roadmap **PR-11** (the keystone of the premium-UI
track); the deferral pattern it closes is the one **0079** itself anticipated.

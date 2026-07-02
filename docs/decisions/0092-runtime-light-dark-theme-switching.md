---
status: "accepted"
date: 2026-07-02
decision-makers: Yurii Anichkin
---

# Runtime light/dark theme switching with a cookie-SSR toggle

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
* **RSC-first, no hydration flash** — the switch must be applied server-side (**0002**); a naive
  client toggle paints the wrong theme on first render.
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

* **A — Cookie-persisted choice + SSR-applied theme class, light as a primitive-layer swap**
  (extends **0082**'s mechanism); system preference resolved as the pre-paint default.
* **B — Adopt `next-themes`** (a client theme provider) as the switch mechanism.
* **C — System-preference only** via CSS `@media (prefers-color-scheme)`, with no user toggle.

## Decision Outcome

Chosen option: **A — cookie-persisted choice + SSR-applied class**, because it delivers the toggle
the premium goal needs while staying RSC-first and flash-free: the active theme is read from a
cookie on the server (the middleware already composes next-intl + the Supabase session, **0030** /
**0013** — the cookie read joins it) and applied as a class before paint, so no new client theming
dependency is introduced. It models light/dark as a **third primitive-layer swap** alongside tenant
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
* **Server-applied, cookie-persisted.** The active theme is read from a cookie on the server and
  applied as a class before paint. With a cookie present this is genuinely flash-free; on a first
  visit (no cookie) the pre-paint default resolves to system preference via a `@media` default or an
  inline resolver (see option A) — a small, bounded piece of no-flash machinery, not "free".
* **A single toggle control.** One `ThemeToggle` (a client leaf) writes the cookie and updates the
  class. The exact affordance (a system / light / dark tri-state or a binary with a system default)
  is implementation; the persistence + SSR-application *contract* is what this record fixes.
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
* Bad, because the cookie + SSR-class wiring is real machinery **0079** deliberately avoided — now
  justified by the product goal rather than assumed.

### Confirmation

* A `ThemeToggle` exists and persists the choice to a cookie; the theme class is applied server-side
  (no client-only flash), verified in the running app and an e2e asserting **both** paths: the
  persisted choice survives a reload with no flash, and a first-visit (no-cookie) render matches
  system preference with no flash.
* `gen:tokens`' swap-only check is extended to the theme selector (a third governed selector
  alongside `[data-tenant]` / `[data-density]`, **0082**) and its self-test passes: the light
  composition overrides only `--c-*` primitives, never a semantic name.
* `check:contrast` passes for **both** the light and dark compositions over the mission-control
  status fg/bg and text/surface pairs (**0081**).
* Storybook renders both themes; the axe gate (**0039**) passes in each; Chromatic (**0043**)
  snapshots both.
* `package.json` declares no client theme-provider dependency (the cookie-SSR approach adds none);
  were one ever added it would sit within the audit/license gates (**0069** / **0071**).

## Pros and Cons of the Options

### A — Cookie-persisted choice + SSR-applied class (chosen)

The theme is a cookie read on the server and applied as a class before paint; light is a `--c-*`
primitive-layer swap, reusing **0082**.

* Good, because it is flash-free and RSC-native without a client provider dependency.
* Good, because light/dark becomes a third primitive-swap axis — one mechanism for tenant, density,
  and theme; the swap-only invariant and `check:contrast` extend naturally.
* Good, because the middleware already runs (next-intl + Supabase session), so the cookie read is a
  small addition, not new machinery.
* Neutral, because first-visit system-preference needs a pre-paint resolution (a `@media` default or
  an inline resolver) rather than being free.
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

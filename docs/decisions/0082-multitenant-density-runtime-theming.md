---
status: "accepted"
date: 2026-06-22
decision-makers: Yurii Anichkin
---

# Multi-tenant and density runtime theming via data-attributes, on a swap-only primitive layer

## Context and Problem Statement

CAPCOM is multi-tenant, and its dashboard must render at two information densities. The token
vocabulary (**0081**) defines a `--c-*` primitive layer with a semantic layer built on top. This
record decides *how the palette re-composes per tenant* and *how spacing/sizing switches between a
comfortable and a dense mode* at runtime.

Two requirements shape the decision. First, a tenant theme must redefine the **primitive layer
only** — the semantic tokens and every component stay byte-for-byte identical, so onboarding a
tenant is a palette swap, never a component fork. Second, density must toggle a parallel set of
dimension tokens (space, row height, control height, font size) that components already read, so
the same component renders correctly comfortable or dense with no per-density code.

This sits against **0079**, which deferred runtime theme switching. **0079** is explicitly about
the **light/dark theme-class toggle mechanism** — a theme provider, `next-themes`, a cookie +
SSR-set `.dark` class, system-preference detection, no-flash handling — and its Confirmation is
*the absence of that machinery*. Critically, **0079** states that "adding runtime switching is
gated behind a new ADR." Tenant palette and density are different axes from light/dark, and this
record is exactly the new ADR **0079** calls for; the boundary between the two must be argued, not
assumed.

## Decision Drivers

* **One swap point per tenant** — re-compose the whole palette by redefining primitives only; the
  semantic layer and components never change (**0081**).
* **Density without forks** — one component renders comfortable or dense by reading dimension
  tokens, never hardcoded sizes.
* **No client runtime** — re-composition must be pure CSS (attribute selectors + `var()`), with no
  JavaScript theme provider, consistent with the RSC-default, runtime-free styling of **0032**.
* **Enforce the two-layer contract** — "tenant/density redefine primitives only" must be a build
  invariant, not a convention an author can quietly violate.
* **Respect the 0079 boundary** — add the tenant/density axes without re-opening the deferred
  light/dark toggle decision.

## Considered Options

* **`[data-tenant]` / `[data-density]` attribute selectors overriding `--c-*` primitives, with a
  build-time swap-only invariant** — base (`:root`) is the mission default; `[data-tenant="example"]`
  redefines primitives; `[data-density="dense"]` redefines dimension primitives; the codegen
  (**0058**/**0081**) fails the build if any such block declares a non-primitive name.
* **A React theme provider that injects per-tenant CSS variables at runtime** — a client context
  computes and sets variables on a wrapper element.
* **Build-time generated per-tenant stylesheets** — emit one CSS file per tenant from a token
  source and load the matching one.

## Decision Outcome

Chosen option: **"`[data-tenant]` / `[data-density]` attribute selectors overriding `--c-*`
primitives, with a build-time swap-only invariant"**, because it re-composes the palette through a
single primitive swap point in pure CSS, keeps the semantic layer and components untouched, and
adds no client runtime. Concretely, `src/app/globals.css` carries the mission default on `:root`
(**0081**), a `[data-tenant="example"]` block that redefines the `--c-*` **palette** primitives
only (proving full re-composition through one swap point), and a `[data-density="dense"]` block
that redefines the `--c-*` **dimension** primitives only (`--c-space-*`, `--c-row-height`,
`--c-control-height`, `--c-font-size-*`); `comfortable` is the `:root` default. Because the
semantic layer reads primitives via `var()` and the `@theme inline` bridge inlines those `var()`s,
a single attribute on a root container re-resolves every dependent token with no rebuild and no JS.

The contract is **enforced, not trusted**: the single-source codegen (**0058**/**0081**) parses the
`[data-tenant]` and `[data-density]` blocks and **throws** (failing `gen:tokens`, hence the CI
token-drift gate) if any of them declares a name that is not an existing `--c-*` primitive — so a
block can only ever *swap* primitives, never introduce a token or touch a semantic `--color-*`
name. A `--self-test` mode proves the invariant rejects a violating block and accepts a valid one.

**Boundary with 0079.** **0079** defers the *light/dark theme-class toggle mechanism* and adds no
theme provider, no `next-themes`, and no toggle component; its Confirmation is the absence of that
machinery. This record adds **neither** a theme provider, **nor** `next-themes`, **nor** a toggle
component, **nor** any middleware/cookie coupling — `[data-tenant]` and `[data-density]` are
declarative configuration attributes a host sets on a container, on axes (tenant identity, density
preference) that are orthogonal to light/dark. The `.dark` light/dark toggle stays deferred under
**0079**. This is precisely the "new ADR" **0079** says must gate any runtime switching; it bounds
**0079** rather than superseding it.

### Consequences

* Good, because a tenant is onboarded by a single primitive-override block — the semantic layer and
  every component are untouched (**0081**).
* Good, because density is one attribute on a root container; components read dimension tokens and
  render correctly in both modes with no per-density code.
* Good, because re-composition is pure CSS with no client runtime, consistent with **0032**.
* Good, because the two-layer "swap primitives only" rule is a build invariant (**0058**/**0081**),
  self-tested, so it cannot silently rot.
* Bad, because this is the first runtime variable-override mechanism to ship since **0079** deferred
  runtime switching — accepting it is a conscious boundary call a human must make (**0046**), and the
  conformance reviewer will weigh the **0079** boundary.
* Bad, because the `oklch` primitives are authored by hand rather than imported from a design export,
  so tenant palettes are maintained in `globals.css` until a real export is wired (**0033**/**0045**).

### Confirmation

`src/app/globals.css` carries the `:root` mission default (**0081**), a `[data-tenant="example"]`
block that declares only `--c-*` palette primitives, and a `[data-density="dense"]` block that
declares only `--c-*` dimension primitives. `node scripts/gen-tokens.mjs --self-test` proves the
swap-only invariant rejects a block that introduces a new token or edits a non-primitive name and
accepts a valid primitive-only override; `npm run gen:tokens` runs that same invariant on the real
file (so the CI token-drift step exercises it, **0058**/**0015**). The repository still declares
**no** theme-provider dependency and ships **no** runtime theme-toggle component — the **0079**
deferral of light/dark is intact. `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Pros and Cons of the Options

### `[data-tenant]` / `[data-density]` attribute selectors + swap-only invariant (chosen)

* Good, because one primitive swap point re-composes the palette with zero changes to semantics or
  components, in pure CSS with no client runtime.
* Good, because the "primitives only" contract is a self-tested build invariant, not a convention.
* Neutral, because it relies on the host setting `[data-tenant]` / `[data-density]` on a root
  container — a documented integration point, not a finished toggle UI.
* Bad, because it is the first runtime override mechanism since **0079**, so its boundary must be
  argued and human-accepted.

### React theme provider injecting per-tenant variables

* Good, because tenant palettes could come from a database at runtime without redeploys.
* Bad, because it adds a client provider and JavaScript to the styling path — exactly the
  runtime-free-styling stance **0032** holds and the provider machinery **0079** declined.

### Build-time generated per-tenant stylesheets

* Good, because each tenant ships a fully static stylesheet with no runtime indirection.
* Bad, because it multiplies CSS artifacts and a build step per tenant, and loses the single
  swap-point elegance — re-composition becomes a build concern rather than one attribute, with no
  benefit over `var()` indirection for this dashboard.

## More Information

Builds directly on **0081** (the `--c-*` primitive layer and the semantic vocabulary it swaps) and
the single-source codegen + swap-only invariant of **0058**. Bounds **0079**: the light/dark toggle
mechanism stays deferred; this record is the "new ADR" **0079** requires to gate the tenant/density
runtime axes, and adds none of the provider/dependency/middleware machinery **0079** declined.
Styling stays CSS-first and runtime-free (**0032**); token values stay code-canonical and the figma
MCP server read-only (**0033**/**0045**). Accepting this record, like every `proposed → accepted`
transition, is a human action (**0046**).

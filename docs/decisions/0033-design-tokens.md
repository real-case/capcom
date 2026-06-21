---
status: "accepted"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Design tokens: CSS custom properties via @theme, with a neutral shadcn baseline

## Context and Problem Statement

The project commits to a theme driven by **design tokens** — the named, reusable design
decisions (color, spacing, radius, typography) that give the UI a single visual source of truth.
This record settles where those tokens live, how the styling layer (Tailwind, **0032**) and the
component layer (shadcn/ui, **0034**) consume them, how light/dark switches, and — for a project
published as a **reusable starter template** — what concrete token set ships by default.

A token model must serve two layers that depend on it: Tailwind's CSS-first `@theme`
configuration (**0032**) needs a source for theme values, and shadcn/ui components (**0034**)
need themeable values to style against. It must also be parseable by the single-source token
codegen (**0058**) that generates the typed token union, the lint allowlist, and the agent rules.
And because this repository is a brand-neutral template — it ships no product design data — the
default values must be a well-known, accessible stock set, not a fabricated bespoke palette.

## Decision Drivers

* **Single source of truth** — one definition of the design scale, consumed by Tailwind
  (**0032**) and components (**0034**) and parsed once by the codegen (**0058**).
* **Runtime theming** — light/dark (and future themes) must switch at runtime without a rebuild,
  which favors CSS custom properties.
* **Semantic layer** — components reference intent (`--color-primary`, `--color-muted`) not raw
  primitives, so themes can remap meaning.
* **RSC-friendly** — theming must work as static CSS with no client runtime (**0032**).
* **Brand-neutral by default** — the template carries no product-specific design data; a consumer
  wires their own system, they do not inherit someone else's brand.
* **Zero fabricated design data** — use a well-known, a11y-sane stock set rather than inventing a
  fake bespoke palette to look "designed".
* **A scalable target, kept as documentation** — a real design export (e.g. a Figma variable
  export) has a richer layered shape; the architecture for adopting one is recorded here as the
  documented target, even though the template ships the neutral baseline.

## Considered Options

* **CSS custom properties in `@theme`, neutral shadcn baseline, with a `@theme inline` bridge** —
  ship the stock shadcn (Tailwind v4) value layer (`:root` + `.dark`), keep the spacing/radius/
  typography scale, bridge the shadcn names onto it; document a layered Figma-export architecture
  as the re-adoption target.
* **Tokens as a JavaScript/TypeScript object** consumed at build time.
* **A Style Dictionary multi-platform pipeline** generating tokens from one source.
* **Ship a full bespoke brand export** as the template's default palette.

## Decision Outcome

Chosen option: **"CSS custom properties in `@theme`, neutral shadcn baseline, with a `@theme
inline` bridge"**, because CSS variables are the natural fit for runtime theming (light/dark by
overriding variables, no rebuild), they live alongside Tailwind's CSS-first config (**0032**),
and shadcn/ui (**0034**) styles against them directly — while a stock shadcn palette keeps the
template brand-neutral with zero fabricated design data. Concretely, `src/app/globals.css`
carries:

* a **value layer** of the stock shadcn semantic variables (`--background`, `--foreground`,
  `--primary`, `--muted`, `--destructive`, …) in `:root` with `.dark` overrides (neutral `oklch`,
  the canonical shadcn Tailwind-v4 set);
* the spacing/radius/typography scale in `@theme`;
* a **`@theme inline` compatibility bridge** aliasing the shadcn `--color-*` names onto the value
  layer, so each utility emits the value-layer `var()` directly and inherits its `.dark` swap with
  no separate dark bridge.

The single-source codegen (**0058**) unions token names across the `@theme` / `@theme inline`
blocks and registers `.dark`-only color names; the generate→prettier→CI-drift loop is unchanged.

**The layered design-export architecture is retained as the documented target.** When a consumer
wires a real design export, the faithful shape is layered — raw primitives in `:root`, the
spacing/radius/typography scale, a semantic layer, and a component-token layer
(`--color-c-{component}-{part}[-state]`) carried as literal values in `@theme` — with the `@theme
inline` bridge pointing the value layer at it and the codegen unchanged. That re-adoption is
itself an ADR for the consuming project.

### Consequences

* Good, because runtime theme switching is a CSS-variable override — instant, no rebuild, no
  client JS for the styling itself.
* Good, because one token set is the single source of truth for Tailwind utilities (**0032**),
  shadcn components (**0034**), and the codegen (**0058**).
* Good, because the template ships a neutral, a11y-sane default with zero fabricated design data —
  a consumer replaces it with their own system, exactly the template's job.
* Good, because the layered export architecture is preserved as documentation, so the path to a
  full design-token system is a value swap, not a redesign.
* Bad, because CSS variable names are not type-checked, so a typo fails silently (mitigated by the
  generated allowlist and lint gate, **0058**).
* Bad, because the primitive-layer and component-token-layer machinery is exercised only by a
  future export — partly vestigial until a consumer wires one.

### Confirmation

Semantic token CSS variables are defined in `src/app/globals.css` and mapped into `@theme`
(**0032**); light/dark overrides switch via the `.dark` value layer; components (**0034**)
reference semantic tokens, not raw values. `npm run gen:tokens` regenerates the token union, lint
allowlist, and agent rules and leaves a clean `git status` (the CI drift gate, **0058**); every
`var(--…)` referenced in the `@theme inline` bridge resolves to a variable declared in
`globals.css`. `npm run typecheck`, `npm run lint`, `npm run check:tokens`, and `npm run build`
pass.

## Pros and Cons of the Options

### CSS custom properties + neutral shadcn baseline + `@theme inline` bridge (chosen)

* Good, because CSS variables enable rebuild-free runtime theming and live with the CSS-first
  config.
* Good, because the neutral stock palette is brand-neutral and demo-free with no fabricated
  values, and the layered architecture survives as the documented re-adoption target.
* Bad, because token names are not type-checked (mitigated by the codegen allowlist), and the
  primitive/component layers are vestigial until a real export is wired.

### Tokens as a JS/TS object

* Good, because values are typed and importable in code.
* Bad, because runtime theme switching then needs JavaScript and re-renders rather than a pure
  CSS-variable swap — heavier and at odds with the runtime-free styling of **0032**.

### Style Dictionary multi-platform pipeline

* Good, because it generates tokens for many platforms (web, iOS, Android) from one source.
* Bad, because its multi-platform tooling is overkill for a single web app and adds a build
  pipeline with no payoff when CSS variables already cover web theming.

### Ship a full bespoke brand export

* Good, because it changes nothing and the gates stay green immediately.
* Bad, because it ships a specific brand as the template's default — a consumer would have to
  strip the product-specific data first anyway, the opposite of a neutral starting point.

## More Information

Extends **0032** (Tailwind CSS-first `@theme`, the consumer of these tokens); the component layer
that styles against the semantic tokens is **0034**. The codegen and lint gate that parse this
layer are **0058**. The neutral value-layer + `@theme inline` bridge is the canonical shadcn
(Tailwind v4) structure, so the shadcn components (**0034**) bridge onto it unchanged. When a
project built from this template wires a real Figma export, it reintroduces the primitive and
component-token layers and points the value layer at them (the bridge and `gen:tokens` stay put),
recording that adoption in its own ADR; the figma MCP server stays read-only and design tokens
remain code-canonical (**0045**).

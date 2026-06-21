---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Styling with Tailwind CSS, configured CSS-first

## Context and Problem Statement

The application needs a styling approach. Tailwind CSS is fixed in the stack, but two things
still need recording: why utility-first styling is the model the project commits to (over
CSS Modules, zero-runtime CSS-in-JS, or runtime CSS-in-JS), and how Tailwind is configured —
the modern CSS-first approach (`@import "tailwindcss"` with an `@theme` block in CSS) versus
the legacy JavaScript `tailwind.config.js`.

This choice underpins the design-token (**0033**) and component-layer (**0034**) decisions:
both consume Tailwind's theme, so how the theme is defined and how styles are authored must
be settled first. The RSC-default model (**0002**) also rules out styling solutions that
require a client runtime.

## Decision Drivers

* **RSC compatibility** — styling must work with Server Components (**0002**) and add no
  client runtime; styles should be static CSS.
* **Design-token integration** — the theme must be expressible as tokens (**0033**) and
  consumable by the component layer (**0034**).
* **Consistency and velocity** — utility classes give a constrained, consistent design
  vocabulary and fast authoring.
* **Small, static output** — only used utilities ship; no runtime style generation.

## Considered Options

* Tailwind CSS, CSS-first configuration (`@import "tailwindcss"` + `@theme`)
* CSS Modules
* vanilla-extract (zero-runtime CSS-in-TS)
* Runtime CSS-in-JS (e.g. styled-components / Emotion)

## Decision Outcome

Chosen option: "Tailwind CSS, CSS-first", because it delivers utility-first consistency as
static CSS with no client runtime — a clean fit for RSC (**0002**) — and the CSS-first
configuration keeps the theme in CSS where design tokens (**0033**) live as custom
properties. Styling uses Tailwind utilities; the setup is `@import "tailwindcss"` plus an
`@theme` block in the global stylesheet, with no `tailwind.config.js`. The theme is defined
via tokens (**0033**) and consumed by shadcn/ui components (**0034**).

### Consequences

* Good, because styles are static CSS with no client runtime, so styling never forces a
  component to become a client component.
* Good, because the CSS-first `@theme` block keeps the theme and design tokens (**0033**) in
  one CSS source of truth.
* Good, because utilities give a consistent, constrained vocabulary and fast iteration, and
  only used classes ship.
* Bad, because dense utility class lists reduce markup readability and have a learning curve.
* Bad, because the CSS-first configuration is newer than the long-standing JS-config
  approach, so some third-party guidance still assumes `tailwind.config.js`.

### Confirmation

The global stylesheet uses `@import "tailwindcss"` and an `@theme` block; there is no
`tailwind.config.js`. Components are styled with Tailwind utilities; no runtime CSS-in-JS
dependency is present.

## Pros and Cons of the Options

### Tailwind CSS, CSS-first (chosen)

* Good, because utilities produce static, runtime-free CSS that suits RSC.
* Good, because `@theme` co-locates theme and tokens in CSS.
* Bad, because utility-dense markup has a readability cost and learning curve.

### CSS Modules

* Good, because it is scoped, framework-native, and runtime-free.
* Neutral, because it works fine with RSC.
* Bad, because it offers no design system or token scale out of the box, so consistency and a
  shared vocabulary must be built by hand — and the chosen component layer (**0034**) targets
  Tailwind, not CSS Modules.

### vanilla-extract

* Good, because it is zero-runtime CSS-in-TS with strong typing.
* Neutral, because it is RSC-compatible.
* Bad, because it adds a build-time toolchain and a different authoring model, and the
  ecosystem/component-layer fit (**0034**) is weaker than Tailwind's.

### Runtime CSS-in-JS

* Good, because it offers dynamic, colocated, props-driven styles.
* Bad, because it requires a client runtime and is at odds with RSC (**0002**) — styled
  components tend to force `"use client"` and add bundle/runtime cost — directly failing the
  RSC-compatibility driver.

## More Information

Builds on **0002** (RSC, which constrains styling to runtime-free CSS). The design tokens
expressed in the `@theme` block are decided in **0033**; the component layer styled with
these utilities is **0034**.

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Component layer: shadcn/ui, copied into the repo and themed by design tokens

## Context and Problem Statement

The application needs a component layer — accessible primitives (dialogs, menus, popovers,
form controls) plus styled building blocks — without hand-building every accessible
interaction from scratch. shadcn/ui is fixed in the stack; what this record settles is *how*
it is adopted and how it sits on the decisions beneath it: Tailwind for styling (**0032**)
and design tokens for theming (**0033**).

shadcn/ui is unusual: it is not a runtime dependency but a **copy-in** model — its CLI
generates component source directly into the repository, where the team owns and edits it.
The alternatives (consuming Radix primitives directly, or pulling in a packaged component
library like MUI) trade ownership for convenience differently, so the model is the decision.

## Decision Drivers

* **Accessibility without rebuilding it** — focus management, keyboard nav, and ARIA should
  come from battle-tested primitives (Radix, which shadcn wraps).
* **Ownership and adaptability** — component source should be editable in-repo, not locked
  behind a package's API.
* **Tailwind + token theming** — components must style with Tailwind (**0032**) and theme via
  the design tokens (**0033**), not ship their own conflicting theme system.
* **RSC fit and light runtime** — no heavy styling runtime; interactive parts are client
  leaves over the RSC default (**0002**).

## Considered Options

* shadcn/ui — copy-in components over Radix primitives, styled with Tailwind
* Radix UI primitives used directly, styled by hand
* A packaged component library (MUI / Chakra / Mantine)

## Decision Outcome

Chosen option: "shadcn/ui", because it gives accessible Radix-based components that are
copied into the repo (so the team owns and adapts the source), styled with Tailwind
(**0032**), and themed through the design tokens (**0033**) — exactly the layers already
decided. Components are added via the shadcn CLI (configured by `components.json`) into the
project (e.g. `src/components/ui`), where they are versioned and editable like any other
source. They reference the semantic design tokens (**0033**) for theming, so light/dark and
brand changes flow from the token layer.

### Consequences

* Good, because accessibility comes from Radix primitives rather than being reimplemented,
  while the styled source lives in the repo under our control.
* Good, because components style with Tailwind and theme via the design tokens, so there is
  one styling and theming model end to end (**0032**, **0033**).
* Good, because owning the source means no fighting a library's API to customize — components
  are edited directly.
* Bad, because copied-in components are not updated by a package bump; picking up upstream
  improvements is a manual re-pull and re-merge.
* Bad, because the team now maintains that component source, including any bugs once it is
  copied in.

### Confirmation

`components.json` configures shadcn; generated components live in the repo (e.g.
`src/components/ui`) and are styled with Tailwind utilities referencing semantic tokens
(**0033**). No packaged component-library runtime (MUI/Chakra) is present.

## Pros and Cons of the Options

### shadcn/ui (chosen)

* Good, because it combines Radix accessibility, in-repo ownership, and Tailwind/token
  theming.
* Good, because it fits the already-decided styling and token layers exactly.
* Bad, because updates are manual re-pulls and the copied source becomes ours to maintain.

### Radix primitives directly

* Good, because it is the same accessible primitive foundation with full styling freedom.
* Neutral, because it also themes cleanly with Tailwind/tokens.
* Bad, because every styled component (variants, sizes, composition) must be built from
  scratch — which is precisely the starting point shadcn/ui provides on top of Radix.

### Packaged component library (MUI / Chakra / Mantine)

* Good, because it offers a large, ready-made component set out of the box.
* Neutral, because accessibility is generally handled.
* Bad, because each brings its own styling/theming runtime that competes with Tailwind
  (**0032**) and the token model (**0033**), and deep customization fights the library's API
  rather than editing owned source.

## More Information

Builds on **0002** (RSC; interactive components are client leaves), **0032** (Tailwind
styling), and **0033** (design tokens the components theme against). Together **0032**,
**0033**, and **0034** form the styling/design-system stack: tokens → Tailwind theme →
shadcn components.

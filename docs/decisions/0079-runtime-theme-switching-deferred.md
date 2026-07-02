---
status: "superseded by ADR-0092"
date: 2026-06-20
decision-makers: Yurii Anichkin
---

# Runtime theme switching deferred; ship the `.dark` value layer only

## Context and Problem Statement

The token architecture (**0033**) defines design tokens as CSS custom properties with a light
`:root` value layer and a `.dark` override layer, bridged to the shadcn names via `@theme inline`,
and registers a `dark` custom variant in `src/app/globals.css`. Components built against the
semantic tokens are therefore already theme-correct. What is undecided is *how the `.dark` class
gets applied at runtime* — a theme provider, `next-themes`, a cookie plus an SSR-set class,
system-preference detection, and the no-flash-on-hydration handling each implies.

For a reader the absence is ambiguous: is runtime theming *not yet built*, *deliberately omitted*,
or *an oversight*? Under the RSC-default model the mechanism is non-trivial (a naive client toggle
flashes the wrong theme on first paint; a cookie + SSR approach couples to middleware), and the
choice between approaches is a product/UX decision. This record removes the ambiguity by deciding
the boundary explicitly.

## Decision Drivers

* **Template neutrality** — the toggle mechanism is a per-project choice; a reusable template
  should not impose `next-themes` vs cookie-SSR vs system-only on every consumer (the same
  neutrality stance **0046** takes on PR attribution).
* **Honesty about scope** — record what ships (the `.dark` value layer) versus what does not (a
  runtime switcher), so the gap is intentional and legible rather than silent.
* **No premature coupling** — avoid wiring middleware/cookies or adding a theming dependency the
  consuming project may not want, which would be costly to unpick later.

## Considered Options

* **Defer the runtime toggle** — ship only the `.dark` value layer and document the extension point
* **Adopt `next-themes` now** as the template default
* **Adopt a cookie + SSR `.dark`-class approach now**

## Decision Outcome

Chosen option: "defer the runtime toggle", because the styling capability and the switching
*mechanism* are separable, and only the latter is a product decision the template should leave
open. The template ships the `.dark` value layer and the `dark` variant (**0033**) so every
component is theme-correct the moment a `.dark` class is present; it ships **no** runtime theme
toggle and adds **no** theming dependency. A consuming project that wants light/dark switching
records its own ADR choosing the mechanism (`next-themes`, a cookie + SSR class, or
system-preference only) and wires it — at which point that record supersedes this deferral for the
project. This mirrors the deferral pattern already used for external error tracking (**0019**),
dynamic OG images (**0031**), and visual-diff pre-classification (**0053**).

### Consequences

* Good, because no premature, hard-to-remove theming coupling ships in the template baseline.
* Good, because the consuming project picks the switching mechanism that fits its SSR and UX
  constraints, on top of a token layer that already supports both themes.
* Bad, because the template has no out-of-the-box dark-mode toggle — until a consumer adds one,
  `.dark` is reachable only by setting the class manually.
* Bad, because two consumers will solve runtime theming differently, so the template offers no
  single canonical recipe (acceptable: that is the neutrality this record chooses).

### Confirmation

`src/app/globals.css` defines the `:root` / `.dark` value layers and the `dark` custom variant
(**0033**), and components theme against the semantic tokens. The repository declares **no**
theme-provider dependency (no `next-themes` in `package.json`) and ships **no** runtime
theme-toggle component — the deferral is confirmed by the *absence* of that machinery. Adding
runtime switching is gated behind a new ADR.

## Pros and Cons of the Options

### Defer the runtime toggle (chosen)

* Good, because it keeps the template neutral and free of premature coupling while still shipping a
  fully theme-capable token layer.
* Neutral, because it leaves a visible, ADR-gated extension point rather than a finished feature.
* Bad, because there is no working toggle in the box.

### Adopt `next-themes` now

* Good, because dark mode would work out of the box with mature no-flash handling.
* Bad, because it bakes a specific dependency and client-provider model into every consumer,
  including those that want a cookie-SSR or system-only approach — coupling a template should not
  impose.

### Cookie + SSR `.dark`-class now

* Good, because it avoids a hydration flash and fits the RSC server-first model.
* Bad, because it couples theming to middleware and a cookie contract in the baseline — real
  machinery committed before any consumer has asked for it.

## More Information

Extends **0032** (CSS-first Tailwind) and **0033** (the token layers and the `dark` variant). The
deferral pattern is shared with **0019**, **0031**, and **0053**: a deliberate
"not-yet / project's-choice" decision whose Confirmation is the *absence* of the machinery.

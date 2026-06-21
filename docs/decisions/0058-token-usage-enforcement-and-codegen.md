---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Token-usage enforcement and single-source token codegen from the CSS `@theme` layer

## Context and Problem Statement

**0033** made CSS custom properties the canonical design tokens, mapped into Tailwind's
`@theme` (**0032**); **0034** styles components against the semantic names. But **0033**
itself records the gap: "CSS variables are not type-checked, so a typo in a token name fails
silently." Nothing today stops a component from shipping a raw `#d92626`, an `oklch(...)`
literal, an inline `style` color, a raw `fill` on an SVG, or Tailwind's numbered palette
(`bg-red-600`) instead of a semantic token — every one of which forks the visual source of
truth **0033** exists to centralize. As the agent becomes the primary implementer (**0046**)
this is the single most frequent, lowest-judgment violation class, and it must be a *guarantee*,
not a review hope. The second half of the problem is **where the rule's truth lives**: if the
token allowlist is hand-maintained in lint config and *also* in agent prose, the two drift and
the agent learns a list CI does not enforce ("knowledge laundering"). This record adds the
enforcement and the single-source codegen that **0032**/**0033** deferred; it does not change
the token model itself.

## Decision Drivers

* **The guarantee belongs in CI** — token misuse is mechanical and high-frequency; precision
  over recall, a green gate must mean "no raw values, only registered tokens" (the deterministic
  layer of the Phase-12 plan).
* **One source, no laundering** — the CSS `@theme`/`:root` layer (**0033**) is canonical; the
  lint allowlist, the TypeScript token union, and the agent's rule list must all be *generated*
  from it, never restated (problem P6).
* **Catch invented names, not just bad syntax** — an *existence* check against the real registry
  catches plausible-but-hallucinated token names (`--color-primaryy`), which a syntax rule misses
  (P1/P4).
* **Reach where stylelint cannot see** — Tailwind classes, JSX `style` props, and SVG
  `fill`/`stroke` are invisible to stylelint and need an ESLint layer (P1/P5).
* **Reuse the proven `gen:types` shape** — the repo already runs a generate→format→commit→CI-drift
  loop for `database.types.ts` (**0015**); token codegen should mirror it exactly, not invent a
  new pipeline.

## Considered Options

* **Single-source codegen + a two-layer lint gate** — `scripts/gen-tokens.mjs` parses the CSS
  layer into a TS union and a lint allowlist; stylelint enforces *inversion* + *existence* in CSS,
  ESLint bans raw values in Tailwind/JSX/SVG; the agent rules cite the generated list
* **Hand-maintained allowlist** — keep the token list in stylelint/ESLint config by hand, no codegen
* **Review-only** — rely on PR review and the **0054** drift audit to catch raw values

## Decision Outcome

Chosen option: "single-source codegen + a two-layer lint gate", because it is the only option that
makes token usage a *guarantee* while keeping the canonical CSS layer (**0033**) the one place a
token is defined. A Node script `scripts/gen-tokens.mjs` parses the `@theme`/`:root` block in
`globals.css` and emits `src/design-system/tokens.generated.ts` — a semantic-token union type — plus
the lint allowlist and the agent-rules reference `src/design-system/tokens.agent-rules.md` (the single
source the agent reads for the allowed-token list), wired exactly like `gen:types` (**0015**): styled output through `prettier`,
an `npm run gen:tokens` script, and a CI drift check that fails on diff. On top of that registry,
two lint layers enforce usage:

* **stylelint (CSS)** — an *inversion* rule (in tokenizable properties only `var(--token)` is
  allowed — an allowlist, not a find-the-bad-value regex) and an *existence* rule (the referenced
  token must appear in the generated registry).
* **ESLint (Tailwind / JSX / SVG)** — bans raw color/size literals, raw values in inline `style`
  props, raw `fill`/`stroke` in SVG, and Tailwind's numbered palette inside `src/components/**`.

A companion structural rule — **"a primitive carries no external margin"** (layout spacing is the
composer's concern, not the primitive's) — is recorded here as a token-of-layout invariant; its
mechanical form lands with the per-component intent check in **0062**. Honoring the bootstrap-lean posture
(**0010** deferrals), the lints run in the existing quality gate; nothing new is deferred-out.

### Consequences

* Good, because raw values and invented token names become merge-blocking, closing the silent-typo
  gap **0033** named — the most common agent violation is now caught by a machine, not a reviewer.
* Good, because one parse of the CSS layer feeds CSS lint, TS types, and agent rules, so the three
  cannot drift (P6); adding a token is still a one-line CSS edit, then `gen:tokens`.
* Good, because the *existence* check turns a hallucinated token name into a red build rather than a
  silent fallback to an undefined variable.
* Bad, because a token rename now ripples through generated artifacts and any code referencing the
  old name — intended friction, but friction (the dictionary-governance concern shared with
  **0061**).
* Bad, because parsing CSS with a script is more brittle than consuming a JSON token source; a
  malformed `@theme` edit can break codegen, so the parser must fail loudly (the `gen:types`
  precedent).

### Confirmation

`npm run gen:tokens` regenerates `src/design-system/tokens.generated.ts` + the allowlist +
`src/design-system/tokens.agent-rules.md` and leaves a
clean `git status` (no drift), exactly as `gen:types` does (**0015**); a CI step fails on drift. A
planted raw hex, an `oklch(...)` literal, an inline-`style` color, a raw SVG `fill`, and a
`bg-red-600`-style numbered-palette class each fail their respective lint layer; a plausible but
unregistered token name (`--color-doesnotexist`) fails the stylelint *existence* rule. The agent rule
list is the generated file, not a prose copy (grep finds no hand-maintained token list outside the
generated artifact). Subject to the **0054** drift audit once accepted.

## Pros and Cons of the Options

### Single-source codegen + two-layer lint gate (chosen)

* Good, because it delivers the guarantee (CI) and the single source (codegen) together.
* Good, because it reuses the **0015** `gen:types` pattern the repo already trusts.
* Neutral, because the "no external margin" invariant is stated here but enforced with **0062**.
* Bad, because CSS parsing is more fragile than a JSON token pipeline and renames ripple.

### Hand-maintained allowlist

* Good, because it is the least code up front — just config.
* Bad, because the allowlist drifts from the CSS layer and from agent prose immediately (P6); the
  thing the codegen exists to prevent.

### Review-only

* Good, because it adds zero tooling.
* Bad, because token misuse is exactly the high-frequency, low-judgment class that review skips under
  load; **0054** is a periodic backstop, not a per-PR guarantee.

## More Information

Extends **0032** (the CSS-first `@theme` config) and **0033** (the canonical token layer) by adding
the enforcement and codegen they deferred; mirrors **0015** (`gen:types`) for the generate→drift-check
loop and runs in the **0010** CI gate. The "no external margin" invariant is completed mechanically by
the per-component intent check (`check:design-intent`) of **0062**, which also references the generated token union.
Dictionary-rename friction is the governance concern shared with **0061** and **0064**. Confirms
problems P1 (raw/non-semantic values), P5 (composition leaking into a primitive — the margin rule),
and P6 (agent rules diverging from CI).

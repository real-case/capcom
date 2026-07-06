---
status: "accepted"
date: 2026-07-06
decision-makers: Yurii Anichkin
---

# Motion (a JS animation library) for the premium landing, scoped to client islands

## Context and Problem Statement

ADR **0093** added the chart interaction layer's entrance motion as a **CSS / `tw-animate-css`**
layer (the `MotionIn` wrapper) and explicitly deferred any richer need: _"Should a motion need arise
beyond CSS / `tw-animate-css` (a JS animation library such as Motion), that is a **new ADR** rather
than an edit here."_ Roadmap **PR-15** (the premium-landing half) is that need. The public landing
(`src/widgets/landing`) is today a **pure server component** — `LandingPage` renders **zero client
JS** for fast first paint and crawlability — and its motion vocabulary is limited to CSS hover
transitions. The premium goal calls for orchestrated motion the CSS layer does not practically
reach: **staggered section reveals, scroll-triggered `whileInView` entrances, spring physics, and
coordinated hero/product-visual choreography**.

The tension is that a JS motion library is a **client dependency** that, applied naïvely, would turn
the whole landing into a `"use client"` tree — trading away the very server-render / zero-JS
property (ADR **0002**) that makes the landing fast and crawlable — and could smuggle raw values
past the token gate (**0058**), destabilize the Chromatic baseline (**0043**), or animate in ways
that fail `prefers-reduced-motion` (**0039** / **0052**). This record decides **whether to adopt a
JS motion library, which one, and under what constraints it may be used** so every one of those
invariants continues to hold.

## Decision Drivers

* **Premium orchestrated motion** — staggered reveals, scroll-linked entrances, and spring physics
  on the landing are required by the product goal and exceed CSS / `tw-animate-css` in practice.
* **Server-render / crawlability holds (0002)** — the landing's textual content must stay in the SSR
  HTML (present without JS, statically generable); motion may not force the whole page client-side.
* **Token ownership holds (0058/0081)** — animation targets `opacity` / `transform` (untokenized
  geometry), never a raw color/size literal; any animated **color** resolves to a `var(--token)`.
* **Chromatic determinism (0043)** — motion resolves to its **final static state** in the snapshot
  environment (reduced-motion), so visual regression stays stable.
* **Accessibility (0039/0052)** — `prefers-reduced-motion: reduce` disables non-essential motion,
  content is fully usable without animation, and nothing motion-driven traps focus or hides content
  from the a11y tree.
* **Supply chain (0069/0071)** — a new production dependency must be MIT-compatible, audit-clean, and
  bundle-disciplined (tree-shakeable, lazy-loadable).
* **FSD / React-Compiler fit (0065/0066/0029)** — motion is a client-leaf concern composed by the
  landing widget; it must not break the import-direction gates and must coexist with the compiler's
  automatic memoization.

## Considered Options

* **A — Adopt Motion (`motion`, the successor to Framer Motion; React entry `motion/react`),
  scoped to client "islands"**: the landing stays a server component that renders its content, and
  only the animated leaves are `"use client"`; motion is reduced-motion-aware (`MotionConfig` /
  `useReducedMotion`), bundle-disciplined (`LazyMotion` + `m`), and token-fed.
* **B — Stay CSS-first** (`tw-animate-css` + CSS scroll-driven animations + view transitions), no new
  dependency — the ADR 0093 posture, extended to the landing.
* **C — A different JS library** — GSAP (powerful, but a heavier license/bundle story) or a minimal
  helper (`@formkit/auto-animate` / `react-spring`).

## Decision Outcome

Chosen option: **A — Motion, scoped to client islands**, because it delivers the orchestrated motion
the product goal needs while **preserving the landing's server-render / crawlability by construction**
and adding no palette to launder. Motion is the de-facto React motion library (the maintained
successor to Framer Motion, `motion/react`), React 19-compatible and MIT (**0071**); its
`whileInView`, stagger, and spring APIs are exactly the missing vocabulary. Crucially it is applied
as **islands**: `LandingPage` and its sections stay **server components** that render all copy into
the SSR HTML (crawlable, statically generable — **0002**); only the thin animated wrappers around
that already-rendered content are `"use client"`. Motion animates **`opacity` / `transform`** (not
tokenized properties), so `check:tokens` (**0058**) is unaffected; any animated color is a
`var(--token)`. Motion resolves to its final state under reduced-motion, which the Chromatic
snapshot environment forces (**0043**), and `prefers-reduced-motion` is honored globally via
`MotionConfig reducedMotion="user"` (**0039** / **0052**). Bundle is controlled with `LazyMotion`
and the lightweight `m` components. Option **B** cannot practically express scroll-linked staggered
choreography and was the status quo the goal set out to raise; option **C** brings either a heavier
license/bundle (GSAP) or too little capability (auto-animate) for the same governance cost.

The decision fixes:

* **Motion is an islands concern, never a page-wide `"use client"`** — the landing widget and its
  sections stay server components; animation lives in small client-leaf wrappers around
  server-rendered content, so the SSR HTML still carries every headline, paragraph, and link
  (**0002**). A reusable motion wrapper leaf may live in `src/components/ui` (the kit) or a widget
  `ui/` segment; wherever it lands it stays within the token-gate glob (**0058/0060**) and the FSD
  import direction (**0065/0066**).
* **Tokens own every animated surface (0058/0081)** — motion drives `opacity` / `transform`; a color
  transition uses a semantic token, never a raw literal or numbered Tailwind palette.
* **Deterministic for Chromatic (0043)** — motion resolves to the final state in the snapshot
  environment (reduced-motion); no `whileInView` left mid-flight, no time/random in layout.
* **Accessible (0039/0052)** — `prefers-reduced-motion` disables non-essential motion globally, the
  page is fully usable and readable without animation, and motion never gates content visibility.
* **Supply-chain-clean (0069/0071)** — `motion` is MIT, admitted by `check:licenses`, audit-clean,
  and loaded via `LazyMotion` so only the used feature set ships.

### Consequences

* Good, because the landing gains modern orchestrated motion (stagger, scroll-reveal, spring) that
  CSS could not practically deliver, with a maintained, React-19-native, MIT library.
* Good, because the island scoping **keeps the SSR content crawlable and the page statically
  generable** (**0002**) — the zero-JS property is narrowed to "the animated wrappers ship JS," not
  abandoned.
* Good, because token ownership (**0058/0081**), Chromatic determinism (**0043**), and a11y
  (**0039/0052**) are each held explicitly, and motion is theme-agnostic (it animates geometry, not
  the color composition — **0092**).
* Bad, because the landing is no longer strictly zero-client-JS: the animated sections hydrate. Cost
  is bounded by `LazyMotion` and by keeping wrappers thin; the fallback (reduced-motion / no-JS) is a
  fully static, readable page.
* Bad, because a new production dependency enters the tree (bundle, audit, license surface) — MIT and
  tree-shakeable, but real.
* Bad, because reduced-motion handling and Chromatic-pinning for JS motion is manual work, as it was
  for the CSS layer (**0093**).

### Confirmation

* `check:licenses` (**0071**) admits `motion` (MIT); `npm audit` (**0069**) is clean.
* The landing still **server-renders its content**: an e2e / story asserts the hero copy and CTAs are
  present in the initial HTML without client JS, and the route stays statically generated (**0002**);
  the diff reviewer confirms `LandingPage` and its sections remain server components with motion only
  in client-leaf wrappers.
* `check:tokens` (**0058**) passes over the landing — motion animates `opacity` / `transform`; any
  animated color is a `var(--token)`, with no raw literal or numbered palette.
* `prefers-reduced-motion` is honored (`MotionConfig reducedMotion="user"`), verified in a story /
  e2e; the landing is fully usable and readable with motion disabled.
* Chromatic (**0043**) is stable because landing motion stories resolve to the final state under
  reduced-motion in the snapshot environment — the determinism is the fixture's, not assumed.
* The FSD / boundary gates (`check:fsd` / `check:boundaries`, **0065/0066/0060**) and the axe gate
  (**0039**) pass on the landing and any new motion leaf.

## Pros and Cons of the Options

### A — Motion, scoped to client islands (chosen)

Motion (`motion/react`), applied as thin `"use client"` wrappers around server-rendered content;
reduced-motion-aware, `LazyMotion`-bundled, token-fed.

* Good, because it is the maintained, React-19-native successor to Framer Motion with exactly the
  scroll/stagger/spring vocabulary the goal needs, MIT-licensed (**0071**).
* Good, because island scoping preserves the SSR/crawlable landing (**0002**) — motion does not force
  the page client-side.
* Good, because it animates geometry (`opacity` / `transform`), so token ownership (**0058**) and
  theme composition (**0092**) are untouched, and output stays deterministic (**0043**).
* Neutral, because it adds a dependency whose bundle must be actively disciplined (`LazyMotion`).
* Bad, because the animated sections hydrate (no longer strictly zero-JS) and reduced-motion /
  Chromatic pinning is hand-built.

### B — Stay CSS-first (`tw-animate-css` + CSS scroll-driven animations)

* Good, because it adds no dependency and keeps the zero-JS landing trivially (the **0093** posture).
* Good, because reduced-motion is a one-line `motion-safe:` guard and Chromatic determinism is free.
* Bad, because coordinated staggered / scroll-linked / spring choreography is impractical to express
  in CSS at the quality the premium goal targets — the reason this record exists.

### C — A different JS library (GSAP / react-spring / auto-animate)

* Good, because GSAP is extremely capable and auto-animate is near-zero-config.
* Bad, because GSAP's bundle and (historically restrictive) licensing are a worse supply-chain fit
  (**0069/0071**) than MIT Motion; auto-animate / react-spring give either too little control or a
  less idiomatic React-19 story than Motion for the same governance overhead.

## More Information

Follows **0093** (which named this record: a motion need beyond CSS / `tw-animate-css` is a new ADR),
and is **additive** — it introduces a JS motion capability alongside, not instead of, the CSS
`MotionIn` layer, which remains the default for the chart interaction surfaces; nothing is
superseded. Bound by the RSC-first rendering strategy (**0002**), token governance
(**0058** / **0081**), the theme system (**0092**), the visual and a11y gates (**0043** / **0039** /
**0052**), the supply-chain gates (**0069** / **0071**), the FSD boundaries (**0065** / **0066** /
**0060**), and the React Compiler (**0029**). Realized in roadmap **PR-15** (the premium-landing +
polish half — "PR-15b"), lifting `src/widgets/landing` to a premium marketing surface; the rich
**controls** half of PR-15 (native `<select>` → combobox, additive under **0034**) ships separately
and needs no record. If motion later expands into the **app** surfaces (route transitions,
micro-interactions beyond the landing), that broader adoption is re-examined under this record rather
than a new one, provided the island-scoping and reduced-motion invariants above continue to hold.

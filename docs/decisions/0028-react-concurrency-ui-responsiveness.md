---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Prefer React concurrency primitives (useTransition / useDeferredValue) for UI responsiveness

## Context and Problem Statement

Interactive client features can block the main thread and make the interface feel laggy:
typing into a search box that filters a large list, switching tabs that mount a heavy
subtree, or recomputing an expensive derived view on every keystroke. When an urgent update
(the keystroke) and an expensive update (the re-render it triggers) are treated with equal
priority, the urgent one waits behind the expensive one and the UI janks.

React provides concurrency primitives that separate urgent from non-urgent work:
`useTransition` marks a state update as a non-blocking transition (and exposes `isPending`
for feedback), and `useDeferredValue` lets an expensive view lag behind a rapidly-changing
input while the input itself stays responsive. The project needs a default convention for
keeping interactive UI smooth, rather than fixing jank ad hoc per feature.

## Decision Drivers

* **Input responsiveness** — typing and interactions must stay smooth even when the
  resulting render is expensive; urgent updates must not wait behind non-urgent ones.
* **Built-in and RSC-compatible** — the primitives are part of React, used in Client
  Components (**0002**), with no extra dependency.
* **Urgent vs non-urgent model** — the solution should map to React's concurrent scheduler
  rather than hand-tuned timing.
* **Right tool for the bottleneck** — render-scheduling jank, network latency, and
  DOM-size cost are different problems needing different remedies.

## Considered Options

* Prefer React concurrency primitives (`useTransition` / `useDeferredValue`) as the default,
  with debounce/throttle and virtualization as complements where the bottleneck is I/O or DOM size
* Manual debounce/throttle as the primary responsiveness tool
* No special handling — rely on memoization (`React.memo` / `useMemo`) only

## Decision Outcome

Chosen option: "Prefer React concurrency primitives", because they keep urgent updates
(input) responsive while letting expensive updates (filtering, heavy derived views, heavy
view transitions) lag gracefully, using React's own scheduler with no added dependency.
Reach for them **first**: when an interaction triggers an expensive update, wrap the
non-urgent state change in `useTransition` (surfacing `isPending` for feedback), or derive
the expensive view from a `useDeferredValue` of the fast-changing input. Apply this by
default unless there is an **objective reason** the bottleneck lies elsewhere:

- the cost is **network latency**, not rendering — then debounce/throttle the request (or
  use TanStack Query's request handling, **0025**), since deferring a render does not reduce
  fetches;
- the cost is **DOM size** (very large lists) — then list virtualization is the real fix,
  with concurrency primitives as a complement, not a substitute.

Debounce/throttle and virtualization are complements used for I/O- and DOM-bound costs; for
render-scheduling jank, the concurrency primitives are the default.

### Consequences

* Good, because interactions stay smooth — urgent input is not blocked by the expensive
  render it triggers.
* Good, because the primitives are built into React and work in Client Components (**0002**)
  with no new dependency, and `isPending` gives natural pending feedback.
* Good, because prioritization is handled by React's scheduler rather than fragile,
  hand-tuned debounce delays.
* Bad, because the concurrency model has subtle semantics (a deferred value is intentionally
  one render stale; transitions can cause an extra render) that authors must understand to
  use correctly.
* Bad, because it is not a cure-all — used on a network- or DOM-size-bound bottleneck it
  masks rather than fixes the real cost, so the convention requires judgment about which tool
  the bottleneck calls for.

### Confirmation

Expensive client updates triggered by interaction use `useTransition` and/or
`useDeferredValue` by default; any reliance on debounce/throttle or virtualization instead
carries a stated reason (network- or DOM-bound cost), checked in code review. Pending UI
uses the transition's `isPending`.

## Pros and Cons of the Options

### React concurrency primitives (chosen)

* Good, because they keep input responsive under expensive renders, using built-in React.
* Good, because `isPending` provides pending feedback and the scheduler handles priority.
* Neutral, because they complement (not replace) debounce and virtualization.
* Bad, because their semantics are subtle and they do not fix network/DOM-size bottlenecks.

### Manual debounce/throttle as primary

* Good, because it is simple, well understood, and the right tool for rate-limiting network
  requests.
* Neutral, because it can reduce the frequency of expensive work.
* Bad, because hand-tuned delays are fragile and add latency even when unnecessary, and they
  only *delay* an expensive render rather than keeping the UI responsive during it — the
  wrong remedy for pure render-scheduling jank.

### Memoization only

* Good, because memoization genuinely reduces re-render and recompute cost — though in this
  project that memoization is applied automatically by the React Compiler (**0029**), not by hand.
* Neutral, because reducing recompute cost is a different concern from render-scheduling jank.
* Bad, because memoization alone does not stop a single expensive update from blocking the
  main thread, so input lag persists — insufficient by itself for the responsiveness driver.

## More Information

Builds on **0002** (React / RSC; these primitives run in Client Components). It is a sibling
responsiveness convention to **0025**, which makes optimistic UI the preferred default for
*mutation* latency — **0028** addresses *render-scheduling* latency; together they cover the
two main sources of perceived sluggishness. The rapidly-changing inputs deferred here are
often client UI state held in Zustand (**0026**). Debounce/throttle and list virtualization
remain complementary tools chosen by the nature of the bottleneck. Manual memoization
(`React.memo` / `useMemo` / `useCallback`) is no longer a hand-applied tool here: it is
handled automatically by the React Compiler (**0029**). The compiler memoizes (what to
recompute); these primitives schedule (when to render) — they are orthogonal, and the
compiler does not replace `useTransition` / `useDeferredValue`.

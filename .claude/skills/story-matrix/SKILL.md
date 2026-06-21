---
name: story-matrix
description: >-
  Derive a component's Storybook story matrix from its design-intent.ts and the
  archetype state registry (ADR 0051) — which story exports must exist, which state each
  one demos (the demoStory links), which play functions the archetype requires, plus the
  standing rows (Variants/Overview, Dark, data-edge). Use when authoring or extending
  stories for a component, drafting its stories at new-component step 4b, or when asked
  "which stories does X need", "draft the story matrix", "story coverage for X", or
  "/story-matrix <id>".
---

# Story matrix (ADR 0051 — AI-drafted, human-judged)

ADR 0051 commissions the agent to draft **story matrices and play functions**, with the
meaningfulness judgment staying human (ADR 0042). This skill derives the matrix from the
**spec**, not from imagination: every row traces to `design-intent.ts`, the ratified
state registry, or a standing convention — so a story is never invented and a state is
never silently skipped (P8). The deterministic halves are enforced by
`check:design-intent` (states↔stories coverage + play presence); this
skill is how you arrive there green on the first pass.

> Node 24 is required (`engines.node >=24 <25`). If `node -v` is not v24.x, prepend the
> project's Node 24 to `PATH` before any `npm run` below (see `.nvmrc`).

## 1. Read the live sources — never re-list them (P6)

The matrix is **derived**, so read the sources of truth directly; nothing here is to be
quoted from memory or from this file:

```bash
npm run ds:states -- --id <id>        # the archetype's mandatory state checklist
```

- `src/components/ui/<id>.design-intent.ts` — the spec: `states[]` (with
  `applicable`/`demoStory`/`demoRationale`), `api.variants`, `api.slots`, `behavior`.
- `src/components/ui/<id>.stories.tsx` — the story exports that already exist.
- STORYBOOK-GUARDRAILS.md §7 — the worked convention reference (CSF 3, play, Overview,
  Dark); this template ships no components, so there is no in-repo example yet.

If the design-intent file does not exist yet, stop — stories are authored **against the
spec** (ADR 0062 DoR); run the `new-component` ceremony first.

## 2. Derive the matrix rows

| Row | Derivation rule |
| --- | --- |
| **Default** | Always. The unstyled baseline; usually the `default` state's `demoStory`. |
| **One per `applicable:true` state** | From `states[]`. The story export name **must equal** the state's `demoStory` (the gate checks the link). States carrying a `demoRationale` instead get a row marked *"no static story — <the rationale>"*; do **not** force a story for them. |
| **Variants / Overview** | If `api.variants` is non-empty: a single-canvas story rendering every value of each closed axis (the `Variants`/`Overview` pattern), so the a11y gate (ADR 0039) checks them together. |
| **Play row(s)** | If the archetype's mandatory axes include `interaction` (`ds:states` shows this), at least one story **must** carry a `play` (ADR 0038). Pick the recipe for the interaction class from [assets/play-recipes.md](assets/play-recipes.md). |
| **Dark** | Always: a story with `globals: { theme: "dark" }` re-rendering the key states under the dark token overrides (ADR 0042 theme axis). |
| **Data-edge** | At least one long/overflow-content story (`LongName`/`LongLabel`/`LongContent` pattern), normally the state marked `worstCaseForOverflow`. |
| **Viewport** *(optional, composites)* | For a responsive composite (e.g. a booking-flow component with a mobile CTA), a `parameters.viewport` story per breakpoint where it renders differently. Advisory — no gate. |

## 3. Output the matrix, then fill it

Present the matrix before writing code — it is the reviewable plan:

```
| story export | demos (state/variant) | assertion | exists? |
| ------------ | --------------------- | --------- | ------- |
| Default      | default, unchecked    | render + axe | yes  |
| Selected     | checked               | render + axe | MISSING |
| Selectable   | behavior: toggle      | play: click + aria-pressed + fn() spy | MISSING |
| —            | hover (demoRationale: transient) | n/a | n/a |
...
```

Then author the missing stories following the convention references: CSF 3
`satisfies Meta`, `fn()` spies on callback props, role/aria queries, frozen
`Date`/`Math.random()` per the `preview.tsx` standing rule (ADR 0043 determinism), and
a11y opt-outs only as explicit per-story `a11y` parameters with a stated reason
(ADR 0039).

## 4. Reconcile and verify

1. Update the `demoStory` links in `<id>.design-intent.ts` so every new story is wired
   to its state (and remove any `demoRationale` a new story now covers).
2. Run the scoped gate; then hand off to the `story-verify` skill for the browser-mode
   run:

```bash
node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/check-design-intent.mjs --component <id>
```

## Boundaries

- **States come only from the registry** (`src/design-system/states.ts`, ADR 0061) and
  the component's spec — never invent one. A story tagged for an undeclared state is
  contract expansion and fails the gate.
- **Meaningfulness is a human judgment** (ADR 0051/0042): the matrix is a draft; the PR
  reviewer (and the `storybook-reviewer` agent as a pre-pass) judges whether the covered
  states are the *right* ones and whether a `demoRationale` is a real reason.
- **Visual baselines are 👤** (ADR 0063/0043): never approve a Chromatic baseline or
  judge your own render as the proof of correctness.

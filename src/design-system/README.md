# `src/design-system` — the design-system governance layer

This directory holds the human-authored controlled vocabularies and the generated token contract that
govern how components are built and styled. It is **not** a component kit (that is `src/components/ui`) and
it sits **outside** the Feature-Sliced Design layers (ADR 0065).

## What lives here

- **Generated token contract** (never hand-edit — regenerate with `npm run gen:tokens`, drift-checked in
  CI like `gen:types`, ADR 0058):
  - [`tokens.agent-rules.md`](./tokens.agent-rules.md) — the **authoritative allowed-token reference**. When
    you need to know which token to use, read this, not prose.
  - `tokens.generated.ts` / `tokens.allowlist.json` — the token union + the lint allowlist consumed by
    `check:tokens`.
- **Controlled vocabularies** (human-authored — a rename/merge/split is a governed migration, ADR 0061):
  `usage-roles.ts`, `archetypes.ts`, `states.ts`, `state-precedence.ts`.
- **Composition graph** (`composition-graph.json` + `composition-graph.schema.json`) — the top-down
  component graph (`composedOf` / `usedIn`) reconciled against the dependency-cruiser import graph by
  `check:graph` (ADR 0059/0060). A component's `design-intent.ts` `meta.usedIn` is kept **in lockstep** with
  its node here (`check:design-intent`).

## Two palettes — read before you style anything

CAPCOM ships two deliberate visual worlds on two token palettes (the shadcn value layer for
marketing/landing + auth; the mission-control surface for the authenticated console + its data-viz). They
are tuned to pair only with themselves — mixing them on one surface breaks WCAG 2.2 AA and is invisible to
`check:tokens`/`check:contrast`.

**Before restyling any console or marketing surface, read the seam guide:**
[**`docs/capcom/palette-seam.md`**](../../docs/capcom/palette-seam.md).

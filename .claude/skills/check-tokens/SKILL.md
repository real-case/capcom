---
name: check-tokens
description: >-
  Run the design-token usage gate over component source before committing —
  the ESLint half of ADR 0058 (no raw hex / CSS color functions / inline-style
  raw values / raw SVG fill-stroke / Tailwind numbered palette in
  src/components/**; semantic tokens only). Use before committing component
  changes, when adding or restyling a component, or whenever asked to
  "check tokens", "is this using tokens", "lint the design tokens". The
  authoritative list of allowed tokens is the generated reference, not prose.
---

# Check design-token usage (Stage 1 gate, agent loop)

This is the **structural-layer** convenience around the Stage-1 token gate (ADR
0058): run it inside your own loop so a token violation surfaces here, not in CI.
The guarantee still lives in CI (`npm run lint` runs the same rules); this is the
fast, scoped pre-commit check.

## Run it

```bash
npm run check:tokens          # eslint over src/components/**
```

Exit `0` = clean. A non-zero exit prints the offending file/line with the ADR-cited
message (e.g. "Raw hex color is banned in components — use a semantic token utility").

## The allowed tokens are generated — never invent or re-list them

The single source of which tokens exist is **generated** from `globals.css`:

- [`src/design-system/tokens.agent-rules.md`](../../../src/design-system/tokens.agent-rules.md)
  — the human/agent-readable reference (rules + the full token list with utilities).
- `src/design-system/tokens.allowlist.json` — the machine list the lint consumes.
- `src/design-system/tokens.generated.ts` — the typed `SemanticToken` union.

All three come from `npm run gen:tokens` (parses the `@theme`/`:root` layer) and are
drift-checked in CI. **Do not** retype the token list in prose, in a component, or in
a story — point at the generated reference. Re-listing tokens by hand is the
"knowledge laundering" failure (problem P6): the copy drifts from what CI enforces.

## Changed a token? Regenerate — the codegen half of ADR 0058

The lint above is only the *enforcement* half. When the **token layer itself changes** — a
token added/removed/renamed in the `@theme`/`:root` block of `src/app/globals.css` (ADR
0033) — the three generated artifacts must be **regenerated from that single source**, never
hand-edited:

```bash
npm run gen:tokens     # parses @theme/:root → regenerates the union + allowlist + agent-rules
```

This rewrites `tokens.generated.ts`, `tokens.allowlist.json`, and `tokens.agent-rules.md`
(then Prettier-formats them). Commit the regenerated files **with** the `globals.css` change:
CI drift-checks them exactly like `gen:types` — a stale artifact fails the build. The order is
always **edit `globals.css` → `gen:tokens` → `check:tokens`**; never hand-edit a generated
file and never hard-code a value to route around a missing token.

## What it enforces (ADR 0058 / 0033), in `src/components/**`

- Only semantic tokens, via their Tailwind utilities (`bg-primary`,
  `text-muted-foreground`, `rounded-lg`) or `var(--color-*)`.
- Banned: raw hex, `oklch(...)`/`rgb(...)`, inline-`style` raw color values, raw SVG
  `fill`/`stroke` literals, Tailwind's numbered palette (`bg-zinc-900`).
- A primitive owns **no external margin** — spacing is the composing parent's job.

If a needed token is missing, that is a token-layer decision: add it in `globals.css`
and re-run `npm run gen:tokens` (ADR 0033) — never hard-code the value to route around
the gate.

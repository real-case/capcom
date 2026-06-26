---
name: capcom-token-gate-mechanics
description: How the ADR-0058 check:tokens gate actually works in this repo — what it catches and what slips through
metadata:
  type: project
---

The `check:tokens` gate (ADR 0058) is `eslint src/components src/widgets --no-error-on-unmatched-pattern`. Its rule body in `eslint.config.mjs` is **`no-restricted-syntax` with regex selectors only** — for the `src/components/**` + `src/widgets/**` glob there are exactly these color/size selectors:
- raw hex `Literal` (`#fff` etc.)
- raw CSS color function `Literal` (`rgb(`/`hsl(`/`oklch(` …)
- Tailwind numbered-palette `Literal` (`bg-blue-500` …)
(plus the ADR-0018 env-destructuring guard).

**Why this matters when reviewing:** CLAUDE.md / ADR 0058 *prose* also bans "inline-style raw values" and "raw SVG fill/stroke", but **no eslint selector enforces those**. So `fill={"var(--color-x)"}`, `stroke={token}`, and `style={{ backgroundColor: token }}` all PASS the gate — which is fine *as long as the value is a `var(--color-*)` token*, because a raw hex/color-fn would still be caught at its `Literal` declaration site in the same linted file. The gate is robust for token-fed visx SVG (ADR 0086), but it is regex-literal-based, not semantic — a raw size number like `fontSize={11}` is NOT caught (no size-literal selector exists).

**How to apply:** when auditing chart/SVG widgets for AC "token-only" criteria, don't just trust a green `check:tokens` — confirm every color actually resolves to a `var(--color-*)` token by reading the source. The gate proves "no raw color literal in the file", not "every fill is a token". See [[capcom-fsd-widget-layer]] for why charts live under `src/widgets/**`.

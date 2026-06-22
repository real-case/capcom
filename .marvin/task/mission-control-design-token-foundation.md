---
slug: mission-control-design-token-foundation
type: feature
status: in-progress
created: 2026-06-22
tracker: none
supersedes: none
stack: typescript, css, javascript
risk: medium
breaking: false
spike_required: false
test_command: node scripts/gen-tokens.mjs --self-test && npm run gen:tokens && npx tsc --noEmit && npm run check:contrast
contract_sha: 9a1049968a8d5520
---

# CAPCOM Mission-Control Design-Token Foundation

## Goal

Add a dark-first, mission-control design-token vocabulary (surface hierarchy, nominal/caution/warning/critical status semantics, an 8–12-hue colorblind-safe data-viz palette + sequential/diverging scales, type-scale roles, elevation, motion) to the repo's existing `@theme` token pipeline by introducing a real `--c-*` **primitive layer** inside `:root` (prefix-distinguished) beneath the value layer, plus `[data-tenant]` (palette re-composition) and `[data-density]` (comfortable/dense) runtime swaps — so a future dashboard re-composes per tenant through one swap point. Components are out of scope; this is the governed, accessibility-gated foundation they will consume.

## Context

- Related patterns: src/app/globals.css (the canonical 3-layer token source: `:root`/`.dark` value layer → `@theme` scale → `@theme inline` shadcn bridge); scripts/gen-tokens.mjs (single-source codegen → `tokens.generated.ts` / `tokens.allowlist.json` / `tokens.agent-rules.md`, ADR 0058; the existing nested-brace invariant at `gen-tokens.mjs:35-43` throws to fail the build); ADR 0033 prescribes "reintroduce a primitive layer and point the value layer at it".
- Callers / reverse-deps: tokens.generated.ts / allowlist.json / agent-rules.md are regenerated outputs (no hand callers; `themeVariables` is consumed only as a const/allowlist field, not by any stylelint rule — verified); the ESLint token gate (ADR 0058, `eslint.config.mjs` scoped to `src/components/**`) reads the allowlist. No `src/components/**` modules exist yet, so `check:tokens`/`check:stories` have no surface to bind.
- Constraints: tokens code-canonical (ADR 0033/0058 — no `tailwind.config.js`, single source = `globals.css`); `gen:tokens` output CI drift-checked like `gen:types` (ADR 0015; `ci.yml` token-drift step runs `npm run gen:tokens`); accepted ADRs (0033, 0079) change only via a new record; ADR acceptance + CLAUDE.md sync human-only (ADR 0046).
- Sibling specs: none. This is the first of a planned wave; the components (StatusBadge → Toolbar/TabStrip/SideNav → MetricCard/WidgetTile/ChartContainer → DataTable → QueryBar) become later sibling specs that depend on this one.

## Spec Contract

```yaml spec-contract
files:
  - id: F1
    path: docs/decisions/0081-mission-control-design-token-vocabulary.md
    action: new
    intent: >-
      Proposed ADR (extends 0033). Records the --c-* primitive layer (neutral/gray ramp,
      primary/accent hue, status hues, viz categorical 8-12 colorblind-safe + sequential +
      diverging scales, dimension primitives) and the mission-control semantic vocabulary
      via the value layer + @theme inline bridge (surfaces, text, status x fg/bg/border,
      viz, hairline/divider, elevation, motion, type-scale roles; geist-mono = numeric
      face; dark-first). Records two deliberate divergences: (a) from 0033's "gen:tokens
      stays unchanged" prediction — the primitive layer is machine-enforced (prefix-split +
      swap-only invariant); (b) names the new check:contrast gate as the Confirmation of
      the WCAG-AA status-contrast invariant (ADR 0064 fitness-function growth). status proposed.
    satisfies: [AC5]
  - id: F2
    path: docs/decisions/0082-multitenant-density-runtime-theming.md
    action: new
    intent: >-
      Proposed ADR (bounds/cites 0079). Records [data-tenant] re-composition (a tenant
      redefines the PRIMITIVE layer only; :root = mission default, [data-tenant=example] =
      contrasting proof) and [data-density=comfortable|dense] dimension-primitive swaps,
      plus the gen-tokens swap-only invariant. In Considered Options it ARGUES the 0079
      boundary explicitly: 0079 defers the light/dark theme-CLASS toggle mechanism only;
      data-attribute tenant/density palette axes are a distinct concern 0079 never claimed
      — so the boundary is reasoned, not asserted. status proposed.
    satisfies: [AC3, AC4, AC5]
  - id: F3
    path: docs/decisions/README.md
    action: edit
    intent: Regenerate the ADR index (adr.py index) so 0081/0082 are listed.
    satisfies: [AC5]
  - id: F4
    path: src/app/globals.css
    action: edit
    intent: >-
      Add the --c-* primitive layer as a clearly-commented :root block (prefix --c-: palette
      + viz scales + dimension primitives --c-space-*/--c-row-height/--c-control-height/--c-font-size-*);
      add mission-control semantic value-layer vars (--surface-*, --text-*, --status-*-{fg,bg,border},
      --viz-*, --border-hairline, --divider, --elevation-low, --motion-*) referencing var(--c-*);
      expose via @theme inline --color-surface-*/--color-status-{nominal|caution|warning|critical}-{fg|bg|border}/--color-viz-categorical-{1..N}
      bridges + @theme type-scale roles + density dimension bridges; add [data-density=dense]
      overriding ONLY --c-* dimension primitives and [data-tenant=example] redefining ONLY
      --c-* palette primitives. Existing shadcn chrome tokens untouched (additive, dark-first by value).
    satisfies: [AC1, AC3, AC4, AC7]
    anchor: src/app/globals.css:26
  - id: F5
    path: scripts/gen-tokens.mjs
    action: edit
    intent: >-
      Primitive-aware codegen: in the :root parse split props by the --c- prefix — --c-*
      emit a PRIMITIVE_VARIABLES const, the rest stay THEME_VARIABLES. Parse [data-tenant]/
      [data-density] blocks and enforce a swap-only invariant DURING the normal run: throw
      (like the nested-brace guard at lines 35-43) if a block declares any name that is not
      an existing --c-* primitive — so CI's token-drift step exercises it on real globals.css.
      Add a --self-test mode proving the validator on inline synthetic fixtures: a valid
      primitive-only override accepted, a violating block (new token, or non-primitive /
      --color-* name) rejected; exit non-zero on mismatch.
    satisfies: [AC2, AC3]
  - id: F6
    path: src/design-system/tokens.generated.ts
    action: edit
    intent: Regenerated typed union — adds the new --color-* semantic tokens and the PRIMITIVE_VARIABLES const.
    satisfies: [AC1, AC2]
  - id: F7
    path: src/design-system/tokens.allowlist.json
    action: edit
    intent: Regenerated lint allowlist — adds the new mission-control semantic tokens.
    satisfies: [AC1]
  - id: F8
    path: src/design-system/tokens.agent-rules.md
    action: edit
    intent: Regenerated agent-facing token reference — adds the new mission-control semantic tokens.
    satisfies: [AC1]
  - id: F9
    path: .cspell/project-words.txt
    action: edit
    intent: Add mission-control vocabulary terms introduced in the ADR prose so check:spelling stays green.
    satisfies: "—"
  - id: F10
    path: docs/capcom/roadmap.md
    action: edit
    intent: >-
      Reconcile ADR numbering across ALL ~16 reference sites (lines ~31, 56, 60/62/64,
      83, 87, 90, 93, 121, 130, 145, 156, 172, 193 — the PR-table cell, both ADR-list
      sections, the strengths table, and every inline ADR 008x citation): insert a
      "Design-System Foundation" entry taking 0081-0082 and shift the domain reservations
      +2 (event->0083, aggregation->0084, ingestion->0085, charting/visx->0086,
      funnels->0087, segmentation->0088, AI->0089). No stale 0081-0084 reservation or
      old 008x citation remains.
    satisfies: [AC6]
  - id: F11
    path: scripts/check-contrast.mjs
    action: new
    intent: >-
      Computed WCAG-AA contrast gate: parse globals.css, resolve each --status-*-fg/--status-*-bg
      pair (and text-primary on each --surface-*) through the primitive layer, convert oklch
      -> linear sRGB (clamp out-of-gamut) -> relative luminance -> WCAG 2.x contrast ratio,
      and assert >= 4.5 for text pairs (>= 3.0 for large/non-text roles). Print a per-pair
      report; exit non-zero on any failure. The machine proof of the brief's status-contrast
      accessibility requirement (colorblind-safety stays the AC4 prose judgment).
    satisfies: [AC7]
  - id: F12
    path: package.json
    action: edit
    intent: Add the `check:contrast` script (node scripts/check-contrast.mjs) and append it to the `check:design-system` bundle.
    satisfies: [AC7]
  - id: F13
    path: .github/workflows/ci.yml
    action: edit
    intent: Add a `check:contrast` step to the quality-gate job (citing ADR 0081) so the AA-contrast invariant is a standing CI gate, not a one-off — no `uses:` added, so action-pinning is unaffected.
    satisfies: "—"
build_order: [F1, F2, F4, F5, F6, F7, F8, F11, F12, F13, F3, F10, F9]
depends_on: []
contract:
  kind: schema
  signature: |
    Token surface (CSS custom properties, consumed by future components):
      Primitive layer (in :root, prefix --c-)  --c-{group}-{scale}   e.g. --c-gray-900, --c-blue-500, --c-viz-cat-01..12, --c-viz-seq-*, --c-viz-div-*, --c-space-*, --c-row-height, --c-control-height, --c-font-size-*
      Surfaces          --surface-{background|panel|elevated|overlay}   (value-layer var(--c-*))
      Text              --text-{primary|secondary|tertiary|...}
      Status            --status-{nominal|caution|warning|critical}-{fg|bg|border}
      Data-viz          --viz-categorical-{1..N}, --viz-sequential-*, --viz-diverging-*
      Structure/motion  --border-hairline, --divider, --elevation-low, --motion-duration-*, --motion-ease-*
      Bridged to utilities via @theme inline as --color-surface-*, --color-status-{nominal|caution|warning|critical}-{fg|bg|border}, --color-viz-categorical-{1..N} (bg-/text-/border-).
      Type-scale roles  metric-hero | metric | label | body | caption | mono-data (font-size + line-height, comfortable/dense steps)
      Dimension (density) --space-*, --row-height-*, --control-height-*, --font-size-* (var(--c-*); swapped via [data-density])
    Swap points: [data-tenant="..."] redefines --c-* primitives ONLY; [data-density="comfortable"|"dense"] swaps the --c-* dimension primitives ONLY.
    Generated outputs (single source = globals.css): SEMANTIC_TOKENS + PRIMITIVE_VARIABLES (tokens.generated.ts), tokens.allowlist.json, tokens.agent-rules.md.
    Accessibility gate: check:contrast asserts status fg/bg + text-on-surface pairs clear WCAG 2.2 AA.
criteria:
  - id: AC1
    statement: >-
      Given globals.css carrying the mission-control primitive + semantic layers, when
      `npm run gen:tokens` runs, then the surface/text/status/viz/type-role semantic tokens
      appear in the generated allowlist AND the committed generated files match the source
      (no drift) — proven by both a sentinel-token grep and an empty diff.
    implemented_by: [F4, F6, F7, F8]
    oracle:
      kind: command
      ref: npm run gen:tokens && git diff --exit-code -- src/design-system/tokens.generated.ts src/design-system/tokens.allowlist.json src/design-system/tokens.agent-rules.md && grep -q "status-critical" src/design-system/tokens.allowlist.json && grep -q "viz-categorical-1" src/design-system/tokens.allowlist.json
    failure: New mission-control tokens absent from the registry (grep fails), or generated files drift from globals.css (diff non-empty → CI token-drift fails).
  - id: AC2
    statement: >-
      The generated tokens.generated.ts exports the new mission-control semantic --color-*
      tokens and a PRIMITIVE_VARIABLES union (the --c-* prefix-split), and the whole tree
      typechecks under the repo's strict TS config.
    implemented_by: [F5, F6]
    oracle:
      kind: command
      ref: npx tsc --noEmit
    failure: tsc errors, or PRIMITIVE_VARIABLES is missing / still folded into THEME_VARIABLES.
  - id: AC3
    statement: >-
      gen-tokens enforces the swap-only invariant during its normal run (a [data-density]
      or [data-tenant] block declaring any name that is not an existing --c-* primitive
      throws and fails the build), and `--self-test` proves the validator on inline fixtures:
      a valid primitive-only override accepted and a violating block (new token, or a
      non-primitive / --color-* name) rejected.
    implemented_by: [F4, F5, F2]
    oracle:
      kind: command
      ref: node scripts/gen-tokens.mjs --self-test
    failure: The self-test passes a violating block or rejects a valid override — the two-layer swap-only guarantee is not enforced.
  - id: AC4
    statement: >-
      The default (:root) mission-control surfaces are dark-first, and switching
      [data-tenant=example] yields a coherent contrasting palette whose categorical viz hues
      stay colorblind-distinguishable — the structural "primitives-only swap" guarantee is
      machine-enforced by AC3 and the numeric AA-contrast by AC7, leaving this as the
      qualitative dark-first + colorblind judgment.
    implemented_by: [F4, F2]
    oracle:
      kind: prose-review
    failure: Default surfaces are light, or the viz palette is not colorblind-distinguishable on inspection — the brief's dark-first, accessible re-composition does not hold.
  - id: AC5
    statement: >-
      Two proposed ADRs (0081 vocabulary+primitive layer, 0082 tenant/density theming) exist,
      are MADR-lint-clean, and the ADR index is regenerated to list them.
    implemented_by: [F1, F2, F3]
    oracle:
      kind: command
      ref: python3 .claude/skills/adr/scripts/adr.py lint
    failure: ADRs missing required MADR sections / invalid frontmatter, or the index is stale.
  - id: AC6
    statement: >-
      The roadmap ADR-numbering reconciliation is complete and self-consistent: a
      Design-System Foundation entry takes 0081-0082, every domain-model ADR citation is
      shifted +2, and no stale 0081-0084 reservation or pre-shift 008x reference remains.
    implemented_by: [F10]
    oracle:
      kind: prose-review
    failure: A stale ADR number (e.g. visx still cited as 0084, or the 0081-0084 reservation) contradicts the new numbering.
  - id: AC7
    statement: >-
      The status fg/bg pairs and text-on-surface pairs clear WCAG 2.2 AA contrast, proven
      by a computed check over the resolved oklch token values.
    implemented_by: [F4, F11]
    oracle:
      kind: command
      ref: npm run check:contrast
    failure: A status or text/surface pair falls below AA (4.5 text / 3.0 large) — the accessibility constraint is asserted but not met.
```

## Host Bindings

```yaml host-bindings
spec_location: .marvin/task/
decision_record:
  style: madr
  path: docs/decisions/
merge_obligations:
  - "CI quality gate green: typecheck, lint, format:check, check:design-system, check:contrast, token-drift (gen:tokens clean), build, test:coverage >=80%, check:citations, check:spelling"
  - "ADR lint green (adr.py lint) + index regenerated"
  - "human accepts ADRs 0081-0082 (adr.py accept) and adr-sync-claude-md regenerates CLAUDE.md — human-only, at/before merge"
  - "Conventional Commits (commitlint)"
gates:
  test: node scripts/gen-tokens.mjs --self-test && npm run gen:tokens && npx tsc --noEmit && npm run check:contrast
```

## Data & Config

No migrations, env vars, or feature flags. New configuration surface = CSS custom properties in `globals.css` plus two root-container data-attributes: `[data-tenant]` (primitive-layer palette swap) and `[data-density=comfortable|dense]` (dimension-token swap). Both are opt-in attributes a future app sets on a root container; absence = mission-default, comfortable. One new npm script (`check:contrast`) and one new CI step.

## Chosen Approach

**Variant B — true primitive layer.** In `globals.css`: (1) add a `--c-{group}-{scale}` primitive block **inside `:root`** (prefix-distinguished) — dark-first neutral/gray ramp, a primary/accent hue, four status hues, viz categorical-01..12 colorblind-safe + sequential + diverging ramps, dimension primitives; (2) add mission-control semantic value-layer vars referencing `var(--c-*)`; (3) expose via `@theme inline` `--color-*` bridges + `@theme` type-scale/dimension entries; (4) add `[data-density=dense]` (dimension-primitive override) and `[data-tenant=example]` (palette-primitive override) blocks; existing shadcn chrome untouched. Make `gen-tokens.mjs` primitive-aware (prefix-split → `PRIMITIVE_VARIABLES`; swap-only invariant that throws in the normal run; `--self-test` fixtures). Add `scripts/check-contrast.mjs` (computed WCAG-AA gate over status/text pairs) wired into `package.json` (`check:contrast`, + the `check:design-system` bundle) and CI. Regenerate the three `tokens.*` outputs, regenerate the ADR index, reconcile the roadmap's ADR numbering across all sites, and extend the cspell dictionary. Decisions recorded as proposed ADRs 0081/0082 for human acceptance before merge.

**Stack compliance:** NATIVE
**Future alignment:** ALIGNED (realizes ADR 0033's documented primitive-layer evolution; tokens feed the roadmap's visx charts, ADR 0086 post-reconcile)

**Stack extensions required:** none

## Why this over alternatives

- Variant A — additive value-layer, no primitive layer (rejected): a tenant block would override the _semantic_ value layer, so it cannot honor the brief's hard rule "a tenant redefines the **primitive layer only**". The two layers would not be strictly separated.
- Variant C — parser-enforced invariant without a `--c-*` namespace (rejected): build-time guarantee but no primitive layer to swap; half-honors the brief and skips ADR 0033's direction.
- Brief-literal stack — pnpm + Turborepo monorepo, CSS Modules, `--capcom-*` tokens, publishable package (rejected upstream by the user): contradicts accepted ADRs 0005/0024 (npm-only), 0032/0033/0058 (Tailwind `@theme`, single-source `--color-*`), 0034 (shadcn), 0080 (`private`). Repo-conform + in-repo chosen.

## Test Plan

- Harness: the repo's command gates (infra/token work, not a vitest suite). Primary proof = `node scripts/gen-tokens.mjs --self-test && npm run gen:tokens && npx tsc --noEmit && npm run check:contrast`, plus `npm run check:design-system`, `python3 .claude/skills/adr/scripts/adr.py lint`, and `npm run build`.
- Test locations: none under `src/` (no `src/**/*.test.tsx`); the swap-only invariant is enforced inside the normal `gen:tokens` run (CI-exercised via token-drift) and proven by `--self-test` fixtures; the AA-contrast invariant is a standing CI gate (`check:contrast`). The unit vitest project only collects `src/**/*.test.{ts,tsx}`, so a `scripts/` test would not run.
- Conventions: codegen output committed + CI drift-checked (ADR 0015/0058); build-failing invariants throw like the nested-brace guard (`gen-tokens.mjs:35-43`); custom gates self-test via `--self-test` (ADR 0078) and cite their ADR in the CI step (ADR 0067).

## Definition of Done

- [ ] `node scripts/gen-tokens.mjs --self-test`, `npm run check:contrast` green; `npm run gen:tokens` no-drift and throws on a non-primitive override
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run format:check`, `npm run check:design-system`, `npm run build` green
- [ ] `python3 .claude/skills/adr/scripts/adr.py lint` green; `docs/decisions/README.md` index regenerated; `check:citations` + `check:spelling` green; roadmap ADR numbering reconciled across all sites (F10)
- [ ] ADRs 0081/0082 authored `proposed` — **not** accepted by the agent; CLAUDE.md **not** edited (both human, post-acceptance)
- [ ] `test:coverage ≥ 80%` unaffected (no new executable `src/` logic)

## Non-goals

- Any component (StatusBadge, QueryBar, …) — deferred to sibling specs; no `src/components/**` module added.
- Wiring a new font file via `next/font` — geist-mono serves as the technical/numeric (tabular) face.
- A light-mode mission-control theme or a theme toggle/provider (ADR 0079 stance preserved); a 3rd tenant.
- Editing CLAUDE.md or accepting the ADRs (both human, post-acceptance).
- Colorblind-safety as a machine check (genuinely needs CVD simulation/judgment — stays AC4 prose-review); fixing the pre-existing `text-gray-400` in `src/app/global-error.tsx:29` (out of scope, not token-lint-gated).

## Assumptions

- ADRs take the next sequential IDs **0081–0082** (`adr.py next`; gap-free numbering forbids skipping); the roadmap's prior 0081–0084 reservation is reconciled in this change (F10) — domain ADRs shift +2.
- Mission-control surfaces are **dark-first by value** in `:root`, coexisting with the untouched light-default shadcn chrome; tenant theming targets the mission-control primitive palette, not the app chrome.
- `geist-mono` (already injected via `next/font`, `layout.tsx`→`globals.css:177`) is the technical/numeric face (monospace ⇒ tabular figures).
- No `src/components/**` modules added, so Storybook/`check:stories`/`check:tokens` have no new surface (the brief's "no Storybook" is satisfied without violating ADR 0042); the new tokens are defined-but-unconsumed until the component waves, so their _usage_ is ungated this slice (their _values_ are gated by `check:contrast`).

## Open Questions

none

## Security / NFR

N/A for application security — design tokens only; no auth, crypto, PII, input parsing, or infra surface. NFR: (a) **accessibility is a gated constraint** — status `fg`/`bg` + text/surface contrast is machine-checked at WCAG 2.2 AA by `check:contrast` (AC7), and the categorical viz palette's colorblind-safety is judged in AC4 (graduating to a Stage-1 fitness gate later, ADR 0064); (b) **performance** — render-time CSS custom properties only, no runtime/JS cost; (c) **rollout/rollback** — a pure token + codegen + gate diff, reverted by reverting the commit; ADRs stay `proposed` until human acceptance, so nothing in CLAUDE.md or the accepted corpus changes until then.

## Critic Verdict & Overrides

marvin-tm-spec-critic — pass 1: **BLOCK** (3 blockers), pass 2 on the revision: **PASS WITH WARNINGS**. Dispositions:

- B1 ADR-number collision → resolved by in-scope roadmap reconcile (F10) + recording the divergence in 0081 (F1).
- B2 primitive selector → `--c-*` in `:root`, prefix-split into PRIMITIVE_VARIABLES vs THEME_VARIABLES (verified downstream-safe by the critic).
- B3 swap-only `--self-test` → invariant fires in the normal `gen:tokens` run (CI-exercised) + `--self-test` fixtures.
- W1 incomplete roadmap renumber → F10 now enumerates all ~16 sites + AC6 gates roadmap coherence.
- W2 ADR 0079 boundary → F2 now argues the boundary explicitly in Considered Options.
- Q2 weak accessibility oracle (override accepted by user "add computed AA check") → AC7 + `scripts/check-contrast.mjs` (F11) computed WCAG-AA gate, wired into CI (F12/F13); colorblind-safety consciously left as AC4 prose-review.
- W3/W4 (AC1 grep = naming tripwire; pre-existing `global-error.tsx` literal) → accepted/noted, see Design Notes.
- DoR scope gate (13 files) → consciously accepted as one PR: 3 are codegen outputs (F6/F7/F8), 3 are the single contrast-gate feature's wiring (F11/F12/F13), 2 ADRs + index are this slice's governance; all serve the one token-foundation deliverable, no unrelated surfaces.

## Design Notes

- The `--c-*` primitive layer realizes ADR 0033's documented evolution; the recorded divergence is that gen-tokens is _not_ left unchanged — it gains a prefix-split + an enforced swap-only invariant (ADR 0081).
- The swap-only invariant makes the brief's two-layer rule _enforceable_: it throws inside the normal run (CI token-drift exercises it on the real file) and follows the self-testing-gate idiom (ADR 0078) via `--self-test`.
- AC1's sentinel greps (`status-critical`, `viz-categorical-1`) are a **naming-convention tripwire**, not a vocabulary-completeness check: they pass iff the implementer uses the contracted `--color-status-*`/`--color-viz-categorical-*` bridge names (pinned in the contract signature).
- Awareness (out of scope): `src/app/global-error.tsx:29` uses `text-gray-400` — a numbered-palette literal, but in `src/app` (not `src/components/**`), so it is not token-lint-gated and is pre-existing; left untouched.
- Coexistence boundary: mission-control tokens are additive and dark-first; the neutral shadcn chrome tokens are untouched, so the app's existing appearance does not change.

## Future Considerations

- Component waves as sibling specs, each with its archetype mapping, `design-intent.ts`, stories, and token compliance: StatusBadge (`categorical-indicator`) → Toolbar (**new archetype — human escalation**, ADR 0061/0064)/TabStrip/SideNav (`navigation`) → MetricCard/WidgetTile/ChartContainer (`container`) → DataTable (`collection`) → QueryBar (`text-input`, signature). The StatusBadge spec consumes the status tokens first under the axe a11y gate (ADR 0039).
- Wire a dedicated technical display face; add a light-mode mission theme or a 3rd tenant; optionally extend `check:contrast` to colorblind-distance metrics once a CVD model is chosen.

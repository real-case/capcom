# The marketing ↔ console palette seam

> **Decision of record:** [ADR 0099 — Mission-control product console surface](../decisions/0099-mission-control-product-console-surface.md),
> **narrowed by** [ADR 0101 — Premium unified front door](../decisions/0101-premium-unified-front-door.md)
> (the landing + auth screens join the mission-control world; the workspace launcher follows),
> building on [ADR 0081](../decisions/0081-mission-control-design-token-vocabulary.md) (the mission-control
> token layer), [ADR 0092](../decisions/0092-runtime-light-dark-theme-switching.md) (light/dark
> unification), and [ADR 0058](../decisions/0058-token-usage-enforcement-and-codegen.md) (the token-usage
> gate).

CAPCOM is converging on a **single mission-control visual world** (ADR 0081), but a **shadcn value-layer
residue** remains. The two palettes are tuned to pair only with themselves, so mixing them on one surface
breaks WCAG 2.2 AA contrast. This document is the map so a contributor never cross-pairs them by accident.

## The seam today

ADR 0099 first moved the authenticated **console** onto the mission-control surface and deliberately left the
marketing landing + auth screens on the shadcn value layer — the original "two visual worlds." **ADR 0101
narrows that seam**: the auth screens (Phase 1) and the marketing landing (Phase 2) have **joined the
mission-control world**. What still rides the shadcn value layer is shrinking:

| Surface                                                                                                                       | Palette                                    | Notes                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The authenticated **console** — `src/widgets/app-shell`, the analytics widgets, `overview-dashboard`, `src/components/charts` | **mission-control** (ADR 0081)             | `bg-surface-{background,panel,elevated,overlay}`, `text-text-{primary,secondary,tertiary}`, `border-border-hairline` / `divider`, `status-*`, `--viz-*`, the `mono-data` role |
| The **front door** — `src/widgets/landing`, the auth screens (`src/features/auth-by-email` + `src/app/[locale]/(auth)`)       | **mission-control** (ADR 0101, Phases 1–2) | joined via ADR 0101; same token set as the console (dark **and** light, `check:contrast`)                                                                                     |
| The **workspace launcher** — `src/app/[locale]/(app)/p`                                                                       | **shadcn value layer** (residual)          | the last front-door surface still on shadcn — migrates in **ADR 0101 Phase 3**                                                                                                |
| The `src/components/ui` **shadcn kit** itself (Button, Panel, …)                                                              | **shadcn value layer** (by design)         | consumed as-is and themed **through** the surface at each call site (ADR 0099/0101); never forked                                                                             |

Both palettes flip light ↔ dark (ADR 0092), so "console = dark, marketing = light" is **not** the
distinction — the distinction is which **token vocabulary** a surface is built from.

## The rule: never cross-pair; a surface swap is per-component and total

The mission-control `--surface-*` / `--text-*` set is tuned to clear AA **against itself**, in both the
light and the dark composition. The shadcn `--foreground` / `--muted-foreground` set is tuned against
`--background` / `--card`. Put one palette's foreground on the other's surface and the contrast is no longer
guaranteed — a **half-mix**.

So a component is skinned in **one** world or the other, never a blend. When a surface moves from shadcn to
mission-control (as the analytics widgets did in the ADR-0099 Phase-E re-skin, and the landing + auth did
under ADR 0101), **every** descendant chrome color moves with it — the container, the headings and captions,
the buttons and focus rings, the chart's SVG `<text>` label fills, the chart `Message`/empty/error boxes,
**and** the shared chart-interaction primitives (tooltip, legend, crosshair, brush) that render inside it.

The one sanctioned exception is a self-contained control whose foreground/background are a **matched pair**,
not a surface half-mix: a shadcn `<Button>` (its `bg-primary` + `text-primary-foreground` clear AA against
each other) may sit on a mission-control surface — which is exactly how the console, the auth forms, and the
landing hero CTA render their primary action (via `buttonVariants`, so the shadcn fill stays inside the kit).

## The half-mix failure mode — and why the gates don't catch it

A leftover shadcn foreground on a `--surface-*` background is **invisible to the automated gates**:

- `check:tokens` allowlists **both** palettes (both are legitimate semantic tokens), so it cannot tell a
  shadcn `text-muted-foreground` from a mission-control `text-text-secondary`.
- `check:contrast` only computes the fixed mission-control status/text-on-surface pairs — it never sees an
  accidental shadcn foreground.

The half-mix is caught only by an **axe story rendered on the real surface**, or by a human at the
**Chromatic re-baseline**. Two consequences follow:

1. **Every re-skinned surface needs a dark _and_ a light story rendered inside its mission-control
   surface** (e.g. a `bg-surface-panel` decorator, or the landing's own full-page `bg-surface-background`),
   so axe measures the real pairing. A chart's mission-control text measured against the shadcn
   `--background` is the _reverse_ half-mix and will fail axe just as surely.
2. **SVG `<text>` and `aria-hidden` overlays are not axe-evaluable.** For those, the proof is a source grep
   for shadcn tokens plus the human Chromatic re-baseline (see the Phase-B / Phase-D disclosures in
   [`console-redesign-progress.md`](./console-redesign-progress.md)). The ADR-0101 landing re-skin uses the
   same negated `git grep` over `src/widgets/landing` as its seam proof.

## The specific traps

- **`--text-tertiary` is not AA-safe for small text.** Use `--text-secondary` for any small chrome text;
  reserve `--text-tertiary` for large or decorative marks (e.g. a de-emphasized chart _line_, where the
  small-text contrast rule does not apply). The Phase-B breadcrumb shipped `--text-tertiary` at 3.99:1
  before axe caught it.
- **SVG fills are chrome too.** A chart's axis/label/grid-line `fill=var(--color-foreground)` /
  `var(--color-muted-foreground)` / `var(--color-border)` must become `var(--color-text-primary)` /
  `var(--color-text-secondary)` / `var(--color-border-hairline)` when the chart sits on a mission-control
  surface. The `--viz-*` data-series colors are shared and stay.
- **The shared chart-interaction layer is console-only.** `src/components/charts/{tooltip,legend,crosshair,
brush}` render inside the analytics Panels; they are skinned in mission-control tokens, not shadcn.

## The one documented intra-console residual

The shadcn-kit control **labels** are a deliberate exception. `ComboField` / `Combobox`
(`src/shared/ui/ComboField.tsx`) belong to the `src/components/ui` shadcn kit, which ADR 0099/0101 keep
**out** of the re-skin and consume as-is. Their `text-muted-foreground` label renders on the AppShell
`--surface-background` **outside** any Panel; it is AA-passing and predates the re-skin. It is intentional,
not a missed half-mix — do not "fix" it into a mission-control token without an ADR that brings the shadcn
kit itself into the console surface.

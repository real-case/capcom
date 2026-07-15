# The marketing ↔ console palette seam

> **Decision of record:** [ADR 0099 — Mission-control product console surface](../decisions/0099-mission-control-product-console-surface.md),
> building on [ADR 0081](../decisions/0081-mission-control-design-token-vocabulary.md) (the mission-control
> token layer), [ADR 0092](../decisions/0092-runtime-light-dark-theme-switching.md) (light/dark
> unification), and [ADR 0058](../decisions/0058-token-usage-enforcement-and-codegen.md) (the token-usage
> gate).

CAPCOM ships **two deliberate visual worlds**, and they use **two different token palettes**. This is by
design — but the two palettes are tuned to pair only with themselves, so mixing them on one surface breaks
WCAG 2.2 AA contrast. This document is the map so a contributor never cross-pairs them by accident.

## The two worlds

| World         | Where                                                                                                                                                                                                                                             | Palette                                                                                                            | Surfaces / text                                                                                                                                                                                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Marketing** | `src/widgets/landing`, the auth screens, the public/statically-generated routes                                                                                                                                                                   | the **shadcn value layer** (`--color-*` names exposed through the `@theme inline` bridge; `.dark` value overrides) | `bg-background` / `bg-card` / `bg-popover`, `text-foreground` / `text-muted-foreground`, `border-border` / `border-input`, `ring-ring`                                                                                                                  |
| **Console**   | the authenticated product console — `src/widgets/app-shell`, the analytics widgets (events-explorer, funnel-builder, retention-grid, segment-builder, trends-explorer), overview-dashboard, and the shared chart layer in `src/components/charts` | the **mission-control surface** (ADR 0081)                                                                         | `bg-surface-{background,panel,elevated,overlay}`, `text-text-{primary,secondary,tertiary}`, `border-border-hairline` / `divider`, `status-{nominal,caution,warning,critical}-{fg,bg,border}`, the `--viz-*` data-viz palette, the `mono-data` type role |

Both palettes flip light ↔ dark (ADR 0092), so "console = dark, marketing = light" is **not** the
distinction — the distinction is which **token vocabulary** a surface is built from.

## The rule: never cross-pair; a surface swap is per-component and total

The mission-control `--surface-*` / `--text-*` set is tuned to clear AA **against itself**, in both the
light and the dark composition. The shadcn `--foreground` / `--muted-foreground` set is tuned against
`--background` / `--card`. Put one palette's foreground on the other's surface and the contrast is no longer
guaranteed — a **half-mix**.

So a component is skinned in **one** world or the other, never a blend. When a surface moves from shadcn to
mission-control (as the analytics widgets did in the ADR-0099 Phase-E re-skin), **every** descendant chrome
color moves with it — the container, the headings and captions, the buttons and focus rings, the chart's
SVG `<text>` label fills, the chart `Message`/empty/error boxes, **and** the shared chart-interaction
primitives (tooltip, legend, crosshair, brush) that render inside it.

## The half-mix failure mode — and why the gates don't catch it

A leftover shadcn foreground on a `--surface-*` background is **invisible to the automated gates**:

- `check:tokens` allowlists **both** palettes (both are legitimate semantic tokens), so it cannot tell a
  shadcn `text-muted-foreground` from a mission-control `text-text-secondary`.
- `check:contrast` only computes the fixed mission-control status/text-on-surface pairs — it never sees an
  accidental shadcn foreground.

The half-mix is caught only by an **axe story rendered on the real surface**, or by a human at the
**Chromatic re-baseline**. Two consequences follow:

1. **Every re-skinned surface needs a dark _and_ a light story rendered inside its mission-control
   surface** (e.g. a `bg-surface-panel` decorator), so axe measures the real pairing. A chart's
   mission-control text measured against the shadcn `--background` is the _reverse_ half-mix and will fail
   axe just as surely.
2. **SVG `<text>` and `aria-hidden` overlays are not axe-evaluable.** For those, the proof is a source grep
   for shadcn tokens plus the human Chromatic re-baseline (see the Phase-B / Phase-D disclosures in
   [`console-redesign-progress.md`](./console-redesign-progress.md)).

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
(`src/shared/ui/ComboField.tsx`) belong to the `src/components/ui` shadcn kit, which ADR 0099 keeps **out**
of the console re-skin and consumes as-is. Their `text-muted-foreground` label renders on the AppShell
`--surface-background` **outside** any Panel; it is AA-passing and predates the re-skin. It is intentional,
not a missed half-mix — do not "fix" it into a mission-control token without an ADR that brings the shadcn
kit itself into the console surface.

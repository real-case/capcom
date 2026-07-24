# The mission-control palette: one world (and its residues)

> **Decision of record:** [ADR 0101 — Premium unified front door](../decisions/0101-premium-unified-front-door.md),
> which **closes** the marketing↔console seam first opened by
> [ADR 0099 — Mission-control product console surface](../decisions/0099-mission-control-product-console-surface.md),
> building on [ADR 0081](../decisions/0081-mission-control-design-token-vocabulary.md) (the mission-control
> token layer), [ADR 0092](../decisions/0092-runtime-light-dark-theme-switching.md) (light/dark
> unification), and [ADR 0058](../decisions/0058-token-usage-enforcement-and-codegen.md) (the token-usage
> gate).

CAPCOM renders as a **single mission-control visual world**. The whole product — the marketing landing,
the auth screens, the workspace launcher, and the authenticated console — is built from **one** token
vocabulary: the mission-control `--surface-*` / `--text-*` / `--status-*` / `--viz-*` set (ADR 0081),
flipping light ↔ dark as one unit (ADR 0092). This document is the map of how that world is put together
and, more importantly, of the few **shadcn residues** that remain by design — so a contributor never
re-introduces the half-mix the seam used to invite.

## How the world was unified

The convergence happened in two accepted steps:

- **ADR 0099** moved the authenticated **console** — `src/widgets/app-shell`, the analytics widgets,
  `overview-dashboard`, `src/components/charts` — onto the mission-control surface, and _deliberately_ left
  the marketing landing, the auth screens, and the workspace launcher on the shadcn value layer. That was
  the original "two visual worlds," and this file used to be the map of the seam between them.
- **ADR 0101** then moved the whole **front door** across: the auth screens (Phase 1), the marketing
  landing (Phase 2), and the workspace launcher `src/app/[locale]/(app)/p` + the app top bar
  `src/app/[locale]/(app)/layout.tsx` (Phase 3). With the launcher migrated, **no product surface is built
  from the shadcn value layer anymore** — the seam is closed.

What remains shadcn is not a _surface_ but a small, enumerated set of **residues** (below): the shadcn
component kit consumed as-is, and two app-wide chrome surfaces not in the front-door scope.

## The rule: a surface is skinned in one world, never a half-mix

The mission-control `--surface-*` / `--text-*` set is tuned to clear WCAG 2.2 AA **against itself**, in both
the light and the dark composition. The shadcn `--foreground` / `--muted-foreground` set is tuned against
`--background` / `--card`. Put one palette's foreground on the other's surface and the contrast is no longer
guaranteed — a **half-mix**.

So a component is skinned in **one** world or the other, never a blend. When a surface is mission-control,
**every** descendant chrome color is mission-control too — the container, the headings and captions, the
buttons and focus rings, the chart's SVG `<text>` label fills, the chart `Message`/empty/error boxes, **and**
the shared chart-interaction primitives (tooltip, legend, crosshair, brush) that render inside it.

The one sanctioned exception is a self-contained control whose foreground/background are a **matched pair**,
not a surface half-mix: a shadcn `<Button>` (its `bg-primary` + `text-primary-foreground` clear AA against
each other) may sit on a mission-control surface — which is exactly how the console, the auth forms, the
landing hero CTA, and the launcher's top bar render their primary action (via `buttonVariants`, so the
shadcn fill stays inside the kit).

## The half-mix failure mode — and why the gates don't catch it

A leftover shadcn foreground on a `--surface-*` background is **invisible to the automated gates**:

- `check:tokens` allowlists **both** palettes (both are legitimate semantic tokens), so it cannot tell a
  shadcn `text-muted-foreground` from a mission-control `text-text-secondary`.
- `check:contrast` only computes the fixed mission-control status/text-on-surface pairs — it never sees an
  accidental shadcn foreground.

The half-mix is caught only by an **axe story rendered on the real surface**, or by a human at the
**Chromatic re-baseline**. Two consequences follow:

1. **Every mission-control surface needs a dark _and_ a light story rendered inside its own surface** (e.g.
   a `bg-surface-panel` decorator, or a full-page `bg-surface-background` wrapper), so axe measures the real
   pairing. The ADR-0101 landing and the workspace launcher both ship such a dark + light story; a chart's
   mission-control text measured against the shadcn `--background` is the _reverse_ half-mix and fails axe
   just as surely.
2. **SVG `<text>`, `aria-hidden` overlays, and kit _default variants_ are not axe-evaluable.** For those the
   proof is a source grep for shadcn tokens plus the human Chromatic re-baseline. The ADR-0101 re-skins use a
   negated `git grep` for shadcn value-layer utilities over the re-skinned surfaces
   (`src/widgets/landing`, `src/widgets/workspace-launcher`, and the whole `src/app/[locale]/(app)` route
   group) as the seam proof.

## The specific traps

- **`--text-tertiary` is not AA-safe for small text.** Use `--text-secondary` for any small chrome text;
  reserve `--text-tertiary` for large or decorative marks (e.g. a de-emphasized chart _line_, where the
  small-text contrast rule does not apply).
- **SVG fills are chrome too.** A chart's axis/label/grid-line `fill=var(--color-foreground)` /
  `var(--color-muted-foreground)` / `var(--color-border)` must become `var(--color-text-primary)` /
  `var(--color-text-secondary)` / `var(--color-border-hairline)` when the chart sits on a mission-control
  surface. The `--viz-*` data-series colors are shared and stay.
- **Kit default variants bake shadcn tokens the grep can't see.** `badgeVariants`' `outline` bakes
  `border-border text-foreground`, and `Skeleton` bakes `bg-muted`, straight into the primitive — so a bare
  `<Badge variant="outline">` or `<Skeleton>` on a mission-control surface produces **zero** grep matches and
  usually still clears axe (a placeholder has no text to measure). Whenever a mission-control surface reuses
  such a kit primitive, it must pass **explicit** call-site classes (as `src/widgets/events-explorer`'s
  toolbar chips and the workspace launcher's cards and loading skeleton do).
- **Inherited color is a half-mix vector too.** `src/app/globals.css` sets `body { @apply bg-background
text-foreground }` (shadcn). A re-skinned shell must therefore set **both** `bg-surface-background` **and**
  `text-text-primary` on its own root so nothing inherits the shadcn defaults (as the app top bar and
  `AppShell` do).
- **The shared chart-interaction layer is console-only.** `src/components/charts/{tooltip,legend,crosshair,
brush}` render inside the analytics Panels; they are skinned in mission-control tokens, not shadcn.

## The documented residues

These — and only these — are still shadcn. None is a mission-control _surface_; each is a bounded, reviewed
exception. Do not "fix" any of them into a mission-control token without an ADR that brings it into the
mission-control world.

1. **The `src/components/ui` shadcn kit itself** (Button, Panel, Badge, …). ADR 0099/0101 keep the kit out
   of the re-skin and consume it as-is, themed **through** the surface at each call site (see the
   default-variant trap above). A shadcn `<Button>` is the sanctioned matched-pair control that may sit on a
   mission-control surface.
2. **The shadcn-kit control _labels_.** `ComboField` / `Combobox` (`src/shared/ui/ComboField.tsx`) belong to
   that kit; their `text-muted-foreground` label renders on the AppShell `--surface-background` **outside**
   any Panel. It is AA-passing and predates the re-skin — intentional, not a missed half-mix.
3. **The app-wide error and 404 surfaces** — `src/app/[locale]/error.tsx` and
   `src/app/[locale]/not-found.tsx`. These full-page fallbacks are still built from the shadcn value layer
   (`text-foreground` / `text-muted-foreground` / `bg-primary`). They are **out of the ADR-0101 front-door
   scope** (they are not a marketing or console surface but a global boundary), so they were not re-skinned —
   but because they can render _inside_ the authenticated tree (an errored launcher RPC would surface
   `error.tsx`), they are recorded here rather than silently ignored. Re-skinning them is a natural, small
   follow-up that would make the single-world claim total.

Both palettes flip light ↔ dark (ADR 0092), so "console = dark, marketing = light" was never the
distinction — the distinction is which **token vocabulary** a surface is built from. Today every surface is
built from one, save the residues above.

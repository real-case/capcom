---
status: "accepted"
date: 2026-07-13
decision-makers: Yurii Anichkin
consulted: design-system governance (ADR 0081/0082/0092), CAPCOM product goal
informed: CAPCOM contributors
---

# Mission-control product console: the authenticated app adopts the instrument-panel surface

## Context and Problem Statement

CAPCOM's product goal is a premium, production-grade portfolio demo. Two accepted design
concepts — a **bento Overview dashboard** and an **Events explorer** — pitch the authenticated
product as a dark, aerospace-telemetry *instrument panel* built on the mission-control token
vocabulary (**0081**). The shipped product does not look like that: the app shell
(`src/widgets/app-shell`) and every analytics widget (events-explorer, funnel-builder,
retention-grid, segment-builder, trends) render their chrome on the **neutral shadcn value layer**
(**0033**) — `bg-background` / `bg-card` / `border-border` / `text-muted-foreground` — while the
mission-control `--surface-*` / `--text-*` / `--status-*` vocabulary is used almost only inside
charts and the `status-indicator` primitive. **0092** already named this split ("the app chrome
themes against the shadcn value layer, while the mission-control surfaces theme against the `--c-*`
layer — a split a real theme system must unify") and unified the *theme axis* (one cookie-persisted
light/dark toggle, chrome and charts flip together), but it did **not** move the console chrome onto
the mission-control surface vocabulary; the chrome stayed neutral shadcn.

The question: does the **authenticated product console** — the app shell and the analytics widgets —
adopt the mission-control instrument-panel surface vocabulary as its chrome (so chrome and charts
read as one instrument panel), and if so, within what scope and under which governance so the
existing token, theme, contrast, and boundary gates keep holding?

## Decision Drivers

* **Premium, coherent identity.** The concepts' value is a single instrument-panel surface where
  chrome and data-viz share one vocabulary; a neutral shadcn shell wrapped around mission-control
  charts reads as two half-joined systems.
* **Stay inside the governed token architecture (0081/0082).** No new tokens, no raw values: the
  chrome must consume the existing semantic names (`--surface-*`, `--text-*`, `--status-*`,
  `--border-hairline`, `--viz-*`, the type-scale roles) so `check:tokens` and the `gen:tokens`
  swap-only invariant keep passing.
* **Honor the theme axis (0092), do not regress it.** 0092 shipped a light/dark toggle and a light
  composition of the `--c-*` layer; the console must flip light/dark **as one unit**, not become
  dark-committed. `check:contrast` must stay green in **both** compositions.
* **Respect the palette-pairing constraint.** The mission-control surface/text set pairs only with
  itself for AA; mixing it with shadcn foregrounds breaks contrast (axe catches it). Adoption must
  be a clean surface swap per component, never a half-mix.
* **Reuse density + tenant (0082).** The dense table mode rides the existing `[data-density]` swap;
  tenant re-composition keeps working — no parallel mechanism.
* **Bound the blast radius.** The statically-generated marketing/landing surface (**0031/0096**) and
  the auth screens are a different visual job and are already premium; they should not be dragged
  into the console re-skin.

## Considered Options

* **A — Re-skin the authenticated product console onto the mission-control surface vocabulary**
  (app-shell + analytics widgets + a new curated Overview home), theme-aware via 0092's light
  composition; marketing and auth keep the shadcn value layer.
* **B — Keep neutral shadcn chrome; approximate "premium" with spacing/accents only**, without moving
  to the mission-control surfaces.
* **C — Dark-committed instrument panel for the whole product** (drop the light option inside the
  console).
* **D — Re-skin the entire app including the marketing/landing surface** onto mission-control.

## Decision Outcome

Chosen option: **A — re-skin the authenticated product console onto the mission-control surface
vocabulary**, because it is the only option that delivers the concepts' one-instrument-panel identity
while staying entirely inside the governed token architecture and the 0092 theme axis. The console
chrome consumes the existing semantic tokens (no new names, no raw values, `check:tokens` unchanged),
flips light/dark as one unit with `check:contrast` gating both compositions (**0092/0081**), and rides
the existing density/tenant swaps (**0082**). It **refines 0081** (the mission-control surface
vocabulary now clothes product chrome, not only data-viz), **builds on 0092** (it realizes the
"split a real theme system must unify" that 0092 named — chrome now shares the charts' surfaces), and
leaves the statically-generated marketing surface (**0031/0096**) and auth on the shadcn value layer.
This record does not supersede any ADR; it extends 0081 and completes 0092's unification for the
console chrome.

The decision fixes:

* **Token vocabulary of the console chrome.** Surfaces from `--surface-background|panel|elevated|
  overlay`; text from `--text-primary|secondary|tertiary`; structure from `--border-hairline` /
  `--divider`; state from `--status-{nominal|caution|warning|critical}-{fg|bg|border}`; series from
  `--viz-*`; numeric/tabular values in the geist-mono `mono-data` role (**0081**). No shadcn
  `bg-card` / `bg-background` in the authenticated console; no raw color/size literals (**0058**).
* **Scope.** In: `src/widgets/app-shell`, `events-explorer`, `funnel-builder`, `retention-grid`,
  `segment-builder`, `trends`, plus a new `overview-dashboard` widget. Out: `widgets/landing`, the
  auth screens, and the `src/components/ui` shadcn kit itself — where a shadcn primitive is reused in
  the console it is themed **through** the console surface at the call site, never forked (**0033**).
* **Theme, not dark-lock.** The console is dark-first (its hero composition) but theme-aware: 0092's
  light composition applies and the toggle keeps working; `check:contrast` gates status fg/bg and
  text/surface pairs in both light and dark.
* **A curated Overview home.** The console's Overview is a **first-class, curated** bento of
  project-level KPI cards + signal charts — distinct from the **user-composed** dashboards of
  **0090**. Its KPI aggregations (active users, new sign-ups, conversion, ARPU, goal pacing) are new
  `SECURITY INVOKER` RPCs under **0084** (no aggregation in application code); its charts are visx
  presentational widgets fed reduced rows (**0086/0093**).

### Consequences

* Good — chrome and charts finally read as one instrument panel; the premium portfolio bar is met
  with **zero new tokens** and every design gate intact.
* Good — the already-shipped Events explorer is re-skinned in place: identical behavior (filters,
  selection, saved views, density, group-by from **0097/0098**), new surface.
* Good — theme (0092), density + tenant (0082) all keep working through the same swap mechanism; the
  Overview adds no new aggregation surface (reuses 0084).
* Bad — a broad diff: it touches the className surface of every analytics widget and the shell, with
  real risk of AA regressions (mitigated by `check:contrast` + the axe stories) and Chromatic
  snapshot churn requiring a human-approved re-baseline (**0043/0095**).
* Bad — the repo now has two deliberate visual worlds (marketing shadcn vs console mission-control);
  the seam must be documented so contributors never cross-pair the palettes (the token-palette trap).
* Bad — story matrices and `design-intent.ts` for the re-skinned widgets need refreshing, and each
  widget must keep a dark **and** light story to hold the contrast gate.

### Confirmation

* `check:tokens` (**0058**) over the re-skinned widgets — only allowlisted semantic tokens, no raw
  values, no forked shadcn primitive.
* `check:contrast` (**0081/0092**) green in **both** the light and dark compositions.
* Storybook axe a11y gate (**0039**) over each re-skinned widget, including its dark and light
  stories; `gen:tokens` swap-only self-test unchanged (no new tokens, no per-theme semantic
  overrides).
* Human-approved Chromatic visual re-baseline (**0043/0095**) — the agent never approves its own
  baseline.
* Overview KPI RPCs typed via `gen:types` and reduced in the database (**0084**); FSD boundaries hold
  (a feature never imports a widget; charts live as internal `ui/` segments of the widget) — Steiger
  + dependency-cruiser (**0066/0060**).

## Pros and Cons of the Options

### A — Re-skin the authenticated console onto the mission-control surface

* Good — one coherent instrument-panel identity; chrome + charts unified (closes the split 0092
  named).
* Good — no new tokens; consumes the existing semantic layer, so every token/contrast/swap gate holds
  unchanged.
* Good — bounded to the authenticated console; marketing stays statically generated and premium via
  Motion (**0096**).
* Neutral — dark-first but theme-aware, so it neither abandons light nor forces a single theme.
* Bad — broad className diff and a required human Chromatic re-baseline; contrast risk across many
  widgets.

### B — Keep neutral shadcn chrome, approximate premium with spacing/accents

* Good — minimal diff, no re-baseline.
* Bad — does not deliver the concepts' identity; chrome and charts stay two half-joined systems — the
  exact split 0092 flagged remains.

### C — Dark-committed instrument panel for the whole product

* Good — simplest single composition; matches the concepts' dark screenshots directly.
* Bad — regresses 0092's shipped light/dark toggle inside the console; throws away the light
  composition 0092 already built; a governance step backwards.

### D — Re-skin the entire app including marketing/landing

* Good — one palette everywhere, no seam to document.
* Bad — over-scoped: marketing is a different visual job, statically generated (**0031**) and already
  premium (**0096**); a giant diff for no product-console gain, and it would darken the public
  lead-gen surface against its own design.

## More Information

* Combined build reference (both concepts on the real 0081 tokens):
  `https://claude.ai/code/artifact/4be7123e-90c9-482c-b631-903ca889cf02`.
* Source concepts: "CAPCOM — Premium bento dashboard concept" and "CAPCOM — Events data table
  concept".
* Extends **0081** (mission-control tokens) and completes **0092** (theme-axis unification) for the
  console chrome; reuses **0082** (density/tenant swaps), **0084** (in-DB aggregation), **0086/0093**
  (visx charting + interaction), **0090** (user dashboards, kept distinct from the curated Overview),
  and honors **0058** (token gate) and **0066/0060** (FSD boundaries).
* Implementation is sequenced as a foundation-first PR line (tokens/skin primitives → app-shell →
  events-explorer re-skin → remaining analytics widgets → Overview home), each landing under the gates
  with a human-approved Chromatic re-baseline.

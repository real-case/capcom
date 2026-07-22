---
status: "accepted"
date: 2026-07-22
decision-makers: Yurii Anichkin
consulted: design-system governance (ADR 0081/0092/0099), CAPCOM product goal
informed: CAPCOM contributors
---

# Premium unified front door: the landing, auth, and workspace launcher join the mission-control surface

## Context and Problem Statement

CAPCOM's product goal is a premium, production-grade portfolio demo. ADR 0099 moved the
authenticated *console* (app shell + analytics widgets + overview) onto the mission-control
instrument-panel surface (0081) and deliberately **kept the marketing landing and the auth screens
on the neutral shadcn value layer** — the "two visual worlds" seam mapped in
`docs/capcom/palette-seam.md`. Running the demo end-to-end exposes the cost of that seam at the
front door: the public landing hero, the sign-in form, and the post-login workspace picker (`/p`)
read as plain, low-density shadcn pages, and then the visitor lands in a dense, dark instrument
panel. The transition feels like two products — and the plainest surfaces are the first ones a
portfolio visitor sees. Two further frictions compound it: the demo forces visitors to **type**
seeded credentials to get in (the seeded accounts are already published on the landing), and the
workspace picker is a bare bulleted list of organizations and project links that signals nothing
about what each project contains.

Should the **front door** — the landing, the auth screens, and the workspace launcher — join the
mission-control surface so the demo reads as one cohesive instrument from the first paint, and
should entering the demo become one click?

Scope: `src/widgets/landing`, `src/app/[locale]/(auth)/*` + `src/features/auth-by-email`, and the
workspace home `src/app/[locale]/(app)/p`. Out of scope: the `src/components/ui` shadcn kit itself
(still consumed as-is) and any new design token.

## Decision Drivers

* Visual cohesion front-to-back — the demo should read as one premium product, not a plain
  marketing site bolted to a rich console.
* Zero-friction entry that *showcases* the product's RBAC — a visitor should reach a role in one
  click and immediately see access differ.
* Keep every existing gate green — token-usage (0058), computed contrast (0092), axe a11y (0039),
  FSD boundaries (0065/0066) — and preserve the public landing's static generation + crawlability
  (0002) and its motion discipline (0096).
* Auth safety — a passwordless demo entry must not become an arbitrary-login primitive; the closed
  set of demo identities is the boundary.
* No new token, no new SQL surface — reuse the accepted semantic layer (0081) and the existing
  aggregations (0084).
* Honour the ADR trail — 0099's seam is an accepted decision; narrowing it is itself a recorded
  decision, not a silent drift.

## Considered Options

Front-door visual language:

* **Option 1 — Keep the shadcn seam; polish within the light value layer.**
* **Option 2 — Unify the front door onto the mission-control surface.**
* **Option 3 — Give marketing a third, bespoke art-direction.**

Demo entry:

* **Option A — Keep typed credentials (status quo).**
* **Option B — Pre-fill the credential fields.**
* **Option C — One-click "Sign in as {account}" via a server-only allowlist.**

## Decision Outcome

Chosen: **Option 2 + Option C**, because together they close the "two products" gap the demo goal
cares about while reusing the accepted token and aggregation layers (zero new tokens, zero new SQL)
and keeping the auth boundary closed.

**Surface.** The landing (`src/widgets/landing`), the auth screens, and the workspace launcher adopt
the mission-control surface vocabulary (0081) — `--surface-*` / `--text-*` / `--border-hairline` /
`--status-*` / `--viz-*` / the `mono-data` type role — consuming only the **existing** semantic
tokens (zero new tokens, 0058) and flipping light/dark as one unit (0092). This **narrows the
marketing↔console seam of ADR 0099**: the "two visual worlds" collapse into one mission-control
world spanning the whole app. Adoption is a **clean per-surface swap, never a half-mix** (the
mission-control surface/text set clears AA only against itself), exactly as 0099 required for the
console re-skin; `docs/capcom/palette-seam.md` is rewritten to describe a single world plus the
residual shadcn-kit control-label exception it already documents. The landing stays a Server
Component rendering its copy into the SSR HTML (0002), with motion confined to client islands
(0096); the auth screens stay statically reachable while signed out.

**One-click demo sign-in.** A new Server Action `signInAsDemo(accountKey)` accepts a value from a
**closed enum** of demo-account keys and maps it server-side to the corresponding seeded email plus
the shared demo password held in a **server-only** module (never shipped to the client, mirroring
the ingest-key containment of 0085), then delegates to the existing sign-in path so the same
session and validation flow runs. The client sends only a key from the closed set — the injection
boundary (0089 extended to this input, as 0091 did for AI output) — and **never** a credential; the
action refuses any key outside the set. This **extends ADR 0016** (email/password stays the
baseline; this is an additive demo-only convenience) and is inert for real deployments (only the
seeded identities are reachable). The landing's public `DemoAccess` block and the sign-in screen
render the same closed set as "Sign in as …" actions.

**Workspace launcher.** The workspace home becomes a project launcher: each project card shows a
headline metric + a sparkline + the member's role + recent activity, sourced from the **existing**
`SECURITY INVOKER` aggregations (0084 — e.g. `fn_overview_kpis` / `fn_overview_signal`) under the
caller's RLS. Values are already-reduced rows presented as-is — **no new SQL surface and no
app-side aggregation** (0084) — and tenancy stays a database invariant (0083; the client never
asserts a project id it cannot reach).

### Consequences

* Good, because the demo reads as one premium instrument from first paint; the weakest,
  most-seen surfaces (hero, sign-in, workspace picker) gain the density and craft of the console.
* Good, because entry is one click and *teaches* RBAC — pick a role, watch access change — with no
  credential typing.
* Good, because there are zero new tokens and zero new SQL: the change is token swaps, one Server
  Action, and presentational reuse of accepted aggregations, so the blast radius is bounded and the
  codegen / contrast / self-test gates are unaffected.
* Good, because the ADR trail stays honest — the seam narrowing is recorded, `palette-seam.md` is
  updated in lockstep, and the drift auditor (0054) will not flag it.
* Bad, because the "two deliberate worlds" narrative of 0099 is lost; the visual variety of a
  distinct marketing look is traded for cohesion.
* Bad, because every re-skinned front-door surface now needs a dark **and** a light story on its
  real mission-control surface for axe (the half-mix is invisible to `check:tokens` /
  `check:contrast`), enlarging the story and Chromatic surface.
* Bad, because a public one-click sign-in widens the demo's auth surface; it is safe only because
  the identity set is closed and server-held, which must be reviewed as such (see Confirmation).

### Confirmation

* **Seam swap:** a negated `git grep` for shadcn value-layer tokens
  (`bg-background` / `bg-card` / `text-foreground` / `text-muted-foreground` / `border-border` / …)
  over the three surfaces (excluding the `src/components/ui` kit and stories/tests) — the same
  load-bearing proof the 0099 Phase-E re-skin used, since `check:tokens` allowlists both palettes.
* **Contrast / a11y:** `check:contrast` stays green in both compositions (no new pairs), and each
  re-skinned surface ships a dark **and** a light axe story rendered on its mission-control surface.
* **Auth boundary:** `signInAsDemo` is reviewed by the `security-reviewer` / ADR-0056 pass — the
  enum is closed, the password is `server-only`, no client-supplied credential path exists, and the
  action rejects unknown keys; a unit test asserts an off-list key is refused.
* **No new SQL / RLS:** the launcher adds no migration; the `supabase-rls-reviewer` confirms it
  reads only existing `SECURITY INVOKER` RPCs under the caller's session.
* **Gates:** `gen:tokens` shows zero drift (no token added), the FSD / boundary gates pass, and the
  public landing still statically generates (`next build`).

## Pros and Cons of the Options

### Option 1 — Keep the shadcn seam; polish within the light value layer

* Good, because no ADR change is needed; the 0099 seam and `palette-seam.md` stand as-is.
* Good, because it is the lowest-risk path; marketing keeps a conventional, crawlable, light look.
* Bad, because it cannot close the "two products" gap the demo goal cares about; the front door
  stays visually lighter than the console.
* Bad, because it leaves the plainest, most-seen surfaces as the weakest part of the portfolio
  piece.

### Option 2 — Unify the front door onto the mission-control surface (chosen)

* Good, because it yields one cohesive premium instrument end-to-end — maximal demo impact.
* Good, because it reuses the accepted mission-control vocabulary and its light/dark unification
  (0081/0092) — zero new tokens.
* Neutral, because it requires re-skinning three surfaces and doubling their stories (dark + light),
  but that work is mechanical and precedented by 0099.
* Bad, because it abandons the "two worlds" seam narrative; the marketing surface loses a distinct
  identity.

### Option 3 — A third, bespoke marketing art-direction

* Good, because it gives a distinct, memorable marketing identity independent of the console.
* Bad, because it introduces a **third** token world to govern, contradicting the single-source
  token discipline (0058) and inviting new half-mix classes.
* Bad, because it is the most costly path; it needs its own token layer, contrast tuning, and gates.

### Option A — Keep typed credentials

* Good, because nothing is built; the existing email/password path (0016) is untouched.
* Bad, because it puts friction at the very first interaction and hides the product behind a form
  for no security benefit (the credentials are already public).

### Option B — Pre-fill the credential fields

* Good, because it removes typing while keeping a single familiar form.
* Neutral, because it is still a "form" gesture; the role / RBAC story is not foregrounded.
* Bad, because pre-filling a real password into a client field is a worse look than never shipping
  it, and multi-account switching is clumsy.

### Option C — One-click "Sign in as {account}" via a server-only allowlist (chosen)

* Good, because it removes all typing; the role is the primary affordance, so RBAC is demonstrated
  by the entry gesture itself.
* Good, because the password never reaches the client and the closed enum is the injection boundary
  (the 0089 / 0091 pattern).
* Neutral, because it adds one Server Action and a server-only constant.
* Bad, because a public passwordless entry is a wider auth surface, justified only by the closed,
  server-held identity set (reviewed per Confirmation).

## More Information

* **Refines / narrows:** ADR 0099 (the marketing↔console seam). 0099 stays accepted for the console
  re-skin; this record moves the landing + auth + workspace launcher from the shadcn world into the
  mission-control world, and `docs/capcom/palette-seam.md` is updated to match.
* **Extends:** ADR 0016 (adds a demo-only passwordless path atop the email/password baseline).
* **Reuses:** 0081 (surface vocabulary), 0092 (light/dark unification + `check:contrast`), 0058
  (token codegen / allowlist — zero additions), 0084 (existing aggregations for the launcher), 0083
  (RLS / tenancy invariant), 0002 (landing SSR / static generation), 0096 (landing motion islands),
  0085 (the server-only secret-containment pattern applied to the demo password).
* **Realization:** three PRs into `dev` — (1) one-click demo sign-in + dark auth screens, (2)
  landing dark re-skin, (3) workspace launcher — each gated and human-reviewed / merged (0046).
  Acceptance of this ADR is the human gate that precedes them.
* **Revisit if:** a real (non-seeded) tenant is ever onboarded — the one-click demo entry must then
  be gated out of production, and the marketing surface may again want its own identity.

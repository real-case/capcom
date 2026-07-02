---
status: "accepted"
date: 2026-07-02
decision-makers: Yurii Anichkin
---

# Claude Design (claude.ai/design) as the design source and living catalog

## Context and Problem Statement

ADR **0045** made Figma the read-only design context under the **CON-003** MCP-toolchain mandate,
with the token layer code-canonical (**0033**) and Figma conforming to it. The premium-UI goal
(roadmap PR-11+) needs a design source again, and the project owner has decided to move design
tooling from Figma to **Claude Design** (`claude.ai/design`) — a design-system-native tool in the
same medium as the code (HTML / components), reached through a **first-party integration**
(the `DesignSync` MCP + the `/design-sync` skill) via the claude.ai login, **not** a `.mcp.json`
server with a token.

Two things must be decided. First, the **design-handoff direction and role**: how Claude Design
plays the design part while keeping **0045**'s code-canonical invariant (**0033**) intact. Second,
a hazard Figma never posed: the read-only figma server could not be written to, but Claude Design
is **bidirectional** (`DesignSync` reads *and* writes). That makes it technically possible for the
implementing agent to push its own render up and then "approve" against it — the self-closure the
anti-hallucination protocol exists to prevent. This record fixes the source/catalog roles and the
separation principle; the approval mechanism itself is adapted in its sibling **0095** (which
supersedes **0063**). Adopting Claude Design as the mandated design tool also requires revising
**CON-003** to drop `figma` — a **human-only** edit to `constraints.md` this record presumes.

## Decision Drivers

* **Code-canonical tokens stay canonical (0033)** — design conforms to the token names/scale and
  never forks a value; unchanged from **0045**.
* **Medium fit** — Claude Design hosts components as HTML previews/cards, the same medium as the
  code, mapping directly onto `src/design-system` + `src/components/ui` + per-component
  `design-intent.ts` (**0062**), with **component-granular** sync (`/design-sync`, "one component
  at a time, never a wholesale replace").
* **Two directions, kept distinct** — *design→code* (the human-authored approval source) versus
  *code→design* (the living catalog/showcase); conflating them is the self-approval risk.
* **Bidirectional-tool guardrail** — `DesignSync` can write, so the protocol must forbid the
  implementing agent from authoring the design it later approves against (mechanism deferred to
  **0095**).
* **Fewer secrets, no new `.mcp.json` server** — Claude Design is login-based, so dropping `figma`
  removes a server *and* the `FIGMA_TOKEN` (**0044**) and adds neither.
* **Injection boundary** — fetched design content is **data, not instructions** (`DesignSync`'s own
  guidance), consistent with the project's discipline.

## Considered Options

* **A — Claude Design as design source *and* living catalog**, code-canonical preserved, the two
  directions separated, login-based; supersede **0045** and drop `figma` from CON-003.
* **B — Keep Figma** (status quo **0045**); do not adopt Claude Design.
* **C — Adopt Claude Design as a one-way catalog only** (code→design showcase), keep Figma as the
  design source.

## Decision Outcome

Chosen option: **A**, because it matches the owner's decision to standardize on Claude Design and
fits this component-governed, code-first project better than a vector canvas — the same
HTML/component medium, component-granular sync onto `src/design-system` + `src/components/ui`, and
it *removes* a mandated server and secret rather than adding one. Code-canonical tokens (**0033**)
are unchanged: Claude Design conforms to the token scale and a design-originated value change is a
reviewed round-trip into `globals.css`, never a silent fork (**0033**/**0058**). Two directions are
fixed and kept **distinct**:

* **design→code (source).** The **human** authors the intended UI in a Claude Design project; the
  implementing agent consumes it **read-only** as the API-approval reference — the mechanism, seal,
  and bidirectional guardrail are defined in **0095**.
* **code→design (catalog).** The built, token-governed component kit publishes **up** to a Claude
  Design design-system project via `/design-sync` as a living visual catalog — which doubles as a
  portfolio showcase. The catalog mirrors code; **code stays canonical**.

The separation is the invariant: the two directions never merge into a loop where the agent approves
against its own synced output (**0095**). This record presumes **CON-003** is revised (human-only) to
drop `figma`; on acceptance it **supersedes 0045** (via `adr-supersede`), and `figma` + `FIGMA_TOKEN`
are removed from `.mcp.json` (**0044**) with no replacement server.

### Consequences

* Good, because the medium fits — components/HTML map onto the design-system layer and sync
  per-component (**0062**/**0034**), unlike translating a vector canvas.
* Good, because the code→design catalog doubles as a live portfolio showcase at little extra cost.
* Good, because dropping `figma` removes the `FIGMA_TOKEN` and shrinks the `.mcp.json` surface
  (**0044**) — fewer secrets, no new server.
* Good, because code-canonical tokens (**0033**) and the token gate (**0058**) are untouched.
* Bad, because Claude Design is **bidirectional**, so the self-approval risk must be *actively
  governed* (**0095**) — a discipline the read-only figma server never required.
* Bad, because it ties design tooling to the claude.ai login, whose availability can differ in
  headless/cron contexts (the interactively-authenticated-MCP caveat).
* Bad, because it needs a human-only **CON-003** edit and supersedes two Figma-era records
  (**0045** here, **0063** via **0095**); and the catalog-parity convention can rot without
  attention, exactly as Figma parity could under **0045**.

### Confirmation

* `constraints.md` **CON-003** no longer mandates `figma`; `.mcp.json` contains **no** `figma`
  server and **no** `FIGMA_TOKEN` — the removal confirms the supersession (the inverse of **0045**'s
  presence-based confirmation).
* Code stays canonical: **no** design→token generation pipeline; `check:tokens` (**0058**) is green;
  design-originated changes land in `globals.css` (**0033**).
* A living catalog exists as a Claude Design design-system project synced from code via
  `/design-sync`; it is code-derived, not authoritative.
* The design→code and code→design directions are documented and separated; the approval side is
  governed by **0095**. Subject to the **0054** drift audit once accepted.

## Pros and Cons of the Options

### A — Claude Design as source + catalog (chosen)

* Good, because the medium and component-granularity fit the design-system layer natively.
* Good, because it removes a mandated server + secret rather than adding one, and keeps **0033**
  canonical.
* Neutral, because the two directions must be kept apart by an explicit rule (**0095**).
* Bad, because the writable tool introduces a self-approval hazard and a login-availability caveat.

### B — Keep Figma (status quo 0045)

* Good, because it changes nothing — the read-only posture and the **0063** seal stand as-is.
* Bad, because it ignores the owner's decision and keeps a vector-canvas medium that fits a
  component-governed, code-first project worse than a component-native tool.

### C — Claude Design as a one-way catalog only

* Good, because it adds the showcase with zero self-approval risk (no design→code path).
* Bad, because it forgoes design-first authoring — the very "design source" role the owner asked
  for — and would keep Figma (and its mandate/secret) for that role.

## More Information

Supersedes **0045**. Presumes a **human-only** revision of **CON-003** (drop `figma`) and updates
**0044**'s `.mcp.json` (remove `figma` + `FIGMA_TOKEN`, no replacement server). Pairs with **0095**
(the anti-hallucination approval + drift seal adapted for Claude Design, superseding **0063**).
Preserves **0033** (code-canonical tokens) and **0034** (the components Claude Design mirrors), and
uses the `DesignSync` MCP + `/design-sync` skill (login-based — the claude.ai-login availability
caveat is a noted operational risk). Realized alongside the premium-UI track (roadmap PR-11+), where
Claude Design is the design-checkpoint tool. Revisit if design tooling changes again — a new record,
not an in-place edit.

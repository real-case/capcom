# Stack Constraints Registry

> **This is not an ADR.** It records the project's externally fixed constraints — stack
> choices made *outside* this project's decision process (client-mandated) and therefore
> not open to architectural deliberation here. A decision with no alternatives is not a
> decision, so these get no Pros/Cons record. Instead each constraint receives a stable
> identifier (`CON-00x`) that ADRs and Decision Drivers cite, so "this was given" lives
> in exactly one place rather than being restated per record.
>
> Where a constraint still leaves a **residual choice** — the platform is fixed, but *how*
> we use it — that choice is captured in a normal ADR; the **Residual-choice ADR(s)**
> column links to it. See `0001-record-decisions-as-madr-adrs.md` for the governing ADR
> practice and the ADR-vs-constraint distinction this registry rests on.

## Constraints

| ID | Constraint | Source | Recorded | Residual-choice ADR(s) |
| --- | --- | --- | --- | --- |
| CON-001 | **React** as the UI library | Client mandate — pre-selected before bootstrap | 2026-06-10 | None of its own — subsumed by CON-002's Next.js framework ADR ([0002](0002-nextjs-app-router-server-components.md)) |
| CON-002 | **Next.js (App Router)** as the application framework | Client mandate | 2026-06-10 | [0002](0002-nextjs-app-router-server-components.md) — App Router + Server-Components-default rendering strategy |
| CON-003 | **MCP server toolchain** — `context7`, `figma`, `vercel`, `supabase`, `chromatic`, `github` — as the mandated agent/dev tooling baseline the project must provide and use | Project-owner mandate — fixed, not deliberated | 2026-06-10 | [0044](0044-mcp-server-configuration.md) — project-scoped, committed config with secrets handled by env-reference |

## How to use this registry

- **Citing a constraint in an ADR.** In an ADR's _Context_ or _Decision Drivers_, reference
  the constraint by ID, e.g. "Per **CON-002**, Next.js (App Router) is the mandated
  framework; this ADR decides only the residual rendering strategy." Do not re-argue the
  constraint itself.
- **Keeping back-links current.** When an ADR that resolves a residual choice is created, its
  number is filled into the Residual-choice column above as a markdown link. The link is
  bidirectional: the ADR cites the `CON-00x` ID, this registry cites the ADR number.

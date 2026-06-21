---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Design handoff: code-canonical design tokens, Figma as design context via the figma MCP server

## Context and Problem Statement

The mandated `figma` server (**CON-003**, configured in **0044**) presupposes a design-handoff
process — *how* design intent in Figma reaches the implementation — that the corpus has not
recorded. The pressing question is **source of truth for design values**: the project already
has a canonical design-token layer in code (**0033**, CSS custom properties mapped into the
Tailwind theme), and Figma independently holds the same values (colors, spacing, type scale).
If both are authoritative they will drift. This record settles the direction of truth and the
role of the `figma` server in the handoff; it does not redesign the token layer (**0033**) or
the component layer (**0034**).

## Decision Drivers

* **One source of truth for design values** — no divergence between Figma and the **0033** token
  layer.
* **Code-first project** — the canonical token layer already exists in the repo (**0033**), and
  the project is decisions-/code-first.
* **Use the mandated figma server productively** — agents and developers should pull design
  *context* from Figma during implementation (**CON-003**/**0044**), read-only.
* **Component parity** — Figma components should map traceably to the shadcn components
  (**0034**).
* **Avoid brittle pipelines** — a generated-token sync is maintenance the project should adopt
  only if it clearly pays for itself.

## Considered Options

* **Code-canonical tokens**; Figma mirrors the same scale; the `figma` server is read-only for
  design context
* **Figma-canonical tokens**; a pipeline exports Figma variables (e.g. via Style Dictionary)
  into the **0033** layer, which consumes generated tokens
* **No defined handoff** — ad-hoc specs, manual eyeballing

## Decision Outcome

Chosen option: "code-canonical tokens, Figma as read-only design context", because it keeps the
already-decided **0033** token layer as the single source of truth and avoids a generated-token
pipeline, while still using the mandated `figma` server where it adds the most value. The
**0033** CSS-custom-property layer mapped into Tailwind (**0032**) remains canonical. **Figma is
the design surface and conforms to the same token names and scale**; it does not author the
authoritative values. The **`figma` MCP server is used read-only** (consistent with the
least-privilege posture of **0044**) to pull design *context* — component anatomy, states,
spacing, redlines via Dev Mode — into implementation. The handoff flow: designers express intent
in Figma using the shared token scale; developers and agents consult the `figma` server for
specs while implementing shadcn components (**0034**) against the canonical tokens (**0033**); a
discrepancy is reconciled either by updating Figma to the code scale or by proposing a token
change through the normal process that touches **0033** — never by a silent fork. Figma component
names mirror `src/components/**` for traceability.

### Consequences

* Good, because there is one source of truth — the repo — so there is no generated-token drift,
  and **0033** stays canonical and unchanged.
* Good, because the mandated `figma` server is used productively as read-only design context,
  with no brittle export pipeline to maintain.
* Good, because agents receive structured design context at implementation time, improving
  fidelity without hand-copying redlines.
* Bad, because designers must work within the code-defined token scale — less freedom to drop in
  arbitrary one-off values — which requires design–dev discipline.
* Bad, because a token change that originates in design needs a manual round-trip into the
  **0033** layer rather than syncing automatically.
* Bad, because keeping Figma and code component sets named in parity is an ongoing convention
  that can rot without attention.

### Confirmation

The **0033** layer remains the canonical token definition and **no Figma→token generation
pipeline exists**; the `figma` server is configured read-only (**0044**) and used for design
context; Figma uses the shared token scale; Figma component names mirror `src/components/**`;
and token changes flow through the **0033** layer, not around it.

## Pros and Cons of the Options

### Code-canonical tokens, Figma read-only context (chosen)

* Good, because it preserves the single source of truth (**0033**) with no sync pipeline.
* Good, because the `figma` server is used read-only for context, fitting **0044**'s
  least-privilege posture.
* Neutral, because design-originated token changes are a deliberate, reviewed round-trip.
* Bad, because designers are bound to the code-defined scale and parity is a manual discipline.

### Figma-canonical tokens with an export pipeline

* Good, because designers own values natively and tokens propagate to code automatically.
* Bad, because it overturns **0033**'s canonical status, adds a Figma-variables→Style-Dictionary
  pipeline to build and maintain, and couples builds to an external design tool — heavy
  machinery for a bootstrap, code-first project.

### No defined handoff

* Good, because it requires zero process up front.
* Bad, because design intent reaches code by eyeballing, guaranteeing drift between Figma and
  **0033** and wasting the mandated `figma` server entirely.

## More Information

Resolves the design-handoff process implied by the mandated `figma` server (**CON-003**,
configured in **0044**). Builds on **0033** (the canonical token layer this keeps as source of
truth), **0032** (the Tailwind theme it maps into), **0034** (the components Figma mirrors), and
**0030** (localized/RTL design considerations). It is distinct from visual regression
(**0043**), which verifies the *rendered* result. Revisit if the team adopts a robust
token-sync tool that makes a Figma-canonical model viable without drift — that would be a new
record superseding this direction, not an in-place edit.

---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Zod as the single source of runtime-validated schemas

## Context and Problem Statement

TypeScript's types are erased at runtime (**0003**), so the compiler cannot guarantee that
data crossing a trust boundary — environment variables, form input, request bodies,
third-party API responses — actually has the shape the types claim. The project needs
*runtime* validation at those boundaries, and it needs the validated shape and the
TypeScript type to stay in agreement rather than being defined twice.

The decision is which validation library becomes the project's schema authority, and whether
schemas or types are the source of truth. Defining a Zod schema and a separate TS interface
for the same data invites drift; the chosen approach should make the schema the single
definition from which the type is derived.

## Decision Drivers

* **Runtime validation at boundaries** — env, forms, request bodies, and external data must
  be validated at runtime, where types do not exist.
* **Schema as the single source of truth** — derive the TypeScript type from the schema
  (one definition), not maintain both.
* **Strict-typing synergy** — inferred types must be precise enough to satisfy the strict
  policy (**0003**).
* **Ecosystem fit** — the validator should integrate with the form library (**0020**) and
  be usable for the env module (**0018**).
* **Traceable error messages** — a validation failure must reveal where it came from, so a
  message read in a log, a test failure, or during development points to its origin
  schema/boundary without needing a stack trace.

## Considered Options

* Zod — schema-first, with types inferred via `z.infer`
* Yup — schema validation, weaker TypeScript inference
* Valibot — modular, smaller bundle, newer ecosystem

## Decision Outcome

Chosen option: "Zod", because it is schema-first with excellent TypeScript inference, so a
single Zod schema both validates at runtime and yields the static type via `z.infer` — no
duplicate definitions to drift. Zod is the project's one validation authority: the same
schemas validate environment variables, form input (via the React Hook Form resolver,
**0020**), request bodies, and external data, and types are always inferred from schemas
rather than written separately.

**Zod error messages must carry a human-readable origin marker.** Every schema used at a
boundary tags its validation messages with a stable, human-readable marker identifying where
the error originated — the boundary, and where useful the field — e.g. `[env]`,
`[form:signup]`, `[api:create-order]`. The marker is applied via per-message text or a
schema-level error map, so that reading a raw Zod error (in a log, a test failure, or during
development) makes its source unambiguous without a stack trace. This is a developer-facing
**diagnosability** aid: markers name the validation *origin*, never internal system details,
and user-facing presentation of validation errors still follows the error-handling rules
(**0019**) and form UX (**0020**) — the marker is not a license to surface internals to end
users.

### Consequences

* Good, because one schema produces both the runtime check and the static type, eliminating
  schema/type drift.
* Good, because boundary data is validated where TypeScript cannot reach, closing the
  runtime gap left by erased types (**0003**).
* Good, because Zod integrates cleanly with React Hook Form (**0020**) and a Zod-validated
  env module, keeping one mental model across boundaries.
* Bad, because runtime schemas add some bundle weight and per-call validation cost compared
  to no runtime checks.
* Bad, because complex schemas can produce dense inferred types and verbose error handling
  that need care.
* Good, because origin-marked messages make a validation failure traceable to its source
  schema/boundary at a glance, speeding diagnosis in logs and tests.
* Bad, because the origin-marker convention is authoring discipline applied per schema — an
  unmarked message is possible and only caught in review.

### Confirmation

Boundary code imports Zod schemas and derives types with `z.infer`; no parallel hand-written
interface duplicates a schema. The env module and form validation (**0020**) both build on
Zod schemas. Validation messages carry a human-readable origin marker (boundary, and where
useful the field), set via message text or an error map, so an error reveals its source; the
marker's presence is checked in code review.

## Pros and Cons of the Options

### Zod (chosen)

* Good, because schema-first design with first-class `z.infer` makes the schema the single
  source of truth.
* Good, because it has the broadest ecosystem integration (forms, env helpers).
* Bad, because runtime validation adds bundle and execution cost.

### Yup

* Good, because it is mature and widely used in form contexts.
* Neutral, because it validates at runtime like Zod.
* Bad, because its TypeScript inference is weaker, pushing teams back toward maintaining
  separate types — the drift this decision aims to avoid.

### Valibot

* Good, because its modular design yields smaller bundles than Zod.
* Neutral, because it is schema-first with good inference.
* Bad, because its ecosystem and resolver/integration maturity is narrower and newer than
  Zod's, a risk for a foundational, hard-to-swap dependency.

## More Information

Builds on **0003** (strict typing whose runtime gap this closes). Zod schemas are consumed by
the forms decision (**0020**) and by the environment-variables decision (**0018**); request-body
and external-data validation reuse the same schemas.

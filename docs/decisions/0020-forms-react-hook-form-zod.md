---
status: "accepted"
date: 2026-06-11
decision-makers: Yurii Anichkin
---

# Forms with React Hook Form and the Zod resolver

## Context and Problem Statement

The application will have forms, and forms need three things wired together: local form
state, client-side validation with good UX (per-field errors, submission handling), and
server-side validation that cannot be bypassed. The validation authority is already Zod
(**0017**), and the rendering model is RSC-first with Server Actions available for mutations
(**0002**).

The decision is how to manage form state and connect it to Zod and to the server. The
failure mode to avoid is validating only on the client (trivially bypassable) or duplicating
validation rules in two shapes for client and server. The chosen approach should let one Zod
schema validate on both sides.

## Decision Drivers

* **Reuse the Zod schema** — the same schema (**0017**) should validate client input and the
  server mutation, defined once.
* **Good form UX with little re-rendering** — per-field errors and efficient updates.
* **RSC/Server-Action fit** — must work with the App Router model (**0002**), where
  mutations may run as Server Actions and the server must re-validate.
* **Accessibility** — straightforward wiring of labels, errors, and aria attributes.

## Considered Options

* React Hook Form with the `@hookform/resolvers` Zod resolver
* Formik
* Native Server Actions with manual (no form library) validation

## Decision Outcome

Chosen option: "React Hook Form + Zod resolver", because it pairs efficient, low-re-render
form state with `zodResolver`, so a single Zod schema (**0017**) drives client-side
validation directly — and the same schema re-validates on the server inside the Server Action
or route handler that performs the mutation. The client gets immediate, accessible field
errors; the server never trusts client validation and re-checks with the identical schema, so
validation is defined once and enforced on both sides.

### Consequences

* Good, because one Zod schema validates client and server, with no duplicated rules to
  drift.
* Good, because React Hook Form's uncontrolled-input model minimizes re-renders for
  responsive forms.
* Good, because server-side re-validation with the same schema keeps the security boundary
  honest — client validation is UX, not trust.
* Bad, because React Hook Form's register/control API and the RSC/Client-Component boundary
  (forms are client components) add some conceptual overhead.
* Bad, because wiring the same schema through both a client resolver and a Server Action
  requires a deliberate, consistent pattern to avoid divergence.

### Confirmation

Forms use React Hook Form with `zodResolver(schema)`; the corresponding Server Action or
route handler re-validates with the same schema before mutating. Form components are
`"use client"` leaves under the RSC model (**0002**); validation behavior is covered by
component/e2e tests (**0007**).

## Pros and Cons of the Options

### React Hook Form + Zod resolver (chosen)

* Good, because it reuses the Zod schema on both sides and minimizes re-renders.
* Good, because it integrates with Server Actions for trusted server re-validation.
* Bad, because its API plus the client/server boundary adds some complexity.

### Formik

* Good, because it is a well-known, batteries-included form library.
* Neutral, because it can use a Zod validation adapter.
* Bad, because its controlled-by-default model re-renders more, and its momentum and
  performance trail React Hook Form for the interactive forms targeted here.

### Native Server Actions with manual validation

* Good, because it adds no form-library dependency and leans fully into the RSC model.
* Neutral, because Zod can still validate on the server.
* Bad, because it gives no managed client-side form state or per-field error UX, pushing that
  work into hand-written code on every form — re-implementing what React Hook Form provides.

## More Information

Builds on **0002** (RSC/Server Actions) and **0017** (the Zod schemas reused here). Form
validation is covered by the testing strategy (**0007**); richer field components may later
build on the component-layer decision recorded separately.

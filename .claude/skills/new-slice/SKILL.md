---
name: new-slice
description: >-
  Place and scaffold new application code in the Feature-Sliced Design layers
  (ADR 0065) — pick the right layer (shared / entities / features / widgets) by
  the deterministic decision tree, name the slice, create its segments
  (ui/model/api/lib) behind a public `index.ts`, respect the downward import
  direction and same-layer slice isolation, then pass the Steiger + dependency-cruiser
  boundary gates (ADR 0066/0060). Use when asked to "add a feature", "create an
  entity/widget", "where does this code go", "scaffold a slice", or
  "/new-slice <layer>/<name>". For a reusable shadcn primitive in src/components/ui,
  use `new-component` instead — that kit is outside FSD (ADR 0065).
---

# Scaffold an FSD slice (the right layer, the right segments, behind a public API)

Application code here has a **standard home and an enforced import direction** (ADR 0065),
turned red on violation by Steiger (ADR 0066). This skill picks the layer, names the slice,
scaffolds its segments behind a public `index.ts`, and ends with the boundary gates green.

> Node 24 is required (`engines.node >=24 <25`). If `node -v` is not v24.x, prepend the
> project's Node 24 to `PATH` before any `npm run` below (see `.nvmrc`).

## What FSD governs here — and what it deliberately does NOT (ADR 0065)

FSD is **additive**. Steiger is scoped to exactly four layers under `src/`:
`shared`, `entities`, `features`, `widgets`. Everything else stays where it is and is
**outside** the FSD model (`steiger.config.ts` ignores it):

- `src/app/**` — Next.js App Router; the routing + composition root that plays the FSD
  app/pages role (ADR 0002). It **consumes `widgets`**. There is **no `pages` layer** —
  renaming it would break the linter, so route files live in `src/app` (ADR 0065).
- `src/components/**` — the shadcn primitive kit + colocated stories/specs, governed by
  **dependency-cruiser** (ADR 0034 / 0058–0062, 0064, 0095) on a **disjoint** scope. A reusable
  catalogue component goes here via **`new-component`**, never into an FSD layer.
- `src/design-system`, `src/lib`, `src/i18n` — pre-FSD shared infrastructure. Do **not**
  relocate them into `src/shared`, and do **not** put new FSD code in them.

New, FSD-native application code lands in the four layers. That is the only code this skill
creates.

## 1. Pick the layer — the decision tree (do this first)

Ask in order; the first match wins:

1. **Business-agnostic, no domain knowledge** (a generic button wrapper, a date helper, an
   API client, a config constant)? → **`shared`** — and it is a **segment, not a slice**
   (see §2).
2. **A domain *noun* the product is about** (`user`, `product`, `order`) — owning its data
   shape, its store/queries, its data access, its presentational pieces? → **`entities/<noun>`**.
3. **A user-facing *interaction* / verb** the user *does* (`auth-by-email`, `add-to-cart`,
   `edit-profile`)? → **`features/<verb-noun>`**.
4. **A large, self-contained UI block** that *composes* features + entities into a chunk of
   interface (`Header`, `ProductCardList`, `SignupForm`)? → **`widgets/<block>`**.
5. **A route / page composition** (wires widgets together for a URL)? → **not a slice** —
   it goes in `src/app/[locale]/**` and consumes `widgets`. Stop; this skill does not apply.

If a piece spans two layers, it is two slices: split the noun (entity) from the verb
(feature) from the composition (widget). If genuinely nothing fits, **surface it to the user**
— do not stretch a layer.

## 2. Name the slice and choose segments

- **Slice name** (kebab-case dir):
  - entity = a **noun** (`user`, `product`).
  - feature = a **verb-noun** (`add-to-cart`, `auth-by-email`).
  - widget = a **block noun** (`header`, `signup-form`).
- **`shared` is sliceless** — it holds **segments directly**, grouped by technical purpose,
  never by feature: `shared/ui`, `shared/lib/<topic>`, `shared/api`, `shared/config`.
- **A slice is made of segments** — create only the ones it needs:
  - `ui` — presentational pieces (compose `src/components/ui` primitives; never re-declare a
    primitive here).
  - `model` — store / queries / state (Zustand for ephemeral UI, TanStack Query for server
    state — ADR 0025/0026; never mirror server data into Zustand).
  - `api` — data access (request-scoped `@supabase/ssr` clients live in `src/lib/supabase`;
    the segment wires them to this slice — ADR 0013).
  - `lib` — slice-local helpers.

## 3. The import direction is the law (ADR 0066, `fsd/forbidden-imports`)

Downward only — a layer imports **strictly lower** layers, never up or sideways:

```
app → widgets → features → entities → shared        (shared imports nothing)
```

- **Same-layer slice isolation:** a feature must not import another feature; an entity must
  not import another entity; a widget must not import another widget. **Compose one layer up**
  (features compose in widgets; widgets compose in `src/app`).
- **Entity-to-entity** that is genuinely needed uses the FSD **cross-import** path
  (`@/entities/user/@x/product`), not a normal import — a deliberate, visible exception.
- **Public API only** (`fsd/no-public-api-sidestep` / `fsd/public-api`): consumers import the
  slice's **`index.ts`** barrel — `@/features/add-to-cart`, `@/shared/ui` — **never** a deep
  path like `@/features/add-to-cart/ui/Button`.

## 4. Scaffold

Create the slice directory, its needed segments, and the **public `index.ts`** that is the
only thing other slices may import. Re-export the slice's public surface from `index.ts`;
keep everything else internal.

**Example — a `features/add-to-cart` slice:**
```
src/features/add-to-cart/
  ui/AddToCartButton.tsx     # composes a src/components/ui primitive
  model/use-add-to-cart.ts   # TanStack Query mutation (optimistic, ADR 0025)
  index.ts                   # public API — the ONLY import surface
```
```ts
// src/features/add-to-cart/index.ts — the public API barrel.
export { AddToCartButton } from "./ui/AddToCartButton";
export { useAddToCart } from "./model/use-add-to-cart";
```

**Example — a `shared/ui` segment** (sliceless): drop the file under `src/shared/ui/` and
export it from `src/shared/ui/index.ts`, consumed as `@/shared/ui`.

Use the locale-aware navigation wrappers (`@/i18n/navigation` `Link`/`useRouter`) instead of
`next/link` / `next/navigation` so the locale prefix is preserved (ADR 0030), and route all
user-facing copy through next-intl — add the keys with the **`add-translation`** skill, never
hard-code strings.

## 5. Run the boundary gates — green before done

```bash
npm run check:fsd          # Steiger over src/{shared,entities,features,widgets} (ADR 0066)
npm run check:boundaries   # dependency-cruiser over src/components/** (ADR 0060) — disjoint scope
npx tsc --noEmit           # the @/* alias + strict TS resolve the new barrels (ADR 0003)
npm run test:unit          # any colocated unit test
```

If the slice's `ui` segment **created or changed a `src/components/ui` primitive**, that is a
component-DoR job — run the **`new-component`** ceremony and its `check:design-system` bundle
instead of free-handing it.

### Reading a red gate

- `fsd/forbidden-imports` — an **upward or same-layer** import. Move the consumer up a layer,
  or (entities only) use the `@x` cross-import path.
- `fsd/no-public-api-sidestep` — a **deep import**. Import the slice's `index.ts` instead and,
  if the symbol isn't exposed, add it to the barrel.
- `fsd/public-api` — the slice is **missing `index.ts`**. Add the barrel (§4).
- `fsd/insignificant-slice` — **warning only** (demoted in `steiger.config.ts`): a slice used
  ≤1 time. Expected for a brand-new slice before its second consumer exists; it does not fail
  the build. Surface it but do not merge slices to silence it — that is an architecture-review
  call.

Fix every **error** at its source; never reach around a boundary. A clean `check:fsd` +
`check:boundaries` + `tsc` means the slice is correctly placed and wired.

## 6. What stays human-owned (👤 — surface and stop)

- A piece of code that **fits no layer** (step 1 had no match) — escalate; do not stretch a
  layer or invent a fifth one.
- **Merging** into `dev`/`main` (ADR 0046) and the **visual baseline** if the slice's UI is
  storied (ADR 0043).

End by reporting: the layer chosen and why, the files created, the gate results, and any 👤
escalation the user must take next.

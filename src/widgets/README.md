# `widgets` layer (FSD)

Large, **self-contained UI blocks** that compose features and entities into a
meaningful chunk of an interface — `Header`, `ProductCardList`, `SignupForm`. Each is
a **slice** with segments (`ui`, `model`, `lib`).

- **Composition, not new domain logic.** A widget wires together lower-layer slices;
  it should add layout and orchestration, not business rules.
- **Slice isolation.** Widgets must not import other widgets directly
  (`fsd/forbidden-imports`); compose them in `src/app` route files (the page layer).
- **Public API.** Consume a widget through its `index.ts` — `@/widgets/header`
  (`fsd/no-public-api-sidestep`).

Import rule: **`widgets` → `features` → `entities` → `shared`**. Widgets are consumed
by Next route files in `src/app` (which play the FSD app/pages role, ADR 0065).

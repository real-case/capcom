# `entities` layer (FSD)

Business **entities** the product is about — `user`, `product`, `order`, … Each is a
**slice** (`entities/user/`) made of segments (`ui`, `model`, `api`, `lib`).

- **One concept per slice.** A slice owns its data shape, its store/queries (`model`),
  its data access (`api`), and its presentational pieces (`ui`).
- **Slice isolation.** Slices in this layer must not import each other directly
  (`fsd/forbidden-imports`). A deliberate entity-to-entity reference uses the
  cross-import API (`entities/user/@x/product`), not a normal import.
- **Public API.** Every slice exposes `index.ts`; consumers import `@/entities/user`,
  never `@/entities/user/ui/UserAvatar` (`fsd/no-public-api-sidestep`).

Import rule: **`entities` → `shared`** only.

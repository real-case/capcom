# `features` layer (FSD)

User-facing **interactions** that deliver value — `auth-by-email`, `add-to-cart`,
`edit-profile`, … Each is a **slice** with segments (`ui`, `model`, `api`, `lib`).

- **A verb, not a noun.** A feature is something the user _does_; the nouns it acts on
  live in `entities`.
- **Slice isolation.** Features must not import other features directly
  (`fsd/forbidden-imports`); compose them one layer up, in `widgets`.
- **Public API.** Consume a feature through its `index.ts` — `@/features/add-to-cart`
  (`fsd/no-public-api-sidestep`).

Import rule: **`features` → `entities` → `shared`**.

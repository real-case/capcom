# `shared` layer (FSD)

Reusable, **business-agnostic** code with no knowledge of the domain. The lowest
layer — it may import from **nothing else** in the FSD graph.

- **Segments, not slices.** `shared` is sliceless: it holds segments directly
  (`shared/ui`, `shared/lib`, `shared/api`, `shared/config`, …). Group by technical
  purpose, never by feature (`fsd/segments-by-purpose`).
- **Public API.** Consumers import from a segment's public entry — `@/shared/ui`,
  `@/shared/lib/dates` — never from internals (`fsd/no-public-api-sidestep`).

Note (ADR 0065, additive adoption): the pre-FSD shared infrastructure that already
exists — the shadcn primitive kit (`src/components/ui`, governed by
ADR 0034 / 0058–0064 + dependency-cruiser), and `src/lib` / `src/i18n` — is **not**
moved into this layer. New, FSD-native shared code lands here; the legacy directories
remain in place and are outside the Steiger-governed FSD model (ADR 0066).

Import rule: **`shared` → (nothing)**.

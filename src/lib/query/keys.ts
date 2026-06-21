/**
 * Query-key convention (ADR 0025). Keys are **hierarchical** and built from one
 * factory so invalidation is predictable: invalidating a broad key cascades to
 * everything nested under it. Calling
 * `queryClient.invalidateQueries({ queryKey: queryKeys.notes.all })` clears
 * every notes list *and* detail, because their keys all start with `["notes"]`.
 *
 * Rules:
 *   - **Always build keys here** — never inline array literals at call sites, so
 *     a rename is one edit and a typo can't silently desync the cache.
 *   - Every level is `as const` → readonly tuples, which TanStack compares
 *     structurally for cache matching.
 *
 * Shape to copy per entity:
 *   all        → entity root                     ["notes"]
 *   lists()    → all list-shaped queries         ["notes","list"]
 *   list(f)    → one list with filters           ["notes","list",{...f}]
 *   details()  → all detail-shaped queries       ["notes","detail"]
 *   detail(id) → one entity by id                ["notes","detail",id]
 */

// TODO(you — ADR 0025 decision point): flesh out the `notes` key factory.
// The `all` root is here as the anchor; add `lists()`, `list(filters)`,
// `details()`, and `detail(id)` following the documented shape. Type the
// params to your real query inputs (e.g. a `NoteFilters` type for `list`), and
// keep each return value `as const`. Add sibling entities (e.g. `profile`) the
// same way as the app grows.
export const queryKeys = {
  notes: {
    all: ["notes"] as const,
    // lists: () => [...queryKeys.notes.all, "list"] as const,
    // list: (filters: NoteFilters) => [...queryKeys.notes.lists(), filters] as const,
    // details: () => [...queryKeys.notes.all, "detail"] as const,
    // detail: (id: string) => [...queryKeys.notes.details(), id] as const,
  },
} as const;

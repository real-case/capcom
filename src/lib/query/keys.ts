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
  // The first real entity (PR-4 trends, ADR 0084/0086). Both aggregations are keyed
  // by the exact RPC argument bag, so changing any control (event / window / interval /
  // breakdown) is a distinct cache entry, and a broad `trends.all` invalidate cascades.
  trends: {
    all: ["trends"] as const,
    /** A trends-series query, keyed by its `fn_event_trends` argument bag. */
    series: (args: Record<string, unknown>) =>
      [...queryKeys.trends.all, "series", args] as const,
    /** A top-events query, keyed by its `fn_top_events` argument bag. */
    top: (args: Record<string, unknown>) =>
      [...queryKeys.trends.all, "top", args] as const,
  },
} as const;

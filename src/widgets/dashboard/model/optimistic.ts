/**
 * The marker for a client-side optimistic row (ADR 0025) — a report/dashboard created in
 * the cache before the Server Action resolves, replaced by server truth on `onSettled`
 * invalidate. Kept in the dependency-free `model/` layer so both the mutation hooks (which
 * mint these ids) and the presentational board (which must NOT offer a not-yet-persisted
 * report in the "add to dashboard" picker — its temp id has no `reports` row, so composing
 * it would fail the FK) share one source of truth without the board importing the
 * server-action graph.
 */
export const OPTIMISTIC_ID_PREFIX = "temp-";

/** True for an optimistic (not-yet-persisted) row's id. */
export function isOptimisticId(id: string): boolean {
  return id.startsWith(OPTIMISTIC_ID_PREFIX);
}

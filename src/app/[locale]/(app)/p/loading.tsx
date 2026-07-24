import { Skeleton } from "@/components/ui/skeleton";

/**
 * Navigation skeleton for the workspace launcher. The route now awaits a KPI + signal RPC pair
 * per project, so first paint is later than the old bare list — this Suspense fallback holds the
 * launcher's shape (title, lead, one org heading, a card grid) so the layout doesn't jump.
 *
 * Each `Skeleton` carries an explicit `bg-surface-elevated` because the primitive bakes a
 * shadcn muted-grey fill (the kit default) — a grey shadcn block on the mission-control surface
 * that the token grep cannot see and no story exposes to axe. The whole fallback sits on
 * `bg-surface-background`.
 */
export default function WorkspaceLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl bg-surface-background px-6 py-10">
      <Skeleton className="h-8 w-48 bg-surface-elevated" />
      <Skeleton className="mt-3 h-4 w-72 bg-surface-elevated" />

      <div className="mt-8">
        <Skeleton className="h-5 w-40 bg-surface-elevated" />
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-44 rounded-lg bg-surface-elevated" />
          ))}
        </div>
      </div>
    </div>
  );
}

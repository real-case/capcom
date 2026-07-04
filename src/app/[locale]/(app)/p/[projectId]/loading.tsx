import { Skeleton } from "@/components/ui/skeleton";

/**
 * Navigation skeleton for the project routes (ADR 0034 `skeleton`). Rendered inside the
 * already-mounted shell while a project page resolves, so the sidebar and breadcrumb stay
 * put and only the content area shows placeholders — replacing the bare "Loading…" text.
 * It mirrors the overview hub's shape (title, context line, lead, a six-card grid) so the
 * layout doesn't jump when the real content arrives.
 */
export default function ProjectLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-32" />
      <Skeleton className="mt-8 h-4 w-80" />
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
    </div>
  );
}

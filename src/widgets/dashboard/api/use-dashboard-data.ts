// No "use client" here: this module is imported by the interactive leaf
// (DashboardManager.tsx), which owns the client boundary (ADR 0002).
import { useQuery } from "@tanstack/react-query";

import { fetchDashboards } from "@/entities/dashboard";
import { fetchReports } from "@/entities/report";
import { queryKeys } from "@/lib/query/keys";
import { createClient } from "@/lib/supabase/client";

/**
 * Server-state read hooks for the dashboard surface (ADR 0025/0090). Each wraps an
 * RLS-scoped entity fetcher behind the browser Supabase client (ADR 0013), so a member
 * sees only their project's saved analyses and a non-member sees none (ADR 0083). The
 * mutations in `use-mutations` invalidate these same list keys, so an optimistic write
 * reconciles against server truth on settle.
 */

/** A project's saved reports, newest first. */
export function useReports(projectId: string) {
  return useQuery({
    queryKey: queryKeys.report.list(projectId),
    queryFn: () => fetchReports(createClient(), projectId),
  });
}

/** A project's dashboards (each with its ordered composed reports), newest first. */
export function useDashboards(projectId: string) {
  return useQuery({
    queryKey: queryKeys.dashboard.list(projectId),
    queryFn: () => fetchDashboards(createClient(), projectId),
  });
}

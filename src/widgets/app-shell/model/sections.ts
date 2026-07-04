import type { ComponentType } from "react";
import {
  LayoutDashboard,
  TrendingUp,
  Filter,
  Repeat,
  PieChart,
  LayoutGrid,
  Sparkles,
} from "lucide-react";

/**
 * The analytics-section registry (ADR 0065). One ordered list of the project-scoped
 * surfaces the shell navigates between — the sidebar, the breadcrumb, and the ⌘K
 * palette all derive from it, so a new surface is added in exactly one place. Labels
 * are resolved by the UI from the `AppShell.nav` i18n namespace (ADR 0030), never
 * baked in here; only the routing (`segment`) and the icon live in the model.
 */
export type SectionKey =
  | "overview"
  | "trends"
  | "funnels"
  | "retention"
  | "segments"
  | "dashboards"
  | "ask";

/** A lucide icon, narrowed to the single prop the shell passes it. */
type SectionIcon = ComponentType<{ className?: string }>;

/**
 * Ordered sections. `segment` is the path tail under `/p/{projectId}` — the empty
 * string is the project overview (the segment-less route).
 */
export const SECTIONS: {
  key: SectionKey;
  segment: string;
  Icon: SectionIcon;
}[] = [
  { key: "overview", segment: "", Icon: LayoutDashboard },
  { key: "trends", segment: "trends", Icon: TrendingUp },
  { key: "funnels", segment: "funnels", Icon: Filter },
  { key: "retention", segment: "retention", Icon: Repeat },
  { key: "segments", segment: "segments", Icon: PieChart },
  { key: "dashboards", segment: "dashboards", Icon: LayoutGrid },
  { key: "ask", segment: "ask", Icon: Sparkles },
];

/**
 * The locale-agnostic href for a section within a project — consumed by the i18n
 * `Link`/`useRouter` (ADR 0030), which add the locale prefix. Overview is the
 * segment-less route.
 */
export function sectionHref(projectId: string, segment: string): string {
  return segment ? `/p/${projectId}/${segment}` : `/p/${projectId}`;
}

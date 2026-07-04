import { useTranslations } from "next-intl";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Link } from "@/i18n/navigation";

import { SECTIONS, sectionHref, type SectionKey } from "../model/sections";

/**
 * The project overview hub (ADR 0065 widget). Replaces the PR-2 dashed-border
 * placeholder with a designed grid of the analytics surfaces — one card per section
 * (overview excluded, since it is the current page), derived from the same registry
 * as the sidebar so the two never drift. Presentational: it takes only the project
 * id and resolves labels/descriptions from i18n (ADR 0030), colors from semantic
 * tokens (ADR 0058). Whole-card links keep the hit target large and keyboard-focusable.
 */
export function ProjectHub({ projectId }: { projectId: string }) {
  const tNav = useTranslations("AppShell.nav");
  const t = useTranslations("ProjectOverview");

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {SECTIONS.filter(
        (
          s,
        ): s is (typeof SECTIONS)[number] & {
          key: Exclude<SectionKey, "overview">;
        } => s.key !== "overview",
      ).map(({ key, segment, Icon }) => (
        <li key={key}>
          <Link
            href={sectionHref(projectId, segment)}
            className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Card className="h-full transition-colors group-hover:bg-accent/30">
              <CardHeader>
                <div className="mb-1 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                  <Icon className="size-5" />
                </div>
                <CardTitle>{tNav(key)}</CardTitle>
                <CardDescription>
                  {t(`surfaces.${key}.description`)}
                </CardDescription>
              </CardHeader>
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}

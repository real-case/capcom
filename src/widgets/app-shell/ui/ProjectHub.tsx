import { useTranslations } from "next-intl";

import { Panel } from "@/components/ui/panel";
import { Link } from "@/i18n/navigation";

import { SECTIONS, sectionHref, type SectionKey } from "../model/sections";

/**
 * The project overview hub (ADR 0065 widget). Replaces the PR-2 dashed-border placeholder
 * with a designed grid of the analytics surfaces — one Panel per section (overview excluded,
 * since it is the current page), derived from the same registry as the sidebar so the two
 * never drift. Re-skinned onto the mission-control surface (ADR 0099): the shadcn `Card`
 * becomes the `Panel` primitive, colors are the `--surface-*` / `--text-*` tokens (ADR 0081),
 * never the shadcn value layer. Presentational: it takes only the project id and resolves
 * labels/descriptions from i18n (ADR 0030). Whole-card links keep the hit target large and
 * keyboard-focusable.
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
            className="group focus-visible:ring-text-primary block h-full rounded-lg focus-visible:outline-none focus-visible:ring-2"
          >
            <Panel className="group-hover:bg-surface-elevated h-full transition-colors">
              <div className="bg-surface-overlay text-text-primary mb-3 flex size-9 items-center justify-center rounded-lg">
                <Icon className="size-5" />
              </div>
              <h3 className="text-text-primary font-medium">{tNav(key)}</h3>
              <p className="text-text-secondary mt-1 text-sm">
                {t(`surfaces.${key}.description`)}
              </p>
            </Panel>
          </Link>
        </li>
      ))}
    </ul>
  );
}

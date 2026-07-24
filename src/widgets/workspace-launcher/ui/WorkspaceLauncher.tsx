import type { LauncherCopy, LauncherOrg } from "../model/launcher";

import { ProjectCard } from "./ProjectCard";

/**
 * The workspace launcher (ADR 0101 Phase 3) — the authenticated home, re-skinned from a bare
 * org→project list onto the mission-control surface as a grid of project launcher cards. It is
 * PURELY PRESENTATIONAL: it takes already-fetched, already-localized view-models as props and
 * owns no fetching, aggregation, or translation, so it renders identically in the RSC route and
 * in Storybook/jsdom (the axe half-mix proof). Tenancy stays a database invariant — the route
 * only ever hands it projects RLS returned (ADR 0083).
 *
 * States: a member of nothing sees the empty state; an org with no reachable projects shows its
 * no-projects line; every other org renders its project cards. Mission-control tokens only
 * (ADR 0058/0081); the whole page sits on `bg-surface-background` so nothing inherits the
 * shadcn body defaults.
 */
export type WorkspaceLauncherProps = {
  orgs: LauncherOrg[];
  copy: LauncherCopy;
  /** BCP-47 tag for Intl number formatting (presentation only). */
  locale: string;
};

export function WorkspaceLauncher({
  orgs,
  copy,
  locale,
}: WorkspaceLauncherProps) {
  if (orgs.length === 0) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-2 bg-surface-background px-6 py-24 text-center">
        <h1 className="text-xl font-semibold tracking-tight text-text-primary">
          {copy.empty.title}
        </h1>
        <p className="text-text-secondary">{copy.empty.body}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl bg-surface-background px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary">
        {copy.title}
      </h1>
      <p className="mt-1 text-text-secondary">{copy.lead}</p>

      <div className="mt-8 flex flex-col gap-10">
        {orgs.map((org) => {
          const headingId = `launcher-org-${org.id}`;
          return (
            <section key={org.id} aria-labelledby={headingId}>
              <h2
                id={headingId}
                className="font-medium tracking-tight text-text-primary"
              >
                {org.name}
              </h2>
              {org.projects.length === 0 ? (
                <p className="mt-3 text-sm text-text-secondary">
                  {copy.noProjects}
                </p>
              ) : (
                <ul className="mt-4 grid list-none grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {org.projects.map((project) => (
                    <li key={project.id}>
                      <ProjectCard
                        project={project}
                        roleLabel={org.roleLabel}
                        copy={copy}
                        locale={locale}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

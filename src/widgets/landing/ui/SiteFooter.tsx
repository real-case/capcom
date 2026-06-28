import {
  LICENSE_URL,
  METHODOLOGY_URL,
  REPO_URL,
  ROADMAP_URL,
  STARTER_URL,
  type LandingCopy,
} from "../model/content";

/**
 * Landing footer (presentational) — outbound links to the source repository (the
 * artifact this demo is about) and the built-on-starter attribution. External links open
 * in a new tab with `rel="noreferrer"`. Token-only colors (ADR 0058).
 */
export function SiteFooter({ copy }: { copy: LandingCopy["footer"] }) {
  const links = [
    { href: REPO_URL, label: copy.repo },
    { href: ROADMAP_URL, label: copy.roadmap },
    { href: METHODOLOGY_URL, label: copy.methodology },
    { href: LICENSE_URL, label: copy.license },
  ];

  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 py-10 text-center">
        <p className="max-w-xl text-sm leading-6 text-muted-foreground text-pretty">
          {copy.tagline}
        </p>
        <nav
          aria-label={copy.navLabel}
          className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
            >
              {link.label}
            </a>
          ))}
        </nav>
        <a
          href={STARTER_URL}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-muted-foreground underline-offset-4 hover:underline"
        >
          {copy.builtOn}
        </a>
      </div>
    </footer>
  );
}

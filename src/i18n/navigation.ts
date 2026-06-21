import { createNavigation } from "next-intl/navigation";

import { routing } from "./routing";

/**
 * Locale-aware wrappers around Next.js navigation (ADR 0030). Components use
 * these instead of `next/link` / `next/navigation` so links and redirects keep
 * the active locale prefix; `getPathname` also powers the canonical/`hreflang`
 * alternates and the sitemap (ADR 0031) without hand-built URL strings.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);

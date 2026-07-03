/**
 * Theme axis (ADR 0092). Light/dark is the third primitive-swap axis beside tenant and
 * density (ADR 0082): the choice is persisted in a cookie and applied as a class on `<html>`.
 * `[data-theme="light"]` swaps the `--c-*` color primitives (globals.css); the `.dark` class
 * drives the shadcn value layer (ADR 0033).
 *
 * To keep the public routes statically generated, the root layout reads **no** cookie on the
 * server — it renders a static dark-first default and inlines the pre-paint script below,
 * which resolves the actual theme before first paint. No client theme-provider, no hydration
 * flash, SSG preserved.
 */
export const THEME_COOKIE = "theme";

export type Theme = "light" | "dark";

/**
 * Pre-paint resolver, inlined in the document `<body>` before it paints (root layout). It
 * reads the persisted `theme` cookie, falling back to the OS `prefers-color-scheme` on a
 * first visit, and flips `.dark` + `[data-theme]` on `<html>` before first paint — so the
 * static dark default is corrected with no flash (ADR 0092).
 */
export const THEME_INIT_SCRIPT = `(function(){try{var m=document.cookie.match(/(?:^|;\\s*)${THEME_COOKIE}=(light|dark)/);var t=m?m[1]:(matchMedia("(prefers-color-scheme: light)").matches?"light":"dark");var e=document.documentElement;if(t==="light"){e.classList.remove("dark");e.setAttribute("data-theme","light");}else{e.classList.add("dark");e.setAttribute("data-theme","dark");}}catch(_){}})();`;

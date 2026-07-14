import * as React from "react";
import isChromatic from "chromatic/isChromatic";
import { MotionConfig } from "motion/react";
import type { Decorator, Preview } from "@storybook/nextjs-vite";

// ADR 0032/0033: stories render against the real Tailwind build and the semantic
// design tokens, so the workbench is faithful to production — including theming.
import "../src/app/globals.css";

/**
 * Drives BOTH theme axes from the toolbar, mirroring the production pre-paint resolver
 * (src/features/theme/model/theme.ts): the `.dark` root class for the shadcn value layer
 * (`@custom-variant dark`, ADR 0033) AND the `[data-theme]` attribute for the mission-control
 * `--c-*` layer (which is dark-first in `:root` and flips to light via `[data-theme="light"]`,
 * ADR 0081/0092). Before this, the toolbar only toggled `.dark`, so mission-control surfaces
 * never flipped in the workbench — the app-shell console chrome (ADR 0099) now does. Applied
 * via an effect with cleanup so no theme state bleeds across stories in the browser-mode test
 * run (ADR 0037).
 */
function ThemeFrame({
  theme,
  children,
}: {
  theme: string;
  children: React.ReactNode;
}) {
  React.useEffect(() => {
    const root = document.documentElement;
    const dark = theme === "dark";
    root.classList.toggle("dark", dark);
    root.setAttribute("data-theme", dark ? "dark" : "light");
    return () => {
      root.classList.remove("dark");
      root.removeAttribute("data-theme");
    };
  }, [theme]);

  return <div className="bg-background text-foreground p-6">{children}</div>;
}

const withTheme: Decorator = (Story, context) => (
  <ThemeFrame theme={String(context.globals.theme ?? "light")}>
    <Story />
  </ThemeFrame>
);

/**
 * Determinism discipline for visual regression (ADR 0043). A Chromatic diff is
 * only trustworthy if a story renders identically every run, so the axes that
 * cause false positives are frozen — but **only in the Chromatic environment**
 * (`isChromatic()`), so the live workbench keeps its animations and the
 * browser-mode test run (ADR 0037) and DOM snapshot (ADR 0040) are untouched
 * (the `<style>` simply isn't rendered there).
 *
 *   - **Animations / transitions** are disabled, so a snapshot never races a
 *     mid-flight transition — the most common source of visual flake.
 *   - **Caret** is hidden, so a focused input (the `play` functions, ADR 0038)
 *     doesn't snapshot a blinking cursor.
 *   - **Time and randomness** must be frozen *per story* — a story that renders
 *     `new Date()` / `Math.random()` pins a fixed value via args or a decorator.
 *     No current story does; this is the standing rule for ones that will.
 *   - **Dynamic data** is mocked in the story, never fetched at render.
 */
const freezeForSnapshot: Decorator = (Story) => (
  <>
    {isChromatic() && (
      <style>{`
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          caret-color: transparent !important;
        }
      `}</style>
    )}
    <Story />
  </>
);

/**
 * Determinism for **JS motion** (ADR 0096). `freezeForSnapshot` only tames CSS
 * animations/transitions; Motion (`motion/react`) animates via WAAPI/rAF, so it needs its
 * own freeze. Forcing `reducedMotion: "always"` across Storybook makes every Motion
 * primitive take its static / final-state branch (`useReducedMotion()` → true), so **all**
 * content is rendered in place — the axe run (ADR 0039) checks the whole page (no
 * `whileInView` section left at `opacity: 0` and skipped), and Chromatic (ADR 0043) has no
 * mid-flight animation or IntersectionObserver timing to race. The live motion is reviewed
 * in the running app (`npm run dev`), not the workbench — the same trade the CSS freeze
 * makes for snapshots.
 */
const staticMotion: Decorator = (Story) => (
  <MotionConfig reducedMotion="always">
    <Story />
  </MotionConfig>
);

const preview: Preview = {
  parameters: {
    a11y: {
      // ADR 0039: fail the browser-mode run on any axe violation (not advisory).
      test: "error",
      // Pin the conformance target to WCAG 2.2 AA (ADR 0039); contrast outcomes
      // lean on the AA-defined tokens (ADR 0033).
      options: {
        runOnly: {
          type: "tag",
          values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"],
        },
      },
    },
    controls: {
      matchers: { color: /(background|color)$/i, date: /Date$/i },
    },
  },
  // A toolbar control to flip the workbench theme; per-story `globals: { theme:
  // "dark" }` forces the dark axis in the automated run so a11y checks it too
  // (ADR 0042 theme axis).
  globalTypes: {
    theme: {
      description: "Semantic-token theme (ADR 0033)",
      defaultValue: "light",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light", icon: "sun" },
          { value: "dark", title: "Dark", icon: "moon" },
        ],
        dynamicTitle: true,
      },
    },
  },
  decorators: [staticMotion, freezeForSnapshot, withTheme],
};

export default preview;

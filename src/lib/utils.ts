import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

import { SEMANTIC_OTHER_TOKENS } from "@/design-system/tokens.generated";

// The mission-control type-scale roles (ADR 0081) are custom `@theme` font sizes
// (`text-metric-hero`, `text-mono-data`, `text-label`, …). tailwind-merge's default
// config doesn't know them, so it misclassifies e.g. `text-mono-data` as a text-COLOR and
// collapses it against a real `text-*` color utility — silently dropping the size. Register
// the generated font-size role names (the single source, ADR 0058 — derived, never
// re-listed) with the `font-size` class group so a size and a color coexist under twMerge.
const fontSizeRoles = SEMANTIC_OTHER_TOKENS.filter(
  (token) => token.startsWith("--text-") && !token.endsWith("--line-height"),
).map((token) => token.slice("--text-".length));

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: fontSizeRoles }] } },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

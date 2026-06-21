#!/usr/bin/env node
// ADR 0042 — component story coverage, existence half.
//
// Every exported, reusable UI component module under src/components/** must ship a
// colocated CSF 3 stories file (`<name>.stories.tsx`). This is the part that is
// *mechanically* checkable; the COMPLETENESS of states (the meaningful-states
// checklist: variants, interactive, data-edge, theme/locale) is a PR-review judgment
// a linter cannot make (ADR 0042), enforced via the pull-request template.
//
// Page-level one-off compositions are out of scope — they live in src/app/** and are
// covered end-to-end (ADR 0007), not in the component catalogue.
import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = "src/components";

/** Recursively collect component module files (.tsx, excluding tests and stories). */
function collectComponents(dir) {
  const found = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      found.push(...collectComponents(full));
    } else if (
      entry.endsWith(".tsx") &&
      !entry.endsWith(".test.tsx") &&
      !entry.endsWith(".stories.tsx")
    ) {
      found.push(full);
    }
  }
  return found;
}

function hasColocatedStory(componentFile) {
  const storyFile = componentFile.replace(/\.tsx$/, ".stories.tsx");
  try {
    return statSync(storyFile).isFile();
  } catch {
    return false;
  }
}

const components = collectComponents(ROOT);
const missing = components.filter((file) => !hasColocatedStory(file));

if (missing.length > 0) {
  console.error(
    `ADR 0042: ${missing.length} component module(s) under ${ROOT} have no colocated ` +
      `*.stories.tsx:\n` +
      missing.map((file) => `  - ${relative(".", file)}`).join("\n") +
      `\n\nAdd <name>.stories.tsx beside each file above, covering the component's ` +
      `meaningful states\n(default, variants/sizes, interactive, data-edge, ` +
      `theme/locale where they differ).`,
  );
  process.exit(1);
}

console.log(
  `ADR 0042 OK — ${components.length} component module(s) under ${ROOT}, ` +
    `each has a colocated *.stories.tsx.`,
);

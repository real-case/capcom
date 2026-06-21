#!/usr/bin/env node
// scripts/state-coverage.mjs
//
// ADR 0061/0062 — archetype state-coverage helper (problem P8: incomplete state
// coverage — empty/overflow/loading silently skipped). STAGE-2 advisory tool: it
// runs in the agent's loop and prints the *mandatory* state set for a component's
// archetype, so coverage is built BY SUBTRACTION (classify → take the set → mark each
// applicable true/false in design-intent.ts; a `false` requires a rationale, ADR
// 0062). The agent does not own the canonical list, so it cannot silently drop a
// state. The blocking guarantee (the rejection of a rationale-less `false`) is Stage 3
// once design-intent.ts exists; this is the recall-side helper.
//
// Reads the ratified registry directly (src/design-system/states.ts) via Node 24
// type-stripping — that file IS the machine-readable source of truth (ADR 0061), so
// there is no second copy to drift.
//
// Usage:
//   npm run ds:states                 # list every archetype + its mandatory axis summary
//   npm run ds:states -- container    # full checklist for one archetype
//   npm run ds:states -- --id card    # resolve the archetype from the composition graph

import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const states = await import(
  pathToFileURL(join(repoRoot, "src/design-system/states.ts")).href
);
const { STATE_AXES, ARCHETYPE_STATES } = states;
const GRAPH = join(repoRoot, "src/design-system/composition-graph.json");

const archetypes = Object.keys(ARCHETYPE_STATES);

function printChecklist(archetype) {
  const spec = ARCHETYPE_STATES[archetype];
  if (!spec) {
    console.error(
      `unknown archetype "${archetype}". Known: ${archetypes.join(", ")}`,
    );
    process.exit(2);
  }
  console.log(
    `\nstate coverage for archetype "${archetype}" (ADR 0061 / states.ts):\n`,
  );

  console.log(`  mandatory axes:`);
  for (const axis of spec.mandatoryAxes) {
    console.log(`    ${axis}: ${STATE_AXES[axis].join(", ")}`);
  }
  if (spec.conditionalAxes?.length) {
    console.log(`\n  conditional axes (cover only when the condition holds):`);
    for (const { axis, when } of spec.conditionalAxes) {
      console.log(
        `    ${axis} — when: ${when}  [${STATE_AXES[axis].join(", ")}]`,
      );
    }
  }
  console.log(
    `\n  archetype-specific states: ${
      spec.extraStates?.length ? spec.extraStates.join(", ") : "(none)"
    }`,
  );
  if (spec.notes) console.log(`\n  note: ${spec.notes}`);

  console.log(
    `\nBuild coverage by SUBTRACTION (ADR 0062): in design-intent.ts mark each state` +
      `\napplicable true/false — a \`false\` REQUIRES a rationale. Each applicable state` +
      `\nneeds a story case (ADR 0036/0042) run through axe + Chromatic (ADR 0039/0043).` +
      `\nSimultaneity (disabled+loading, …) resolves via state-precedence.ts, not here.`,
  );
}

const argv = process.argv.slice(2);

if (argv[0] === "--id") {
  const id = argv[1];
  const graph = JSON.parse(readFileSync(GRAPH, "utf8"));
  const node = graph.nodes.find((n) => n.id === id);
  if (!node) {
    console.error(`no node "${id}" in composition-graph.json`);
    process.exit(2);
  }
  if (node.archetype === null) {
    console.log(
      `node "${id}" has archetype: null — out of archetype scope (e.g. a presentational` +
        `\nlabel, ADR 0042). No mandatory state set. A component fitting NO archetype is a` +
        `\n👤 human escalation (a new archetype is a design-system decision, ADR 0061), never` +
        `\nan agent default.`,
    );
    process.exit(0);
  }
  printChecklist(node.archetype);
  process.exit(0);
}

if (argv[0]) {
  printChecklist(argv[0]);
  process.exit(0);
}

// No arg → inventory of every archetype.
console.log(
  `archetype → mandatory state coverage (ADR 0061), from states.ts:\n`,
);
for (const a of archetypes) {
  const spec = ARCHETYPE_STATES[a];
  const cond = spec.conditionalAxes?.map((c) => `${c.axis}?`) ?? [];
  const extra = spec.extraStates?.length
    ? ` +{${spec.extraStates.join(",")}}`
    : "";
  console.log(
    `  ${a.padEnd(22)} ${[...spec.mandatoryAxes, ...cond].join(", ")}${extra}`,
  );
}
console.log(
  `\n  (axis? = conditional). Full checklist: npm run ds:states -- <archetype>`,
);
